# Plan: the generated `tables` barrel must always be a valid, accurate module

Status: not started. Written to be handed to a coding agent.

Baseline: `main` at commit `4c68acd` ("Introduce `withLock` and `getForUpdate` table methods").

## Background

`src/parsers/schema.parser.ts` writes a barrel file at `<schema>/tables/index.ts` re-exporting one
namespace per table, and a schema barrel at `<schema>/index.ts` that re-exports it as
`export * as Tables from "./tables"`. Both are wrong in the presence of tables that don't exist.

Two independent defects, both producing output that fails `tsc`. Both were reproduced against a
real `postgres:17`.

### Bug 1 — an empty barrel is not a module

`buildTableIndex` joins its entries with `";\n"`. With zero entries that is the empty string, and
an empty `.ts` file is not a module as far as TypeScript is concerned, so the re-export in the
schema barrel fails:

```
domainsonly/index.ts(4,25): error TS2306: File '.../domainsonly/tables/index.ts' is not a module.
```

Reachable whenever a schema has no generatable tables but does have something else worth
generating — a schema holding only shared domains or enums, or one whose every table is ignored.
This is what surfaced after the "Move domains back to public schema" change left `public` with
zero tables.

### Bug 2 — the barrel re-exports tables that were never written

The parse loop in `schema.parser.ts` skips a table for **four** reasons: the `ignore` config, no
primary key, a composite column, and the `please_oh_god_throw_an_error` test hook.
`buildTableIndex` re-derives the list from `schema.tables` and reimplements only the *first* of
those checks, so any table skipped for one of the other reasons still gets an entry pointing at a
file that was never written:

```
public/tables/index.ts(2,23): error TS2307: Cannot find module './no_pk'
```

This needs no config to hit — one table without a primary key is enough.

Bug 2 is the root cause worth fixing properly: **the barrel must be built from what the loop
actually wrote, not from a second, drifting copy of the loop's eligibility rules.** Fixing it that
way makes this class of bug unreachable rather than fixed-once.

## Why the test suite missed both

`tests/index.test.ts` already runs a real `tsc` over the generated output
(`typecheckGeneratedOutput`), so it *would* have caught both. It didn't because every existing
fixture happens to have at least one table in every schema and no skipped tables. The gap is
fixture coverage, not harness capability.

## Scope

### In scope

1. Bug 1 — empty barrel emits `export {};`.
2. Bug 2 — barrel is built from the names the parse loop actually wrote.
3. A fixture covering both, plus a changeset.

### Explicitly out of scope

- **Schema-aware FK / enum / range import paths.** A cross-schema foreign key emits
  `../tables/<name>`, which doesn't resolve. This is real, but it is already specified in
  `CROSS_SCHEMA_PLAN.md` **Step 3c**, together with the alias-collision and duplicate-import
  defects in the same block. Do not touch `buildImports` or `mappers.ts` here — that plan and this
  one would collide in the same functions.
- **References to a table or schema that was never generated** (dangling FK/domain imports). See
  the "References to a table or schema that was never generated" entry in `README.md`, and
  `CROSS_SCHEMA_PLAN.md` Step 4 for the ignored-*schema* half. Note that fixture item (d) below
  deliberately stops short of triggering it.
- **Tables with no creatable or updatable columns.** Separate bug, different mechanism (invalid
  SQL rather than broken module wiring), recorded in `README.md`.
- The `enums`/`domains`/`ranges` barrels. They are static three-liners that are always valid
  modules, so Bug 1 does not apply to them. Their `schemas.ts` / `types.ts` do keep an unused
  `import { z } from "zod"` when the schema has none of that kind — harmless under this repo's
  `tsconfig.json`, but `TS6133` for any consumer using `noUnusedLocals`. Leave it; if you want it,
  do it as its own change.

## What is already correct (don't "fix" these)

- The parse loop's skip conditions themselves. They are fine; only their *duplication* in
  `buildTableIndex` is the problem.
- `buildIndex` (`schema.parser.ts:228`) unconditionally re-exporting all four namespaces. Keep it
  unconditional — see the decision below.

## Decision: `export {}`, not a conditional re-export

The obvious alternative is to drop `export * as Tables from "./tables"` when a schema has no
tables. Don't. Three reasons:

- The shape of the generated tree would then vary with database contents. `Public.Tables` would
  silently vanish the day someone drops the last table in a schema, and the consumer's error
  appears at their call site, far from the cause.
- It needs the same condition in three places — the `mkdir`, the barrel, and the schema barrel —
  which is exactly the duplicated-rules problem Bug 2 already is.
- `export {};` keeps `Tables` present as an empty namespace, costs one line, and lives in one
  place.

The invariant to hold: **every file `no-orm` writes is a valid ES module, and the directory shape
is identical for every schema regardless of what the database contains.**

## Step 1 — build the barrel from what was written

In `src/parsers/schema.parser.ts`:

1. Before the `for (const table of Object.values(schema.tables))` loop, declare
   `const generatedTableNames: string[] = [];`.
2. After the `await TableParser.parse({ ... })` call at the end of the loop body — and only there,
   so every `continue` above it is naturally excluded — push `table.name`.
3. Change `BuildTableIndexArgs` to take `table_names: string[]` in place of both `tables:
   TableDetails[]` and `config: NonIgnoredConfig`, and update the call site at `:91` to pass
   `generatedTableNames`.
4. Delete the `config.table_configs.get(name)?.ignore === true` filter and the `.filter((s) => s
   !== null)` inside `buildTableIndex`. Its input is now authoritative; it should not second-guess
   it.
5. Drop the now-unused `TableDetails` import if nothing else in the file needs it.

Ordering note: `buildTableIndex` is already called after the loop, so no restructuring is needed.

## Step 2 — empty barrel is still a module

Still in `buildTableIndex`, when `table_names` is empty emit `export {};` instead of the empty
string. Keep it to that one branch — don't append it unconditionally, it's noise in the normal
case.

Add a short comment saying *why* (an empty file is not a module, and the schema barrel re-exports
this one), so it doesn't get "cleaned up" later.

## Step 3 — fixture

Add `tests/test-empty-states/` following the existing fixture layout (`schema.sql`,
`no-orm.config.ts`, `functionality.ts`, `expected/`), and register it in the `testCases` array in
`tests/index.test.ts`.

`schema.sql` should contain:

- (a) a schema with domains and/or enums but **zero tables** — covers Bug 1;
- (b) a table with **no primary key** in a schema that also has a real table — covers Bug 2 via the
  no-PK skip, and confirms the surviving table is still exported;
- (c) a table ignored via `no-orm.config.ts` — covers Bug 2 via the config skip, the one path that
  already worked, so it stays working;
- (d) a schema where **every** table is ignored by config — the combination of both bugs: the
  barrel must be `export {};` and the schema barrel must still compile.

Do **not** give (b) or (c) an inbound foreign key. That triggers the separate dangling-import bug
that is out of scope here, and would make this fixture fail for an unrelated reason.

`functionality.ts` should import the schema barrel from (a) and touch `.Tables` to prove the empty
namespace is real and reachable, then exercise ordinary CRUD on the surviving table from (b) so the
fixture isn't purely a compile-time test. Follow the shape of an existing `functionality.ts`.

Generate `expected/` by running the generator and copying the output; do not hand-write it.

## Step 4 — verification

1. `npx vitest run` — needs Docker.
2. `npx tsc --noEmit` and `npx eslint .`.
3. Confirm no *existing* fixture changed. None should: every current fixture has at least one table
   per schema and no skipped tables, so both code paths are unreachable for them. **A diff in any
   existing `expected/` file means something went wrong — investigate, don't re-baseline.**
4. Sanity-check by hand that `test-empty-states/expected/<schema-a>/tables/index.ts` contains
   `export {};` and that no barrel anywhere names a file that isn't on disk.

## Changeset

Patch. Two user-visible fixes: a schema with no generatable tables no longer emits an unusable
`tables/index.ts`, and the tables barrel no longer re-exports tables that were skipped for having
no primary key or a composite column.
