# no-orm-cli

## 2.2.0

### Minor Changes

- 4c68acd: Generate row-locking helpers for every table: `getManyForUpdate` and `getForUpdate` run a
  primary-key `SELECT ... FOR UPDATE` and take a `DatabaseTransactionConnection`, so calling them
  outside a transaction is a compile error rather than a silent no-op lock. `withLock` and
  `withLockMany` wrap the common case: they open a transaction, lock the row(s), and hand a
  `(row, transaction)` pair to a caller-supplied handler. Locking is primary-key only — the
  `getBy*` index functions and `find`/`findMany` don't get locking variants, since a `FOR UPDATE`
  can't lock a function scan.

### Patch Changes

- a978a4f: Fix two bugs where the generated `tables` barrel could fail to compile: a schema with no
  generatable tables (e.g. one holding only domains or enums) no longer emits an empty,
  invalid `tables/index.ts`, and the tables barrel no longer re-exports tables that were
  skipped for lacking a primary key or having a composite column.

## 2.1.0

### Minor Changes

- f4016a0: Fix generated `createMany`/`updateMany`/`getMany` casts failing to compile whenever a table's `sql.unnest` call mixed plain columns (e.g. `int4`) with schema-qualified domain columns. Slonik's `columnTypes` type only accepts a uniformly tuple-shaped or uniformly string-shaped array, not a per-element mix, so every column type is now emitted as a tuple. Regenerating will change the generated output for every table, not just ones with schema-qualified domain columns.

## 2.0.0

### Major Changes

- 4892aa0: Drop zod 3 support and bump the `slonik` peer to `^49`. Generated `postgres/schemas.ts` now uses zod 4's native `z.json()` instead of a hand-rolled recursive union, which does not compile under zod 3 — a consumer must be on zod `^4` and slonik `^49` after upgrading. `tests/slonik-test-connection.ts`'s result-parser interceptor was also rewritten for slonik 49's `Interceptor` API (a required `name`, and `transformRow` → `transformRowAsync`), matching what any consumer's own interceptor code will need to do.

## 1.1.0

### Minor Changes

- 927ef35: Fix generated `createMany`/`updateMany`/`getMany`/`deleteMany` casts for domain-typed columns breaking with `type "<domain>[]" does not exist` whenever the domain's schema wasn't on the connection's `search_path` — including genuine cross-schema domain references, which were also broken on the TypeScript side. Casts and imports are now schema-qualified. Regenerating will change the generated output for any domain column not living in `public`.

### Patch Changes

- b631026: Fix `readonly_time_columns` table config option being silently ignored. Setting it to `false` now correctly makes `created_at`/`updated_at` settable on `create`/`update`, instead of always being treated as readonly.
- 5c91ae7: Declare `commander` as a real dependency instead of relying on it being hoisted from a transitive package. Previously an install layout that didn't happen to hoist `commander` to the top level could ship a broken built CLI.
- 06798e9: Fix the compile-time drift catcher that guards the hand-written config types against their Zod schemas. It previously only caught divergence at the top level of `NoOrmConfig`; it now catches nested divergence too, across `NoOrmConfig`, `DatabaseSchemaConfig`, `SchemaConfig`, `TableConfig`, and `ColumnConfig`.

## 1.0.0

### Patch Changes

- 38c69ab: Initial release! (Woohoo!)
