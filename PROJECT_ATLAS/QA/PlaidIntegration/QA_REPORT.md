# Plaid Sandbox — QA Test Plan & Report

**Environment:** Sandbox  
**Branch:** `cursor/plaid-integration`  
**Status:** Automated unit tests PASS · Live Link **BLOCKED** on owner secrets

## Automated evidence (no secrets required)

| Test | Result |
|------|--------|
| Token encrypt/decrypt | PASS |
| Redaction helper | PASS |
| Tenant isolation deny | PASS |
| Approved products set | PASS |
| Verified cash mapping | PASS |

## Live Sandbox checklist (requires owner secrets)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Successful connection | PENDING |
| 2 | Multiple institutions | PENDING |
| 3 | Multiple accounts | PENDING |
| 4 | Duplicate-link prevention | PENDING |
| 5 | Invalid public token | PENDING |
| 6 | Expired credentials / login required | PENDING |
| 7 | Reauthorization | PENDING |
| 8 | Webhook retries / idempotency | PENDING |
| 9 | Transactions pagination | PENDING |
| 10 | Balance refresh | PENDING |
| 11 | Tenant isolation (live) | PENDING |
| 12 | Unauthorized API access | PENDING |
| 13 | Disconnect flow | PENDING |
| 14 | Secret redaction in logs | PENDING |
| 15 | Failure recovery | PENDING |
| 16 | Mobile + desktop UI | PENDING |
| 17 | Empty-state UI | PENDING |
| 18 | Loading + error states | PENDING |

## GO / NO-GO

| Target | Verdict |
|--------|---------|
| Sandbox engineering validation | **CONDITIONAL** — code ready; secrets required |
| Sandbox QA GO | **NO-GO** until live checklist complete |
| Production | **NO-GO** |

## Defects

None opened yet (live testing not started).
