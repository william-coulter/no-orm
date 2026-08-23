---
"no-orm-cli": patch
---

Declare `commander` as a real dependency instead of relying on it being hoisted from a transitive package. Previously an install layout that didn't happen to hoist `commander` to the top level could ship a broken built CLI.
