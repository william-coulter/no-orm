---
"no-orm-cli": patch
---

Fix generated `createMany`/`updateMany`/`getMany` casts failing to compile whenever a table's `sql.unnest` call mixed plain columns (e.g. `int4`) with schema-qualified domain columns. Slonik's `columnTypes` type only accepts a uniformly tuple-shaped or uniformly string-shaped array, not a per-element mix, so every column type is now emitted as a tuple. Regenerating will change the generated output for every table, not just ones with schema-qualified domain columns.
