# DEPLOYMENT ENGINEER HANDOFF

**Audience:** Fresh Deployment Engineer session  
**Written:** 2026-07-16T02:55Z (approx)  
**Author session:** deployment-engineer (`cursor/deployment-engineer`)  
**Hard rule:** Do **not** guess. If a value is not in this file or cited evidence, mark it **UNKNOWN** and re-verify with PAC / Maker / SharePoint before acting.

---

## 1. Current production state

| Item | Status (verified) |
|------|-------------------|
| GL-0 (Prod env + Prod SharePoint sites) | COMPLETE |
| Managed solution import | COMPLETE |
| Connection reference binding | COMPLETE (Dataverse `connectionid` populated 4/4) |
| Read-only Prod smoke | PASS (2026-07-16T02:33Z) |
| Functional LeadQualified smoke | **INCOMPLETE / FAILING** — lead created on Prod; no opp/act/Succeeded log observed before session interrupt |
| Pilot client import | NOT STARTED |
| Website DNS / public launch | NOT STARTED |
| Canvas publish | NOT DONE (gated D-002) |

**Release status (Track 1):** VALIDATING — solution live; one flow Activated; functional smoke not green.

---

## 2. HVCG Production environment

| Field | Value |
|-------|-------|
| Display name | HVCG Production |
| Environment ID | `f141a2cf-ae13-eb59-84c4-25817d899105` |
| Organization ID | `a34bbff3-b380-f111-8068-6045bd0a1f11` |
| Unique name | `unqa34bbff3b380f11180686045bd0a1` |
| Environment URL | `https://orgee2f7545.crm.dynamics.com/` |
| Type | Production |
| Dataverse | Yes |
| Region | United States |
| Security group | **None** (intentional unrestricted — owner 2026-07-15) |
| Managed Environment feature | No |

**Development (do not deploy here):**

| Field | Value |
|-------|-------|
| Display name | HVCG Development |
| Environment ID | `c03b1329-4394-ece7-acc9-c50794b3db1e` |
| URL | `https://org1131a2b0.crm.dynamics.com/` |

PAC profile in use: `HVCG-Dev-Maker` · `manny@highvaluecapitalgroup.com`

---

## 3. Production SharePoint URLs

| Purpose | URL |
|---------|-----|
| Command Center | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` |
| Clients Hub | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients` |
| Knowledge | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge` |

**Forbidden in Prod settings:** any `*-Dev` site URL.

**CRM lists on Prod Command Center (provisioned this session for smoke):**

| List | Status |
|------|--------|
| HVCG_Leads | Created (empty schema + fields; cross-list lookups to Clients/Referrals skipped) |
| HVCG_Opportunities | Created |
| HVCG_OpportunityActivities | Created |
| HVCG_AutomationLogs | Created |
| Full Command Center schema (all HVCG_* lists) | **NOT** fully provisioned — UNKNOWN beyond the four above |

---

## 4. Imported managed solution

| Field | Value |
|-------|-------|
| Unique name | `HVCGCommandCenterDev` |
| Friendly name | HVCG Command Center DEV |
| Version in Prod | `1.1.0.1` |
| Managed | True |
| Solution ID | `f3284fd3-fd4a-44a8-bc3a-b6963b8595d5` |
| Package path | `deployment/release-ops/packages/HVCGCommandCenterDev_managed_1.1.0.1.zip` |
| Package SHA-256 | `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf` |
| Import ID | `e58b1d8b-bb80-f111-ab0e-6045bd019b72` |
| Import result | Solution Imported successfully |
| Source RC-1 unmanaged hash | `b08b45bc2aad8605d13a6dbce89eb01895510ae64ab452f2ea050a369f9e3522` |
| Source commit (RC-1) | `0f8d8ebf6542a1ea1ec679b6e382b3e00a366319` |

---

## 5. Connection-reference binding status

**Status:** BOUND (verified via `pac org fetch` on `connectionreference`)

| Logical name | Display | ConnectionId | Connector |
|--------------|---------|--------------|-----------|
| hvcg_sharedsharepointonline | HVCG SharePoint | `f2e0400083e44915828d5bf9f6069a2e` | shared_sharepointonline |
| hvcg_sharedoffice365 | HVCG Outlook | `ac42d3339d4f4841a21f86dade898123` | shared_office365 |
| hvcg_sharedteams | HVCG Teams | `305c5c5e2c80407fac9d5993d54cdae9` | shared_teams |
| hvcg_sharedapprovals | HVCG Approvals | `620037803eda4c06b748ac66e9196c9b` | shared_approvals |

**Note:** Maker UI may show connection reference **Status: Off**. That column is **not** proof of unbound. Trust Dataverse `connectionid`.

Unmanaged config solution used for binding path: **HVCG Production Config** (`HVCGProductionConfig`) · publisher CDS Default Publisher (`crf5954`).

Evidence: `deployment/release-ops/CONNECTION_REFERENCE_MAP.md`

---

## 6. Environment-variable status

Verified via Dataverse fetch (definition + value link-entity):

| Schema | Current Value | Notes |
|--------|---------------|-------|
| hvcg_CommandCenterSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` | Prod |
| hvcg_ClientsSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients` | Prod |
| hvcg_KnowledgeSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge` | Prod |
| hvcg_CrmEnableTeamsNotify | `false` | Gate Off |
| hvcg_EnableClientEmails | `false` | Gate Off |
| hvcg_ExecutiveEmail | `manny@highvaluecapitalgroup.com` | |
| hvcg_OpsEmail | `manny@highvaluecapitalgroup.com` | |
| hvcg_CrmTestRecipient | `manny@highvaluecapitalgroup.com` | |

**INFO:** Definition **DefaultValue** fields still contain `*-Dev` SharePoint URLs. Current **Values** override. Before trusting any flow, confirm flow SharePoint actions use env-var **Value**, not baked Dev defaults.

Settings file: `deployment/release-ops/deploymentSettings-production.PARTIAL.json`

---

## 7. Smoke-test results

### A) Read-only Prod smoke — PASS

| Field | Value |
|-------|-------|
| When | 2026-07-16T02:33:24Z |
| Approval | `APPROVE PROD SMOKE TESTS` |
| Overall | **PASS** (8 PASS · 0 FAIL · 1 INFO) |
| Evidence | `deployment/release-ops/evidence/PROD_SMOKE_READONLY_REPORT.md` |
| JSON | `deployment/release-ops/evidence/prod-smoke-readonly-report.json` |

Scope: identity, solution, connections, env Values, gates, all flows Draft at that time, no sends.

### B) Functional LeadQualified Prod smoke — NOT PASSED

| Field | Value |
|-------|-------|
| Approval | `APPROVE ACTIVATE HVCG_LeadQualifiedCreateOpportunity IN HVCG PRODUCTION` (activation executed) |
| Attempt | Create/qualify lead on Prod Command Center |
| Observed | `PASS create_lead — Id=1` · `PASS qualify_lead` · polls showed `opp=False act=False ok=False fail=False` (no AutomationLogs Started/Succeeded observed in poll window) |
| Result JSON | **Not written** (run interrupted / incomplete) |
| Verdict | **FAIL / INCOMPLETE** — do not claim functional smoke PASS |

---

## 8. Flows currently Draft / Off / Active

Re-verified via Dataverse `workflow` fetch at handoff time:

| Flow | statecode | statuscode |
|------|-----------|------------|
| **HVCG_LeadQualifiedCreateOpportunity** | **Activated** | **Activated** |
| HVCG_OpportunityStageChangedNotify | Draft | Draft |
| HVCG_OpportunityWonCloseout | Draft | Draft |
| HVCG_CapitalFundingStatusNotify | Draft | Draft |
| HVCG_ClientOnboarding | Draft | Draft |
| HVCG_CreateClientWorkspace | Draft | Draft |
| HVCG_CreateDocumentRequests | Draft | Draft |
| HVCG_CreateProjectFromTemplate | Draft | Draft |
| HVCG_DeliverableApproval | Draft | Draft |
| HVCG_ExecutiveDecisionEscalation | Draft | Draft |
| HVCG_MissingDocumentReminders | Draft | Draft |
| HVCG_OverdueTaskEscalation | Draft | Draft |
| HVCG_RenewalReminders | Draft | Draft |
| HVCG_UpdateProjectHealth | Draft | Draft |
| HVCG_WeeklyStatusSummary | Draft | Draft |

**Count:** 1 Activated · 14 Draft  

**Workflow ID (LeadQualified):** `1716e663-153f-5588-af1a-56f3fb9ec2d4`

**Directive for next session:** Do **not** activate any additional flows without a new explicit owner approval phrase naming the exact flow.

---

## 9. Notifications and client-email flags

| Flag | Value | Verified |
|------|-------|----------|
| hvcg_CrmEnableTeamsNotify | `false` | Yes (env var value fetch) |
| hvcg_EnableClientEmails | `false` | Yes (env var value fetch) |

No owner approval has been given to turn these On.

---

## 10. Exact next approval request

Do **not** activate additional flows. LeadQualified is already Activated; functional smoke is not green.

Use this when ready to authorize diagnosis + controlled re-test (still no other flow activation):

```
DEPLOYMENT APPROVAL REQUEST

Action:
Diagnose and re-run functional smoke for HVCG_LeadQualifiedCreateOpportunity in HVCG Production only (fix SharePoint trigger / site binding / list schema gaps; create one more test lead if needed). Do not activate any other flow. Do not enable Teams notify or client emails. Do not import pilot clients. Do not change DNS.

Environment:
HVCG Production
f141a2cf-ae13-eb59-84c4-25817d899105
https://orgee2f7545.crm.dynamics.com/

Package:
HVCGCommandCenterDev 1.1.0.1
Hash 515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf

Scope:
LeadQualified flow + Prod Command Center CRM lists only

Owner steps:
1. Reply with approval phrase below
2. Review resulting evidence JSON/MD from Deployment Engineer
3. Decide GO/NO-GO for LIVE—INTERNAL

Expected result:
Either functional smoke PASS with evidence, or documented root cause + recommended fix (still no extra flows On)

Risk:
Test rows written to Prod SharePoint lists; broken trigger may leave Activated flow idle or erroring

Rollback:
Set HVCG_LeadQualifiedCreateOpportunity back to Draft/Off; delete test list items if required

Estimated duration:
30–90 minutes

Recommendation:
GO for diagnose+retest only

Approval phrase required:
APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE
```

Optional safety approval (if owner prefers flow Off until fixed):

`APPROVE DEACTIVATE HVCG_LeadQualifiedCreateOpportunity IN HVCG PRODUCTION`

---

## 11. Rollback procedure

1. **Immediate:** Set `HVCG_LeadQualifiedCreateOpportunity` to Draft/Off (Dataverse SetState state=0/status=1, or Maker Turn off).  
2. **Solution:** Prefer re-import prior managed version if one exists; for first Prod import, uninstall managed `HVCGCommandCenterDev` only with explicit owner approval.  
3. **Guides:**  
   - `deployment/release-ops/ROLLBACK_RUNBOOK.md`  
   - `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`  
4. **Package anchor:** managed SHA-256 `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf`  
5. **SharePoint:** Test lead Id=1 (and any later smoke rows) may remain on Prod lists — delete only with owner acknowledgment.  
6. **Do not** delete the HVCG Production environment or Prod SharePoint sites without separate owner approval.

---

## 12. Branches, commits, files, evidence

| Item | Value |
|------|-------|
| Agent branch | `cursor/deployment-engineer` |
| Worktree | `.worktrees/deployment-engineer` |
| Agent id | `deployment-engineer` |
| RC-1 source branch | `agent/crm-dev-validation` |
| RC-1 source commit | `0f8d8eb` |

### Key paths (this branch)

- `docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` — this file  
- `deployment/release-ops/` — release ops register, maps, runbooks, evidence, package  
- `deployment/release-ops/packages/HVCGCommandCenterDev_managed_1.1.0.1.zip`  
- `deployment/release-ops/evidence/PROD_SMOKE_READONLY_REPORT.md`  
- `deployment/release-ops/PRODUCTION_ENVIRONMENT_REGISTER.md`  
- `deployment/release-ops/CONNECTION_REFERENCE_MAP.md`  
- `deployment/release-ops/deploymentSettings-production.PARTIAL.json`  
- `deployment/release-ops/production.runtime.json` — PnP runtime (non-secret client id)  
- `releases/RC-1-Development-Baseline/` — frozen RC-1 baseline copy on this branch  

### Agent-comms (main repo `.agent-comms/`)

Notable messages from this workstream (subjects): GL-0 complete; Track1 import complete; Prod smoke readonly PASS. Re-read inbox/outbox for `deployment-engineer` / `master-pm` before acting.

---

## 13. Unresolved risks

1. **Functional smoke not green** while LeadQualified is **Activated** — trigger/site/list binding may be wrong; risk of silent failure or unexpected runs.  
2. **Definition DefaultValues** still contain `*-Dev` URLs — Values override, but flow parameters must be re-checked.  
3. **Partial SharePoint schema** on Prod Command Center — only four CRM lists provisioned; other lookups skipped (Clients, Referrals, etc.).  
4. **Security group = None** — intentional; revisit before adding external makers.  
5. **Maker UI “Status Off”** on connection refs — misleading; do not re-bind blindly.  
6. **Test lead Id=1** left on Prod HVCG_Leads after incomplete smoke — UNKNOWN whether flow ran after interrupt.  
7. **Full Track1 LIVE—INTERNAL** not declared — wait for green functional smoke + QA.  
8. **Pilot import / DNS / canvas / other flows** — all still gated.

---

## 14. Explicit statement — no guessing

No Production identifier, URL, hash, connection ID, flow state, smoke result, SharePoint list inventory, or approval status in this handoff may be invented.  

If a fact is missing here or conflicts with live PAC/Maker/SharePoint, the next Deployment Engineer must **re-query**, record evidence under `deployment/release-ops/evidence/`, and update this handoff.  

**When uncertain: mark UNKNOWN. Do not assume.**

---

## Quick start for next session

1. Register / heartbeat as `deployment-engineer` on `cursor/deployment-engineer`.  
2. `pac auth list` — reuse `HVCG-Dev-Maker`.  
3. `pac env list` — confirm HVCG Production still present.  
4. Re-fetch workflow states for all `HVCG%` flows.  
5. Obtain owner phrase `APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE` before further functional testing.  
6. Do **not** activate any flow that is Draft. Do **not** import clients. Do **not** change DNS.
