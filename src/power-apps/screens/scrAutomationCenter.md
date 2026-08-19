# Screen: Automation Center (scrAutomationCenter)

**Module:** Operations / Platform  
**SoR:** Canvas Command Center (specs) — daily UX may later mirror in Elite OS  
**Data:** `HVCG_AutomationRegistry` + `HVCG_AutomationLogs` + inventory JSON seed  
**Audience:** HVCG-Role-Administrator, HVCG-Role-OperationsManager (read for PM; toggle only Admin/Ops)

## Purpose

Usable interface for product automations: inventory, health, run history, errors, retry guidance, and authorized enable/disable tracking. Does **not** silently turn on production client email or Teams — Maker remains the runtime switch; this screen tracks desired state and deep-links to Maker.

## Layout

1. **Header** — “Automation Center” + environment badge (Dev / Test / Prod from `nfEnvironment`) + last refresh  
2. **KPI strip** (not cards-as-decoration — interactive filters): On | Off | Failed/Degraded | Client sends pending approval  
3. **Main gallery** — one row per `HVCG_AutomationRegistry` item  
4. **Detail pane** (selected row) — purpose, trigger, last/next run, owner, failure state, docs link, run history, error, retry, enable control  

## Gallery columns

| Column | Source |
|--------|--------|
| Automation name | `Title` / `FlowName` |
| Purpose | `Purpose` |
| Trigger | `TriggerSummary` |
| Status | `AutomationStatus` |
| Last run | `LastRunAt` |
| Next run | `NextRunAt` |
| Owner | `OwnerEmail` |
| Failure state | `FailureState` |
| Related module | `RelatedModule` |

## Detail pane controls

| Control | Behavior |
|---------|----------|
| `lnkDocumentation` | Open `DocumentationLink` (repo doc or Knowledge page) |
| `galRunHistory` | Filter `HVCG_AutomationLogs` where `FlowName = ThisItem.FlowName`, sort Modified desc, top 20 |
| `lblErrorDetails` | `LastError` + latest Failed log `Message` (redact secrets client-side) |
| `btnRetryGuidance` | Shows formula text: reopen Maker run / wait for next schedule; does **not** invent a second runner |
| `tglEnableDisable` | Visible only if `nfIsAutomationAdmin` **and** `EnableAuthorized=true` **and** environment ≠ Production without Owner gate. On toggle: Patch `AutomationStatus`; notify Admin that Maker On/Off must match. **Never** calls Graph to enable flows from the app in v1. |
| `btnOpenMaker` | Deep link to Power Automate environment (env var `HVCG_POWER_AUTOMATE_MAKER_URL`) |

## Formulas (concept)

```text
nfIsAutomationAdmin =
  nfIsAdministrator || nfIsOperationsManager

nfAutomationRegistry =
  SortByColumns(
    Filter(HVCG_AutomationRegistry, MakerEnvironment = nfEnvironment),
    "FailureState", Descending, "Title", Ascending
  )

nfFailedLogs =
  Filter(
    HVCG_AutomationLogs,
    Status = "Failed" && FlowName = galAutomations.Selected.FlowName
  )
```

## Enable / disable rules

1. Default all rows `AutomationStatus=Off`, `EnableAuthorized=false` until UAT checklist signed.  
2. Client-facing flows (`HVCG_ClientNotificationApproved`, CRM Teams notify) require Owner ticket before `EnableAuthorized=true` in Production.  
3. Toggle in app is **desired-state + audit**, not silent production promotion.  
4. Log toggle to `HVCG_AuditEvents` (Action=`AutomationToggle`).

## Navigation

- From `scrHomeOps`: tile **Automations** → `scrAutomationCenter`  
- From Failed KPI: pre-filter `FailureState in Failed,Degraded`

## Mobile

Stack gallery; hide Maker deep link on phone if URL too long; keep failure filter.

## Non-goals

- Orchestration runtime / ATLAS-R / Service Bus monitors  
- Self-approving production cutover  
- Auto-send of client email from this screen
