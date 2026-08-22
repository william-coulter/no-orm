# Welcome to No ORM

![No ORM Logo](./logo.webp)

This is the source code for the [no-orm](https://www.no-orm.com/) project.

# Documentation

Documentation: https://no-orm.com

# How to read this repository

## Entrypoint

The `src/index.ts` file is the entry-point for the `no-orm` package.

This defines a [commander](https://github.com/tj/commander.js?tab=readme-ov-file#quick-start) program for `no-orm`.

## Other key files

- `src/commands`: Program commands are defined in this directory. The main command for `no-orm` is `generate`, which actually generates the code from a database.
- `src/parsers`: Parsers parse a Postgres entity (schema, table etc) and manage building the code according to the user's database and `no-orm` config.
- `src/builders`: Builders actually build the code and simply return strings.
- `src/config`: Handles parsing the `no-orm.config.ts` file that a user can supply such that it can be used by this tool.

# Want to contribute?

## Submit a pull request

There is no template. Pour your heart into the PR description. Please include the reason for your pull request and change.

You should test all of your changes before submitting the PR. Even better if you write a test if you're introducing new behaviour.

## Testing

The tests in this project are mainly used to guard-rail against regressions. This project favours capturing core behaviour well rather than testing every edge-case.

### How they work

The tests basically execute `no-orm` against various schemas and asserts that the expected files are generated. You can see the test examples being set up in the `tests/test-*` directories.

### How to run them locally

You can run these locally with `npm run test` which is a wrapper around [vitest](https://vitest.dev/). Use `npm run test -- tests/index.test.ts -t 'Test foreign key references'` to test a particular file and test.

### Automated tests?

One day these tests will run as an automated check against every pull request.

### If you change No ORM's API

Let's say you change how certain columns are generated, you don't have to go through each `tests/test-*` directory and update the expected output. You can:

1. Manual edit the `index.test.ts` file to run `no-orm` over every test suite but without the test assertions.
2. Run `./scripts/assert-new-expected-behaviour-for-tests.sh`.

This will copy all of the test outputs and make them the new expected outputs.

## Version control

No ORM uses [changesets](https://github.com/changesets/changesets/tree/main?tab=readme-ov-file) for version control and publishing new versions.

The general workflow is:

1. Make a code change to this repository.
2. Annotate your change with `npx @changesets/cli`.

When we want to publish a release, we run `npx @changesets/cli version` and submit in its own PR.

# Publishing

Right now this is done locally... This should be automated somehow.

# Bug fixes

Known issues that are worth picking up. Each one should get a test that fails before the fix.

## `readonly_time_columns` is silently ignored

**Problem**: `TableConfig.readonly_time_columns` is documented on the type in `src/config/schema.ts` but is missing from the matching `tableConfigSchema` Zod object. Zod strips unknown keys, so the value never survives `noOrmConfigSchema.parse()` in `src/commands/generate.ts`. By the time `parseForTable` reads `config.readonly_time_columns ?? true` it is always `undefined`, which means `created_at` and `updated_at` are treated as readonly no matter what the user sets.

You can reproduce it by parsing a config that sets the field and printing the result — the key is gone.

**Solution**: Add `readonly_time_columns: z.boolean().optional()` to `tableConfigSchema`. Then add a test case that sets it to `false` and asserts the generated `Create` and `Update` types include the time columns.

## The drift catcher doesn't catch nested drift

**Problem**: The bug above should have been a compile error. `src/config/drift-catcher.ts` guards the hand-written config types against their Zod schemas with `TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>`, but `Exclude` only distributes over unions. For two object types it collapses to `never` regardless of whether their properties agree, so any divergence below the top level of `NoOrmConfig` passes silently.

**Solution**: Replace `TypeEqualityGuard` with a structural equality check (the usual trick is a pair of conditional types comparing `<T>() => T extends A ? 1 : 2` against `<T>() => T extends B ? 1 : 2`), applied recursively. Assert it for `SchemaConfig`, `TableConfig` and `ColumnConfig` as well, not just `NoOrmConfig`.

## `commander` is an undeclared dependency

**Problem**: `src/index.ts` imports `commander` but it is not listed in `dependencies` — it only resolves locally because it is hoisted from a transitive dependency. This currently works in the published package by accident: `tsup` externalises declared dependencies and peer dependencies only, so `commander` gets bundled into `dist` instead.

**Solution**: Add `commander` to `dependencies` at the version we actually use. Be aware this flips it from bundled to external, which changes what ships in `dist` — verify the built CLI still runs from a clean install afterwards.

# Fast follows

Some further features ideas are littered in the codebase as a comment with the `IDEA:` prefix.

Here are some more.

## Detecting database drift

**Problem**: If your locally generated `no-orm` differs from what is generated in production, you probably want to know about this before some obscure runtime error occurs.

**Solution**: Perhaps some checksum between `no-orm` generated locally vs deployed.

## Extend custom `Range` types

**Problem**: Right now all `Range` types are branded strings, e.g `export const floatRange = z.string().brand<"public.ranges.float_range">();` which is not really useful.

**Solution**: There is a range type defined in [postgres-range](https://github.com/martianboy/postgres-range#readme), we could probably return this instead.
