# QA Rollback Plan (Draft — for future RC)

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT  
**Status:** Template ready; no RC labeled yet.

## When RC exists (fill per packet)

| Field | Value |
|-------|-------|
| Rollback trigger | Failed Dev validation; schema corruption; auth regression; secret exposure |
| Rollback branch/tag | TBD at RC creation (do not invent tag) |
| Affected components | Per merged packet list |
| Restoration commands | `git revert` of merge commit(s) on release line; Dev solution re-import prior zip if applicable |
| Expected recovery time | Repo: <30m; Dev solution: owner-dependent |
| Data preservation | Prefer no list wipe; restore definitions only |
| Post-rollback validation | Offline suite + health checks; confirm Prod still untouched |

## Current operational rollback
- **Do not deploy** — primary rollback is "never merge/deploy" while gates red.
- CRM live Dev changes already imported remain owner-managed; integration will not reverse without D-approval.
