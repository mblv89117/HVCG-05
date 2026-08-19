# Executive Dashboard Automation Release Package

**Package ID:** `ATLAS-AUTO-EXEC-DASH-1.0`  
**Version:** 1.0.0  
**Date:** 2026-07-20  
**Audience:** Deployment Manager · QA & Release  
**Prepared by:** Automation Product Team (`automation`)  
**Branch:** `cursor/orchestration-sprint12`  
**Companion:** [`AUTOMATION_HEALTH_REPORT.md`](AUTOMATION_HEALTH_REPORT.md) · machine manifest [`../../src/power-automate/inventory/EXEC_DASHBOARD_RELEASE_PACKAGE.json`](../../src/power-automate/inventory/EXEC_DASHBOARD_RELEASE_PACKAGE.json)

---

## Package declaration

| Field | Value |
|-------|-------|
| Release name | Executive Dashboard Automation |
| Environment target (first) | **HVCG Development** only |
| Production | **Blocked** until QA issues **GO** and Owner approves |
| Client-facing automations | **Do not deploy** until QA GO |
| Service account | **HVCG Ops Automation** |
| Automation agent posture after publish | Monitoring standby — responds only to Master PM, QA, Deployment Manager |

This package ships **repo scaffolds + runbooks**. It does not turn flows On in Maker.

---

## 1. Active production-ready automations (Release Candidates)

Repo production criteria met (owner, documentation, retry, error handling, notifications, audit, connection references, environment variables). **Maker UAT = No. QA GO = No. Prod On = No.**

| # | Flow | Role | Path |
|---|------|------|------|
| 1 | `HVCG_TaskDueSoonReminders` | Task reminders | `src/power-automate/flows/` |
| 2 | `HVCG_OverdueTaskEscalation` | Overdue escalations | `flows/` |
| 3 | `HVCG_DeliverableApproval` | Approval routing | `flows/` + `definitions/` |
| 4 | `HVCG_ApprovalOutcomeNotify` | Approval outcomes | `flows/` + `definitions/` |
| 5 | `HVCG_ChangeRequestIntake` | Change-request approval routing | `flows/` + `definitions/` |
| 6 | `HVCG_CreateDocumentRequests` | Document request creation | `flows/` + `definitions/` |
| 7 | `HVCG_MissingDocumentReminders` | Missing-document reminders | `flows/` + `definitions/` |
| 8 | `HVCG_ExecutiveWeeklyBrief` | Executive Brief generation | `src/power-automate/executive/` |
| 9 | `HVCG_ExecutiveDecisionEscalation` | Executive escalation / queue feed | `flows/` |
| 10 | `HVCG_ProjectStatusReminder` | Project status notifications | `flows/` + `definitions/` |
| 11 | `HVCG_UpdateProjectHealth` | Project health (feeds Exec tiles) | `flows/` |
| 12 | `HVCG_WeeklyStatusSummary` | Ops weekly digest (**not** exec KPI) | `flows/` |

**Activation order (Dev, after QA dry-run plan):**  
`UpdateProjectHealth` → `OverdueTaskEscalation` → `TaskDueSoonReminders` → `CreateDocumentRequests` / `MissingDocumentReminders` → approval trio → `ExecutiveDecisionEscalation` (test mailbox) → `ProjectStatusReminder` / `WeeklyStatusSummary` → **`ExecutiveWeeklyBrief` last** (Owner content sign-off).

---

## 2. Deferred automations (Supporting — not in Exec activation set)

Keep Off for this release unless Master PM expands scope.

| Flow | Why deferred |
|------|----------------|
| `HVCG_AutomationFailureDigest` | Monitoring support — enable in Dev after first RC smoke (recommended), not required for dashboard UI |
| `HVCG_PaymentPastDueAlert` | Feeds Finance / Exec AR signals — enable after RC core smoke |
| `HVCG_RenewalReminders` | Revenue Systems — out of Exec Dashboard critical path |
| `HVCG_ClientOnboarding` | Ops / portal — out of Exec critical path |
| `HVCG_CreateClientWorkspace` | Child of onboarding |
| `HVCG_CreateProjectFromTemplate` | Child of onboarding |

---

## 3. Archived automations

Location: `src/power-automate/archive/exec-dashboard-deferred/`  
Manifest: `ARCHIVE_MANIFEST.json`

| Flow | Reason archived |
|------|-----------------|
| `HVCG_StaleOpportunityAlert` | Unused for Exec release |
| `HVCG_MeetingPrepAndFollowUp` | Speculative; not required |
| `HVCG_CapitalReadinessAlert` | Speculative; capital notify blocked with CRM |
| `HVCG_ClientNotificationApproved` | Client-facing — blocked until QA GO |

Do **not** import archived flows into Production.

---

## 4. Blocked automations

| Flow | Block reason |
|------|----------------|
| `HVCG_LeadQualifiedCreateOpportunity` | CRM Off — separate CRM Owner/QA path |
| `HVCG_OpportunityStageChangedNotify` | CRM Off; Teams gated |
| `HVCG_OpportunityWonCloseout` | CRM Off |
| `HVCG_CapitalFundingStatusNotify` | CRM / Capital Off |

Do **not** enable for Executive Dashboard release.

---

## 5. Required dependencies

| Dependency | Detail |
|------------|--------|
| Power Platform environment | **HVCG Development** (first) |
| SharePoint site | Command Center Dev site URL |
| Service account | HVCG Ops Automation (flow owner + connections) |
| Solution / packaging | Build sheets + definition scaffolds; optional `HVCGCommandCenterDev` Workflows for platform subset |
| Canvas / Exec UI | `scrHomeExec` + Automation Center spec (`scrAutomationCenter`) — data plane independent of flow On |
| Power BI | `HVCG_CEO_Command` / Exec KPIs read **lists**, not live flow state |
| Schema repair | CRM/list columns present for docs, approvals, tasks, projects, automation logs |
| Registry seed | `python3 scripts/automation/seed-automation-registry.py` after list provision |
| QA | Review this package; issue GO before Production |
| Owner | Approve executive brief content + any external/Teams notify |

---

## 6. Required environment variables

| Variable | Required for | Dev default |
|----------|--------------|-------------|
| `HVCG_SITE_URL` / `hvcg_CommandCenterSiteUrl` | All SP flows | Command Center Dev URL |
| `HVCG_OPS_EMAIL` / `hvcg_OpsEmail` | Failure + ops digests | Ops / test UPN |
| `HVCG_EXECUTIVE_EMAIL` / `hvcg_ExecutiveEmail` | Exec brief + escalation | Owner test UPN |
| `HVCG_EXEC_ENABLE_EMAIL_DIGEST` | `HVCG_ExecutiveWeeklyBrief` send gate | **`false`** |
| `HVCG_ENABLE_CLIENT_EMAILS` / `hvcg_EnableClientEmails` | Any client path | **`false`** |
| `HVCG_CLIENTS_HUB_URL` | Overdue / workspace-related | Clients Dev site |
| `HVCG_CRM_ENABLE_TEAMS_NOTIFY` | Blocked CRM only | **`false`** (do not set true) |
| `HVCG_POWER_AUTOMATE_MAKER_URL` | Automation Center deep link | Maker env URL |

---

## 7. Required connection references

Create under **HVCG Ops Automation** (never personal Owner account in Production):

| Logical / display | Connector | Used by release set |
|-------------------|-----------|---------------------|
| `hvcg_sharedsharepointonline` / HVCG SharePoint | SharePoint | All |
| `hvcg_sharedoffice365` / HVCG Outlook | Office 365 Outlook | Brief, digests, failure notify, reminders |
| `hvcg_sharedapprovals` / HVCG Approvals | Approvals | DeliverableApproval, ChangeRequestIntake |
| `hvcg_sharedteams` / HVCG Teams | Microsoft Teams | Only if overdue/escalation Teams steps used; **not** for CRM notify in this release |

See `src/power-automate/connection-references/README.md`.

---

## 8. Required SharePoint lists

| List | Role |
|------|------|
| `HVCG_AutomationLogs` | Audit / run history (mandatory) |
| `HVCG_AutomationRegistry` | Automation Center catalog |
| `HVCG_Notifications` | Reminder / digest rows |
| `HVCG_OperationalAlerts` | Repeated failure alerts |
| `HVCG_AuditEvents` | Business audit (approvals outcomes) |
| `HVCG_Tasks` | Due-soon / overdue |
| `HVCG_Deliverables` | Approval routing |
| `HVCG_Approvals` | Approval records |
| `HVCG_ChangeRequests` | Change intake |
| `HVCG_DocumentRequests` | Document requests / missing docs |
| `HVCG_Projects` | Health + status reminders |
| `HVCG_Clients` | Escalation / health signals |
| `HVCG_Decisions` / items with `RequiresExecutiveAttention` | Executive escalation |
| `HVCG_FinancialMilestones` | Optional PaymentPastDueAlert (deferred) |

Views: Failed Last 24h, Skipped Duplicates, Registry Failed/Degraded — `src/sharepoint/views/command-center-views.json`.

---

## 9. Required Dataverse tables

**None required for this automation release package.**

Executive Dashboard / Elite OS may read Dataverse `hvcg_atlas*` for Atlas ops admin surfaces, but **Exec Dashboard automation scaffolds target SharePoint Command Center lists**. Do not block this package on Dataverse table deployment.

| Optional (out of scope) | Note |
|-------------------------|------|
| `hvcg_atlas*` approvals / briefs / KPIs | Elite OS / model-driven — separate Power Platform track |

---

## 10. Required approvals

| Gate ID | Approver | Before |
|---------|----------|--------|
| `QA-GO-AUTO-EXEC-1` | QA & Release | Any Production On; any non-Dev enablement of release candidates |
| `OWNER-BRIEF-1` | Owner (Manny) | `HVCG_ExecutiveWeeklyBrief` email content / `HVCG_EXEC_ENABLE_EMAIL_DIGEST=true` |
| `OWNER-EXT-1` | Owner | Any client-facing or company Teams notify (archived/blocked paths) |
| `DM-IMPORT-1` | Deployment Manager | Maker import into shared Dev/Test/Prod environments |
| `OA-CRM-*` | Ops / Owner | Blocked CRM flows only (not this release) |

**Automation agent will not self-approve or promote to Production.**

---

## 11. Rollback procedure

1. **Immediate:** In Maker, **Turn Off** the failing flow(s). Prefer Off over delete.  
2. **Flags:** Set `HVCG_EXEC_ENABLE_EMAIL_DIGEST=false`, `HVCG_ENABLE_CLIENT_EMAILS=false`.  
3. **Registry:** Patch `HVCG_AutomationRegistry.AutomationStatus=Off`, `FailureState=Failed` for affected rows.  
4. **Alerts:** Close or acknowledge `HVCG_OperationalAlerts` after mitigation.  
5. **Data:** Do **not** purge `HVCG_AutomationLogs` (audit). Reverse business data only with Ops/Owner (e.g. erroneous task creates).  
6. **Idempotency:** Re-enable later; expect `SkippedDuplicate` on already-applied keys.  
7. **Package rollback:** Redeploy prior build sheets from git tag/commit; do not re-import archived client notify without new assignment.  
8. **Communicate:** Notify Master PM, QA, Deployment Manager with RunId + FlowName.

---

## 12. Smoke-test checklist

**Environment:** HVCG Development · synthetic data only · flags false unless noted.

| # | Test | Expected | Pass |
|---|------|----------|------|
| S1 | Import one RC flow; connections resolve | Save succeeds; flow **Off** | ☐ |
| S2 | `UpdateProjectHealth` On → run once | AutomationLogs Started/Succeeded; project health updated | ☐ |
| S3 | Create past-due open task → `OverdueTaskEscalation` | IsOverdue; owner notify; log Success | ☐ |
| S4 | Task due in 2 days → `TaskDueSoonReminders` | Owner reminder; SkippedDuplicate on re-run same day | ☐ |
| S5 | Deliverable → Internal Review → `DeliverableApproval` | Approvals row; approver notified | ☐ |
| S6 | Approve item → `ApprovalOutcomeNotify` | Requester notified; audit event | ☐ |
| S7 | ChangeRequest Submitted → `ChangeRequestIntake` | Approval routed | ☐ |
| S8 | Child/manual `CreateDocumentRequests` | Doc request rows; idempotent re-run | ☐ |
| S9 | Open doc request → `MissingDocumentReminders` | Reminder cadence; **no** client email (flag false) | ☐ |
| S10 | Set `RequiresExecutiveAttention` (test item) → escalation | Owner test mailbox only; 24h dedupe | ☐ |
| S11 | `ProjectStatusReminder` / `WeeklyStatusSummary` | Ops recipients only; **no** Owner KPI brief from WeeklyStatus | ☐ |
| S12 | `ExecutiveWeeklyBrief` dry-run with digest flag **false** | Logs Success; **no** email | ☐ |
| S13 | Intentional fault | Failed log + Ops failure notify | ☐ |
| S14 | Automation Center / Failed view | Failed row visible | ☐ |
| S15 | Confirm CRM×4 and archived flows **Off** / not imported | No CRM/Teams prod posts | ☐ |

QA signs smoke results before `QA-GO-AUTO-EXEC-1`.

---

## 13. Monitoring dashboard

| Surface | What to watch |
|---------|----------------|
| SharePoint view **AutomationLogs — Failed Last 24h** | Failures by FlowName |
| SharePoint view **AutomationRegistry — Failed or Degraded** | Desired-state health |
| Power Apps **scrAutomationCenter** | Name, status, last/next run, errors, docs (when canvas wired) |
| Ops Home tile **Automations failed/degraded** | Entry point |
| Power BI System Health — Automation page | Failed flow rate (spec: `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`) |
| Maker run history | RunId match to logs |

Threshold guidance (System Health): rolling 24h automation fails warn >5, critical >20.

---

## 14. Alert routing

| Condition | Route | Channel |
|-----------|-------|---------|
| Single flow stage failure | `HVCG_OPS_EMAIL` / Admin group | Outlook (`FLOW FAILED: {FlowName}`) |
| Repeated failures (≥3 / window) | Ops + `HVCG_OperationalAlerts` | `HVCG_AutomationFailureDigest` (when enabled) |
| Executive escalation item | `HVCG_EXECUTIVE_EMAIL` | `HVCG_ExecutiveDecisionEscalation` only |
| Executive weekly brief | Owner only | Brief flow; flag-gated |
| Client / external | **None in this package** | Blocked / archived |
| Security / data incident | Owner + Admin | SOP Security Incident — not automation self-heal |

---

## 15. Known risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Scaffolds ≠ live Maker definitions | High | DM import + QA smoke before On |
| Accidental dual Monday emails | Medium | WeeklyStatus = ops only; Brief = Owner KPI |
| Enabling CRM/Teams during Exec release | High | Blocked set; flags false |
| Client email leak | Critical | Archived client notify; flag false |
| Exec UI stale vs slow automations | Medium | Document refresh; health daily |
| Personal account as flow owner | High | Enforce service account |
| Self-approval to Production | Critical | QA GO + Owner only |

---

## 16. Recovery procedures

| Scenario | Recovery |
|----------|----------|
| Flow failing repeatedly | Off flow → fix connection/data → clear alert → On → confirm SkippedDuplicate/Success |
| Wrong recipient emailed | Off flow → flag false → notify Owner → document in Issues → do not re-send automatically |
| Duplicate tasks/docs created | Prefer idempotency; delete duplicates by IdempotencyKey pattern with Ops approval |
| Registry out of sync | Re-run seed script; Patch status from Maker reality |
| Lost Maker flow | Rebuild from `flows/*.json` + `definitions/*.definition.json` |
| Site URL pointed at wrong env | Off all → fix env vars/connection → smoke in Dev only |
| Full package abort | Section 11 Rollback; notify Master PM / QA / DM |

---

## Deployment Manager — import checklist

1. Confirm package version `ATLAS-AUTO-EXEC-DASH-1.0` on branch  
2. Provision lists (§8) + seed AutomationRegistry  
3. Create connection references (§7) as service account  
4. Set env vars (§6) with safe defaults  
5. Import **Release Candidates only** (§1); leave Off  
6. Do **not** import Archived (§3) or enable Blocked (§4)  
7. Hand smoke checklist (§12) to QA  
8. Await `QA-GO-AUTO-EXEC-1` before Test/Prod  

---

## QA — sign-off block

| Item | Result | Initials / date |
|------|--------|-----------------|
| Smoke S1–S15 | ☐ Pass / ☐ Fail | |
| No client-facing deploy | ☐ Confirmed | |
| CRM blocked remain Off | ☐ Confirmed | |
| Monitoring views usable | ☐ Confirmed | |
| **QA-GO-AUTO-EXEC-1** | ☐ GO / ☐ NO-GO | |

---

## Artifact index

| Artifact | Path |
|----------|------|
| This package | `docs/automation/EXEC_DASHBOARD_AUTOMATION_RELEASE_PACKAGE.md` |
| Machine manifest | `src/power-automate/inventory/EXEC_DASHBOARD_RELEASE_PACKAGE.json` |
| Health report | `docs/automation/AUTOMATION_HEALTH_REPORT.md` |
| Inventory | `src/power-automate/inventory/automation-inventory.json` |
| Flow index | `src/power-automate/flows/_index.json` |
| Archive | `src/power-automate/archive/exec-dashboard-deferred/` |
| Exec flow contract | `docs/executive/FLOW_INTEGRATION.md` |

---

**Published.** Automation enters monitoring mode. Further automation invention requires Master PM assignment.
