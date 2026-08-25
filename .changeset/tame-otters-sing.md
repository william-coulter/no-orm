---
"no-orm-cli": minor
---

Generate row-locking helpers for every table: `getManyForUpdate` and `getForUpdate` run a
primary-key `SELECT ... FOR UPDATE` and take a `DatabaseTransactionConnection`, so calling them
outside a transaction is a compile error rather than a silent no-op lock. `withLock` and
`withLockMany` wrap the common case: they open a transaction, lock the row(s), and hand a
`(row, transaction)` pair to a caller-supplied handler. Locking is primary-key only — the
`getBy*` index functions and `find`/`findMany` don't get locking variants, since a `FOR UPDATE`
can't lock a function scan.
