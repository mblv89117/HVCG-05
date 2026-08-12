# Release Readiness Matrix — post UAT precheck

| Area | Prior (S17) | UAT result | Remaining blocker | QA relevance |
|------|-------------|------------|-------------------|--------------|
| architecture | READY | unchanged | — | Ready |
| integration | READY_WITH_OWNER_GATE | precheck OK | Owner acceptance | High |
| identity | LIVE_VALIDATION_PENDING | fail-closed OK | Entra JWT | High |
| Client Portal | LIVE_VALIDATION_PENDING | Dev only | Portal infra/AV | High |
| Risk | READY_WITH_OWNER_GATE | precheck OK | Owner + Entra roles | High |
| Documents | READY_WITH_OWNER_GATE | precheck OK | Owner UX | High |
| M365 | LIVE_VALIDATION_PENDING | policy OK | Live Graph | High |
| AI | READY_WITH_OWNER_GATE | precheck OK | Owner acceptance | High |
| finance | LIVE_VALIDATION_PENDING | staging OK | QBO OWNER_PENDING | High |
| secrets | LIVE_VALIDATION_PENDING | unchanged | Non-Prod secrets | Medium |
| monitoring | LIVE_VALIDATION_PENDING | file sink | Alert channel | Medium |
| migration | READY_WITH_OWNER_GATE | rehearsal OK | Prod migration auth | Medium |
| Owner UAT | NOT_STARTED | **PARTIAL** (1/18 OWNER_PASS — UAT-01) | UAT-02…18 pending | Blocking |
| QA | NOT_STARTED | NOT_READY | Owner UAT incomplete | Blocking |
| rollback | READY | unchanged | Prod rollback untested | Medium |
| deployment | BLOCKED | BLOCKED | Owner+QA+RC | Blocking |

Do not upgrade LIVE_VALIDATION_PENDING without actual validation.
