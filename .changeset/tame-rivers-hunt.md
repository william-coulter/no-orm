---
"no-orm-cli": patch
---

Fix the compile-time drift catcher that guards the hand-written config types against their Zod schemas. It previously only caught divergence at the top level of `NoOrmConfig`; it now catches nested divergence too, across `NoOrmConfig`, `DatabaseSchemaConfig`, `SchemaConfig`, `TableConfig`, and `ColumnConfig`.
