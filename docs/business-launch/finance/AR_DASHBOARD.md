# AR_DASHBOARD

**As of:** 2026-07-16 01:29 UTC
**Rule:** Visibility only — collections contact requires Manny approval.

## Portfolio

| Client | Billing status | Past-due signals | Priority | Next |
|--------|----------------|------------------|----------|------|
| ACCG Inc. | Legacy LOCKED $4,539/mo | 3 | **MEDIUM** | Owner: keep legacy pricing; review past-due if still open |
| Prodigy Games LLC | ~$7,500/mo agreement | 2 | **HIGH** | Apr/May 2026 past-due — approval queue Q-001 |
| Christie's Place LLC | $4,750 invoices Jun 2026 | 0 | **LOW** | Clear |

## Register coverage
- Invoice register rows loaded: **50**
- Detail: `.worktrees/finance-operations/docs/finance/inventory/`
- Approval queue: `APPROVAL_QUEUE.md`

## Age model (operational)

| Bucket | Definition | Action |
|--------|------------|--------|
| Current | Not past due | Monitor |
| 1–30 | Past due ≤30d | Draft REM_FRIENDLY → approval queue |
| 31–60 | Past due 31–60d | Draft REM_FIRM → approval queue |
| 61+ | Past due >60d | Internal escalate to Manny |
