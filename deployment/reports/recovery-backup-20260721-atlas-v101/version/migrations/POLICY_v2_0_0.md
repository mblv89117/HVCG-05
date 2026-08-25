# Upgrade policy: v1.x → v2.x

Major upgrades MUST:

1. Ship an explicit migration pack under `releases/migrations/` with `fromVersion` matching installed 1.x.
2. Prefer additive schema + dual-write period over destructive renames.
3. Map business keys (`ClientCode`, `HVCG_IdempotencyKey`) — never rebuild customer items from sample data.
4. Keep SharePoint list internal names stable where possible; if rename required, add new column, backfill, deprecate old.
5. Require backup/export snapshot before apply.
6. Support rollback of **solution/app/flows** and **version marker**; data columns added in 2.x remain but unused.
