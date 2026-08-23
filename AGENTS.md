# AGENTS.md

This file provides guidance to coding agents (Claude Code, etc.) when working with code in this repository.

`no-orm` is a CLI that reads a live PostgreSQL database and generates type-safe Slonik + Zod
data access code — an alternative to an ORM. The generated code is the product; this repo is the
generator. Published to npm as `no-orm-cli`, binary name `no-orm`.

## Commands

```bash
npm run dev -- generate --config-path <path>  # Run the CLI from source (tsx, no build step)
npm run dev -- init                           # Interactive config scaffolding
npm run build                                 # Bundle to dist/ with tsup (ESM only, node23 target)
npm run test                                  # vitest (watch mode)
npx vitest run                                # vitest, single pass
npm run test -- tests/index.test.ts -t 'Test foreign key references'  # One test case
npx tsc --noEmit                              # Typecheck (includes the drift-catcher assertions)
npx eslint .                                  # Lint — there is no npm script for this
```

**Tests require Docker.** They spin up a real `postgres:17` container via testcontainers.

## Architecture

The whole tool is one pipeline, driven by `src/commands/generate.ts`:

1. Import the user's `no-orm.config.ts` as an ES module, validate it with `noOrmConfigSchema` (Zod).
2. `extract-pg-schema` connects to Postgres and returns `Record<string, Schema>` — the entire
   introspection layer. Every downstream type (`TableColumn`, `TableDetails`, `TableIndex`,
   `EnumDetails`, `DomainDetails`, `RangeDetails`) comes from that package.
3. `config/parser.ts` cross-references the user config against the real schema, dropping and warning
   about anything that doesn't exist, and flattens it into `ParsedConfig` (Maps and Sets rather than
   the user-facing Records).
4. Parsers walk the schema tree and write files; builders produce the strings.
5. Everything is written to a randomly-named temp directory (`.no-orm-build-<jitter>`), then the
   real output directory is removed and the temp renamed over it. A failure anywhere deletes the
   temp and exits 1, leaving the previous output untouched. `tests/atomicity` guards this.

### The parsers / builders split

This is the core convention and it is worth preserving:

- **`src/builders/*`** are pure. They take schema metadata and return strings (or a
  `Files = Record<string, string>` map of filename → contents). They do no I/O.
- **`src/parsers/*`** do the I/O. They `mkdir`, call builders, run the formatter, and `writeFile`.
  They nest: `postgres.parser` → static runtime helpers; `schema.parser` → enums/domains/ranges/index
  per schema, then loops tables into `table.parser` → `table.builder`.

All generated code is run through Prettier (`buildFormatter` in `generate.ts`) before writing, so
builders don't need to produce pretty output — but they do need to produce *parseable* TypeScript,
or Prettier throws and the whole run fails.

### `src/builders/mappers.ts` is the type system

Every Postgres → TypeScript/Zod decision lives here. Adding support for a new Postgres type usually
means touching four functions in lockstep:

- `mapPostgresTypeToZodSchema` — the Zod schema in the generated `row` object
- `mapPostgresTypeToTypescriptType` — the TS type in `Create` / `Update` shapes
- `columnToSlonikPrimitiveValue` — how a JS value is serialised into a Slonik `UNNEST` tuple
- `pgTypeToUnnestType` — the Postgres type name in the `UNNEST` cast

Miss one and you get a runtime failure inside generated queries rather than a generation error.
Unknown types don't throw — they log a warning and fall back to `z.any()` / `any`.

Non-base column kinds (`enum`, `domain`, `range`) are dispatched via the type guards in
`column-types.ts` and handled by their own builders, which emit branded Zod schemas
(`.brand<"public.domains.email">()`). Primary keys and foreign key columns are also branded
(`.brand<"public.penguins.id">()`), which is what makes IDs non-interchangeable across tables.

### Generated output layout

```
<output_directory>/
  postgres/        # Static: Json/Interval/Range zod schemas, types, serializers
  slonik/          # Static: required Slonik typeParsers (timestamptz→Date, interval, etc.)
  <schema>/        # One per non-ignored Postgres schema, e.g. public/
    enums/ domains/ ranges/    # schemas.ts + types.ts + index.ts
    tables/<table>.ts          # row, Row, Id, create/createMany, get/getMany/getManyMap,
                               # find/findMany, update/updateMany, delete/deleteMany,
                               # plus getBy*/getManyBy* per index
```

`table.builder.ts` is the largest file — a sequence of small `build*` functions concatenated into
one file. Each generated function is a template string; read a matching `tests/*/expected/` file
alongside the builder when changing it.

### Tables and indexes that get skipped

`schema.parser.ts` and `table.builder.ts` silently skip (with a warning) things they can't model.
Know these before debugging "why wasn't this generated":

- Tables with no primary key
- Tables with a composite-type column
- Primary key indexes (already covered by the standard CRUD)
- Functional indexes (`LOWER(col)`) and partial indexes (`WHERE ...`)
- Anything marked `ignore: true` in the config

`schema.parser.ts` also throws on a column literally named `please_oh_god_throw_an_error` — that is
deliberate, it exists so the atomicity test has a way to make a run fail.

## Config

The user-facing config is `no-orm.config.ts`, a default-exported `NoOrmConfig`. Config keys are
`snake_case` throughout (both the user config and the internal parsed form) — this is intentional,
it mirrors Postgres identifiers.

**`src/config/index.ts` and `src/config/schema.ts` each define things twice**: a hand-written TS
type (which carries the doc comments users see in their editor) and a matching Zod schema (which
does the runtime validation). `src/config/drift-catcher.ts` asserts at compile time that the
top-level `NoOrmConfig` and `noOrmConfigSchema` agree. Its `TypeEqualityGuard` only distributes over
unions, so it does **not** catch divergence in nested objects — when you add a field to any config
type, add it to the corresponding Zod schema by hand, or Zod will silently strip it at parse time.

`Ignorable<T>` (`config/ignorable.ts`) is the shared shape for schema/table config: either
`{ ignore: true }` or the real config. Parsers narrow it with the `NonIgnoredConfig` `Extract<>`
aliases exported from each parser.

Note that `readonly` and `ignore` on a column throw `InvalidIgnoredColumn` unless the column is
nullable or has a default — otherwise the generated `create` could never satisfy the table.

## Tests

Golden-file tests. `tests/index.test.ts` is the only test file; each `tests/test-*/` directory is a
case consisting of:

- `schema.sql` — applied to the throwaway container
- `no-orm.config.ts` — reads `POSTGRES_CONNECTION_STRING` and `OUTPUT_DIRECTORY` from env, because
  the container host/port and the output path are dynamic per run
- `expected/` — committed golden output, compared file-by-file against generated `test-outputs/`
  (gitignored)
- `functionality.ts` — executed with `tsx` against the live container, asserting the *generated*
  code actually runs. This is where `@ts-expect-error` is used to prove ignored columns are absent.

The suite drops all public tables and types between cases, so cases must be self-contained.

**When you intentionally change generation output**, don't hand-edit `expected/`:

1. Temporarily comment out the file-comparison assertions in `tests/index.test.ts` and run the suite
   so fresh `test-outputs/` are produced.
2. Run `./scripts/assert-new-expected-behaviour-for-tests.sh` to promote `test-outputs/` → `expected/`.
3. Restore the assertions and re-run. Review the diff carefully — it is the tool's public API.

There is no CI yet; run the suite locally before opening a PR.

## Conventions

- ESM only, `type: "module"`, Node >= 23. Note the tsup banner shims `createRequire` for the bundle.
- Modules are consumed namespace-style: `import * as TableBuilder from "../builders/table.builder"`.
- `eslint-plugin-simple-import-sort` enforces import/export ordering — an unsorted import is an error.
- Use `src/logger.ts` (chalk-wrapped `info`/`warn`/`error`/`debug`) rather than bare `console`.
- `commander` is imported by `src/index.ts` but is **not** in `dependencies`, so tsup bundles it into
  `dist`. Adding it to `dependencies` would flip it to external — deliberate change, not a cleanup.
- `zod` and `slonik` are peer dependencies: they belong to the consuming project, and generated code
  imports them from there.
- `IDEA:` comments mark deliberate future work; the README lists larger planned features.

## Releases

Changesets. After a behavioural change run `npx @changesets/cli` to annotate it. Versioning
(`npx @changesets/cli version`) goes in its own PR. Publishing is currently manual and local;
`prepublishOnly` runs the build.
