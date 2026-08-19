# Automation Inventory — Project Atlas

**Owner:** Automation Product Team (`automation`)  
**Mission:** Executive Dashboard release support  
**Service account:** HVCG Ops Automation  
**Health report:** [`AUTOMATION_HEALTH_REPORT.md`](AUTOMATION_HEALTH_REPORT.md)  
**Machine catalog:** [`src/power-automate/inventory/automation-inventory.json`](../../src/power-automate/inventory/automation-inventory.json)  
**Updated:** 2026-07-20

Do not invent new automations unless Master PM assigns. Client-facing flows require QA GO.

## Release-required coverage

| Priority | Automations | Status |
|----------|-------------|--------|
| Task reminders | `HVCG_TaskDueSoonReminders` | ReleaseCandidate |
| Approval routing | `HVCG_DeliverableApproval`, `HVCG_ApprovalOutcomeNotify`, `HVCG_ChangeRequestIntake` | ReleaseCandidate |
| Overdue escalations | `HVCG_OverdueTaskEscalation` | ReleaseCandidate |
| Document requests | `HVCG_CreateDocumentRequests`, `HVCG_MissingDocumentReminders` | ReleaseCandidate |
| Executive Brief generation | `HVCG_ExecutiveWeeklyBrief`, `HVCG_ExecutiveDecisionEscalation` | ReleaseCandidate |
| Project status notifications | `HVCG_ProjectStatusReminder`, `HVCG_UpdateProjectHealth`, `HVCG_WeeklyStatusSummary` (ops only) | ReleaseCandidate |

## Archived (not active)

See `src/power-automate/archive/exec-dashboard-deferred/` — stale-opp, meeting prep, capital readiness alert, client notification approved.

## Standard fields on every active build sheet

- `owner`, `documentationLink`, `errorHandling` (retry ≤3 + Ops notify)
- `auditHistory` / `logging` → `HVCG_AutomationLogs`
- `connectionReferences`, `environmentVariables`
- `rollbackOrDisable`, `productionChecklist`, `usedByModules`
- `defaultState: Off` until Maker UAT + QA GO

## Permissions

- Runtime: HVCG Ops Automation connection references  
- Production On: Owner + QA GO only (Automation agent does not self-approve)
