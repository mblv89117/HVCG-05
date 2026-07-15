# Opportunity CRM — Acceptance Report (template)

**Product:** HVCG OS  
**Module:** Opportunity CRM v1  
**Environment:** Development (`HVCG-CommandCenter-Dev`)  
**Status:** `PENDING — fill after live apply`  

Use this template after completing `docs/crm/OWNER_ACTION_GUIDE.md` Phases B–H. Leave placeholders until live evidence exists. Do not mark **ACCEPT** without owner attestation.

---

## Header

| Field | Value |
|-------|--------|
| Report ID | `CRM-DEV-ACCEPT-YYYYMMDD-___` |
| Operator (owner / delegate) | `____________________` |
| Date (America/Los_Angeles) | `YYYY-MM-DD` |
| Integration commit SHA | `____________________` |
| Branch / tag at apply | `____________________` |
| Baseline infra tag | `v1.1.0-dev-sharepoint-baseline` |
| Verdict | ☐ PASS · ☐ PASS WITH NOTES · ☐ FAIL · ☐ NOT RUN |

---

## 1. Preconditions

| Check | Result | Notes / evidence |
|-------|--------|------------------|
| Infra baseline still zero-drift before CRM apply | ☐ Pass ☐ Fail ☐ N/A | `____________________` |
| PnP Entra Client ID configured | ☐ Pass ☐ Fail | `____________________` |
| Interactive Microsoft sign-in completed | ☐ Pass ☐ Fail | Operator: `____________________` |
| Admin consent completed (if prompted) | ☐ Pass ☐ Fail ☐ N/A | `____________________` |
| Optional backup taken | ☐ Pass ☐ Skip | Backup path/report: `____________________` |

---

## 2. Schema apply (repair)

| Check | Result | Notes / evidence |
|-------|--------|------------------|
| `Repair-HVCGOSSharePointSchema.ps1 -Environment development` exit code 0 | ☐ Pass ☐ Fail ☐ Not run | Exit: `___` · Log: `____________________` |
| Schema validation `hasDrift=false` | ☐ Pass ☐ Fail ☐ Not run | Report: `deployment/reports/schema/…` |
| List `HVCG_OpportunityActivities` present | ☐ Pass ☐ Fail ☐ Not run | URL/ID: `____________________` |
| Bridge columns on `HVCG_Opportunities` (`CapitalOpportunityId`, `CapitalHandoffStatus`, Copilot fields, …) | ☐ Pass ☐ Fail ☐ Not run | Spot-check: `____________________` |
| Bridge columns on `HVCG_CapitalOpportunities` | ☐ Pass ☐ Fail ☐ Not run | Spot-check: `____________________` |
| CRM views present (Open Pipeline / Commit Forecast / Capital Handoffs Ready / Recent Activities / …) | ☐ Pass ☐ Fail ☐ Not run | `____________________` |

**Schema section verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 3. Connections & environment

| Check | Result | Notes / evidence |
|-------|--------|------------------|
| SharePoint connection authorized (Dev site) | ☐ Pass ☐ Fail ☐ Not run | Connection name: `____________________` |
| Teams connection authorized | ☐ Pass ☐ Fail ☐ Not run | `____________________` |
| Outlook connection authorized (flows that require it) | ☐ Pass ☐ Fail ☐ N/A | `____________________` |
| `HVCG_SITE_URL` set to Dev Command Center | ☐ Pass ☐ Fail ☐ Not run | Value (non-secret): `____________________` |
| `HVCG_TEAMS_CRM_CHANNEL_ID` → **test** channel only | ☐ Pass ☐ Fail ☐ Not run | Channel display name: `____________________` |
| `HVCG_TEAMS_CAPITAL_CHANNEL_ID` → **test** channel only | ☐ Pass ☐ Fail ☐ Not run | Channel display name: `____________________` |

**Connections section verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 4. Power Automate flows

| Flow | Imported | Connections bound | Test run | Activated (On) | Evidence |
|------|----------|-------------------|----------|----------------|----------|
| `HVCG_LeadQualifiedCreateOpportunity` | ☐ | ☐ | ☐ Pass ☐ Fail ☐ N/A | ☐ Off ☐ On | Run URL: `____________________` |
| `HVCG_OpportunityStageChangedNotify` | ☐ | ☐ | ☐ Pass ☐ Fail ☐ N/A | ☐ Off ☐ On | Run URL: `____________________` |
| `HVCG_OpportunityWonCloseout` | ☐ | ☐ | ☐ Pass ☐ Fail ☐ N/A | ☐ Off ☐ On | Run URL: `____________________` |
| `HVCG_CapitalFundingStatusNotify` | ☐ | ☐ | ☐ Pass ☐ Fail ☐ N/A | ☐ Off ☐ On | Run URL: `____________________` |

Outbound traffic during tests: ☐ Test channels/mailboxes only · ☐ Unexpected prod/client recipient (**FAIL**) · ☐ N/A  

**Flows section verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 5. Power Apps (canvas)

| Check | Result | Notes / evidence |
|-------|--------|------------------|
| `scrCRM` built / published in Dev | ☐ Pass ☐ Fail ☐ Not run | App ID / version: `____________________` |
| `scrOpportunityDetail` built / published | ☐ Pass ☐ Fail ☐ Not run | `____________________` |
| SharePoint data sources connected | ☐ Pass ☐ Fail ☐ Not run | Lists: `____________________` |
| Pipeline / handoff named formulas return rows or empty state (no error) | ☐ Pass ☐ Fail ☐ Not run | `____________________` |
| Role smoke (Owner / CapitalAdvisor / ProjectManager as available) | ☐ Pass ☐ Fail ☐ N/A | `____________________` |
| Desktop + phone layout acceptable | ☐ Pass ☐ Fail ☐ Not run | `____________________` |

**Apps section verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 6. End-to-end lifecycle (demo data)

| Step | Result | Item ID / title | Notes |
|------|--------|-----------------|-------|
| Lead → Qualified creates Opportunity | ☐ Pass ☐ Fail ☐ Not run | `____________________` | |
| Stage change creates activity / Teams test notify | ☐ Pass ☐ Fail ☐ Not run | `____________________` | |
| Won closeout + capital handoff fields | ☐ Pass ☐ Fail ☐ Not run | `____________________` | |
| FundingStatus change → capital test notify | ☐ Pass ☐ Fail ☐ Not run | `____________________` | |
| Copilot fields free of secrets / banned content | ☐ Pass ☐ Fail ☐ Not run | `____________________` | |

**Lifecycle section verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 7. Tests (repo / scripted)

| Check | Result | Notes |
|-------|--------|-------|
| `python3 tests/unit/test_opportunity_crm.py` | ☐ Pass ☐ Fail ☐ Not run | `____________________` |
| `pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1` | ☐ Pass ☐ Fail ☐ Not run | `____________________` |
| Optional: `Test-HVCGOpportunityCrmAcceptance.ps1` (if present on integration branch) | ☐ Pass ☐ Fail ☐ N/A | `____________________` |
| Smoke checklist (`docs/crm/SMOKE_TEST_CHECKLIST.md` if present) completed | ☐ Pass ☐ Fail ☐ N/A | `____________________` |

**Automated tests verdict:** ☐ Pass ☐ Fail ☐ Not run  

---

## 8. Open issues / notes

| ID | Severity | Description | Owner | Due |
|----|----------|-------------|-------|-----|
| `____` | Low / Med / High / Blocker | `____________________` | `____` | `____` |

---

## 9. Sign-off

| Role | Name | Date | Signature / ack |
|------|------|------|-----------------|
| Operator | `____________________` | `__________` | ☐ Attest results above are accurate |
| Owner (Manny) | `____________________` | `__________` | ☐ Accept Dev CRM · ☐ Reject · ☐ Accept with notes |

**Production promote authorized?** ☐ No (default) · ☐ Yes (requires separate written approval — OA-CRM-11)

---

## Change log

| Date | Author | Change |
|------|--------|--------|
| 2026-07-15 | Agent 6 (docs) | Template created for Opportunity CRM Dev acceptance |
