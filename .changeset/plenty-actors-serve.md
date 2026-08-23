---
"no-orm-cli": patch
---

Fix `readonly_time_columns` table config option being silently ignored. Setting it to `false` now correctly makes `created_at`/`updated_at` settable on `create`/`update`, instead of always being treated as readonly.
