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

# Fast follows

Some further features ideas are littered in the codebase as a comment with the `IDEA:` prefix.

Here are some more.

## Detecting database drift

**Problem**: If your locally generated `no-orm` differs from what is generated in production, you probably want to know about this before some obscure runtime error occurs.

**Solution**: Perhaps some checksum between `no-orm` generated locally vs deployed.

## Extend custom `Range` types

**Problem**: Right now all `Range` types are branded strings, e.g `export const floatRange = z.string().brand<"public.ranges.float_range">();` which is not really useful.

**Solution**: There is a range type defined in [postgres-range](https://github.com/martianboy/postgres-range#readme), we could probably return this instead.
