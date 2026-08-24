# no-orm-cli

## 1.1.1

### Patch Changes

- f4f793f: Fix generated `createMany`/`updateMany`/`getMany` casts failing to compile whenever a table's `sql.unnest` call mixed plain columns (e.g. `int4`) with schema-qualified domain columns. Slonik's `columnTypes` type only accepts a uniformly tuple-shaped or uniformly string-shaped array, not a per-element mix, so every column type is now emitted as a tuple. Regenerating will change the generated output for every table, not just ones with schema-qualified domain columns.

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
