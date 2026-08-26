---
"no-orm-cli": patch
---

Fix two bugs where the generated `tables` barrel could fail to compile: a schema with no
generatable tables (e.g. one holding only domains or enums) no longer emits an empty,
invalid `tables/index.ts`, and the tables barrel no longer re-exports tables that were
skipped for lacking a primary key or having a composite column.
