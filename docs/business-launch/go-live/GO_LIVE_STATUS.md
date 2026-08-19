# GO_LIVE_STATUS

**Program:** HVCG Go-Live  
**As of:** 2026-07-15 18:40 PT  
**Control:** COO / Master PM  
**Hard stop:** No Prod deploy · no DNS · no client import · no send until explicit CEO approval of that action  

| Metric | Status | % |
|--------|--------|---|
| Internal system readiness | IN PROGRESS | 55% |
| Production deployment readiness | **BLOCKED** (no Prod env in PAC) | 25% |
| Client pilot readiness | READY FOR OWNER APPROVAL (pre-import reports) | 70% |
| Website readiness | IN PROGRESS (preview pack ready) | 75% |
| Funnel readiness | IN PROGRESS (local forms; CRM route not live) | 45% |
| Automation readiness | IN PROGRESS (Dev stubs) | 40% |
| QA | IN PROGRESS | 50% |
| Security | IN PROGRESS (flags locked Off) | 60% |
| Rollback readiness | READY (RC-1 rollback guide exists) | 80% |

## Track status

| Track | Status | Notes |
|-------|--------|-------|
| 1 Internal Business System | BLOCKED → then READY FOR OWNER APPROVAL | Need Prod environment identity |
| 2 Verified Client Data | READY FOR OWNER APPROVAL | Pilot pre-import reports done — **not imported** |
| 3 Public Website & Funnel | IN PROGRESS | Preview pack + local server; no DNS |
| 4 Business Automations | IN PROGRESS | First 5 defined for Dev; not client-facing |

## Open owner approvals

| ID | Ask |
|----|-----|
| **GL-0** | Confirm/create **HVCG Production** Power Platform environment + Prod SharePoint site URLs |
| GL-PILOT-1 | Approve 3-client Production import after GL-0 + Track1 deploy |
| GL-WEB-PREVIEW | Approve preview hosting method beyond localhost (optional) |
| GL-PUBLISH-1 | Public DNS/publish (later) |
| Collections Q-* | Money collect (separate) |

## Deployment blockers

1. **No Production environment** listed in `pac env list` (only HVCG Development)  
2. Production SharePoint site URLs unknown (must not use `*-Dev`)  
3. Production connection IDs empty  
4. Canvas `.msapp` still unmet (D-002) — internal pilot can proceed flow-first  
5. Website→CRM Forms not wired (needs SP/Forms in target env)

## Current release candidate
**RC-1-Development-Baseline** · solution **HVCGCommandCenterDev 1.1.0.1** · frozen  

## Last successful test
Dev CRM smoke (LeadQualified / Stage / Won / Capital) — PASS (RC-1 evidence)  
Website Soft UAT — 834 PASS / 0 FAIL  

## Next release action
**CEO: GL-0** — identify/create Production environment (click-by-click below in approvals/)
