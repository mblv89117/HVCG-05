# Finance Source / Reconciliation — Sprint 17

| Item | Result |
|------|--------|
| Authoritative candidate | QBO (specialist worktree) — Owner confirmation still required |
| Gate | `NO_QBO_PLAID_LIVE` |
| Write scope | NONE — read/reconcile/validate |
| Money movement | false |
| Staging adapter | Sanitized INTERNAL records via `revenue_truth` |
| Partial payment | Case P — balanceDue retained |
| ACCG | Case Q — ~$4,539 locked |
| Legacy reprice | Case R — import bypass blocked |
| Live QBO | CREDENTIAL_REQUIRED |

Distinctions preserved: INVOICE ≠ PAYMENT ≠ RECONCILED ≠ money authority.
