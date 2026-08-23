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

## Peer dependency ranges lag the versions consumers actually need

**Problem**: `package.json` peers `slonik@^46.4.0` and `zod@^3.25.51`. A consumer on `slonik@49` (the current major) has to override the peer check entirely via `peerDependencyRules` in their own workspace config, because the declared range never got bumped past 46 despite there being no known incompatibility with 49.

**Solution**: Verify against `slonik@49` and bump the peer range (the `zod` bump is blocked separately — see the next two entries). Once fixed, downstream `peerDependencyRules` overrides for `slonik` can be removed.

## Unqualified domain names in generated `unnest` casts break every write on a cross-schema domain

**Problem**: `pgTypeToUnnestType` in `src/builders/mappers.ts` returns `column.informationSchemaValue.domain_name!` — a bare name, no schema qualifier — for any domain-typed column. `createMany`/`updateMany` in `src/builders/table.builder.ts` interpolate that straight into `sql.unnest(tuples, ["<name>[]", ...])`. Postgres resolves the bare name against `search_path`, so the cast only works when the domain's schema happens to be on the path. Domain resolution elsewhere in the generator (`domainColumnToZodSchemaName`/`domainColumnToTypescriptType` in `src/builders/domains.builder.ts`) is equally unqualified, which pushes consumers toward one schema per project with its own domains — exactly the setup that isn't on a shared connection's `search_path`. The result: `ERROR: type "<domain>[]" does not exist` on every write to a table with a domain column, the first time a project adds one. Reads are unaffected since they don't cast.

**Solution**: Fully qualify the cast with the domain's actual schema, e.g. `` `${column.informationSchemaValue.domain_schema}.${column.informationSchemaValue.domain_name}` ``, and generate proper cross-schema references for the TS side too instead of assuming the domain lives alongside the table. Add a test with two schemas that each define their own domain, asserting a generated `createMany` against either still round-trips.

## JSON schema codegen doesn't compile under zod 4

**Problem**: `buildSchemas` in `src/builders/postgres.builder.ts` generates `export const json: z.ZodType<Types.Json> = z.lazy(() => z.union([..., z.record(json)]))`. Zod 4's `z.record` requires both a key and value schema, and rejects the explicit `z.ZodType<T>` annotation on a `z.lazy` result the way zod 3 allowed it. Any project on zod 4 fails to compile the always-generated `schemas.ts` — which is why the `zod` peer stays pinned to `^3`, not by choice.

**Solution**: Generate zod 4's two-argument `z.record(z.string(), json)` and drop the `ZodType` annotation (zod 4 also ships a native `z.json()` that could replace the hand-rolled union outright), then bump the peer range.

# Fast follows

Some further features ideas are littered in the codebase as a comment with the `IDEA:` prefix.

Here are some more.

## Detecting database drift

**Problem**: If your locally generated `no-orm` differs from what is generated in production, you probably want to know about this before some obscure runtime error occurs.

**Solution**: Perhaps some checksum between `no-orm` generated locally vs deployed.

## Extend custom `Range` types

**Problem**: Right now all `Range` types are branded strings, e.g `export const floatRange = z.string().brand<"public.ranges.float_range">();` which is not really useful.

**Solution**: There is a range type defined in [postgres-range](https://github.com/martianboy/postgres-range#readme), we could probably return this instead.
