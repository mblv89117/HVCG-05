# Automation Center

**Screen spec:** [`src/power-apps/screens/scrAutomationCenter.md`](../../src/power-apps/screens/scrAutomationCenter.md)  
**List:** `HVCG_AutomationRegistry`  
**Logs:** `HVCG_AutomationLogs`  
**Seed:** `python3 scripts/automation/seed-automation-registry.py`

## What operators see

| Field | Source |
|-------|--------|
| Automation name | Registry `Title` / `FlowName` |
| Purpose | `Purpose` |
| Trigger | `TriggerSummary` |
| Status | `AutomationStatus` (Off/On/Paused/Error/ScaffoldOnly) |
| Last run | `LastRunAt` (updated from logs or Maker) |
| Next run | `NextRunAt` |
| Owner | `OwnerEmail` |
| Failure state | `FailureState` |
| Related module | `RelatedModule` |
| Enable/disable | Toggle when `EnableAuthorized` and Admin/Ops — desired state only in v1 |
| Run history | Filtered `HVCG_AutomationLogs` |
| Error details | `LastError` + Failed log Message |
| Retry | Guidance to Maker re-run / next schedule (idempotent) |
| Documentation | `DocumentationLink` |

## SharePoint views (triage without app)

- AutomationLogs → **Failed Last 24h**, **Skipped Duplicates**
- AutomationRegistry → **Enabled Automations**, **Failed or Degraded**
- Notifications → **Client Sends Awaiting Approval**

## Ops Home entry

`scrHomeOps` tile **Automations failed/degraded** → `scrAutomationCenter`.

## Security

- No silent client send from the Center
- Production enablement remains Owner-gated
- Connection references stay on service account
