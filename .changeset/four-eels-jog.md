---
"no-orm-cli": minor
---

Fix generated `createMany`/`updateMany`/`getMany`/`deleteMany` casts for domain-typed columns breaking with `type "<domain>[]" does not exist` whenever the domain's schema wasn't on the connection's `search_path` — including genuine cross-schema domain references, which were also broken on the TypeScript side. Casts and imports are now schema-qualified. Regenerating will change the generated output for any domain column not living in `public`.
