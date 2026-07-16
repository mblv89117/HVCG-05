# FINAL_ACCEPTANCE_REPORT — Opportunity CRM Dev (v1.1)

**Generated:** 2026-07-15T23:56:38Z  
**Environment:** HVCG Development only (`org1131a2b0.crm.dynamics.com` / `HVCG-CommandCenter-Dev`)  
**Branch at report:** `agent/crm-dev-validation` (CRM smoke milestone)  
**Production:** untouched  
**Teams notify:** `hvcg_CrmEnableTeamsNotify=false` (Dev policy)

## Verdict

**PASS** — all four CRM smoke suites green with **zero failures**.

Evidence (local, not committed): `deployment/reports/checkpoints/crm-smoke-all-final.json`  
LeadQualified detail: `deployment/reports/checkpoints/crm-smoke-leadqualified-final.json`  
Reusable scripts: `deployment/scripts/crm/`

## Smoke matrix

| Suite | Result | Evidence highlights |
|-------|--------|---------------------|
| LeadQualified | PASS | Lead 11 → Opp 11, Act 12, OpportunityId/LeadId lookups, ConvertedOpportunityId, Succeeded AutomationLog |
| StageChanged | PASS | Opp 16 → Act 21 (`opp-stage|16|Negotiation`), Succeeded log 52 |
| WonCloseout | PASS | Opp 17 → Act 19 (`act-opp-won|17`), Succeeded log 48 |
| CapitalFunding | PASS | Cap 3 → Act 30 (`cap-status|3|Committed`), Succeeded log 70 |

## Verified capabilities

| Check | Result |
|-------|--------|
| Opportunity creation | PASS (LeadQualified + smoke prep) |
| Activity creation | PASS (all suites; lookups for opp/lead where required) |
| Notifications (Dev) | PASS via AutomationLogs Succeeded (Teams gated Off) |
| SharePoint writes | PASS (lists + field persist on LeadQualified CopilotSummary) |
| Flow activation | PASS (4/4 CRM flows `statecode=1`) |

## Flow runtime architecture (Dev)

| Flow | State | Pattern |
|------|-------|---------|
| `HVCG_LeadQualifiedCreateOpportunity` | On | Recurrence scanner + SharePoint HTTP Id capture (WO6) |
| `HVCG_OpportunityStageChangedNotify` | On | Recurrence + HTTP list/find (WO9) |
| `HVCG_OpportunityWonCloseout` | On | Recurrence + HTTP list/find (WO9) |
| `HVCG_CapitalFundingStatusNotify` | On | Recurrence + HTTP list/find (WO9) |

**Root-cause fixed for LeadQualified:** SharePoint PostItem does not reliably return `body/ID` for downstream lookup Object binding; resolve Id via HTTP `$filter` on `HVCG_IdempotencyKey`. Activity lookups use `{ "Id": <resolvedId> }` (not `OpportunityIdId`).

**Root-cause fixed for Stage/Won/Capital:** SharePoint OpenAPI `GetItems` on Opportunities/Capital lists failed at runtime after PostItem heartbeat proved connections work; switched list reads to SharePoint `HttpRequest`.

## Remaining notes (non-blocking for this smoke gate)

- Canvas / `.msapp` (OA-CRM-09 / D-002) still outstanding — not part of CRM flow smoke gate.
- Recurrence scanners (1-minute) are Dev-reliable; event-driven `GetOnUpdatedItems` proved flaky after clientdata patch cycles.
- No Production deployment in this run.

## Auth / safety

- Reused `HVCG-Dev-Maker` PAC profile and cached PnP interactive session; no new MFA/device-code unless expired.
- No Production environment selected or modified.
