---
"no-orm-cli": major
---

Drop zod 3 support and bump the `slonik` peer to `^49`. Generated `postgres/schemas.ts` now uses zod 4's native `z.json()` instead of a hand-rolled recursive union, which does not compile under zod 3 — a consumer must be on zod `^4` and slonik `^49` after upgrading. `tests/slonik-test-connection.ts`'s result-parser interceptor was also rewritten for slonik 49's `Interceptor` API (a required `name`, and `transformRow` → `transformRowAsync`), matching what any consumer's own interceptor code will need to do.
