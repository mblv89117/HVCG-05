# Operations Hub — Architecture

**Module:** Operations Hub  
**Product:** HVCG OS Command Center  
**Branch:** `cursor/operations-hub`  
**Worktree:** `.worktrees/operations-hub`  
**Packaging:** **Exclusive paths only** — shared indexes are locked forever for this agent  
**Status:** IN PROGRESS (offline package; no tenant deploy from this branch)

## 1. Purpose

Give HVCG operators a single hub for day-to-day run-the-business work:

- Subscriptions and software renewals  
- Vendor contract risk and expirations  
- Recurring expense / approval routing  
- Policy review cadence and SOP currency  
- Operational alerts and weekly digest  

Routine CRM pipeline and CEO decision work stay on CRM / Executive modules.

## 2. Ownership redesign (Master PM)

Effective immediately:

| Path | Ops agent may edit? |
|------|---------------------|
| Exclusive Ops assets below | **Yes** |
| `docs/operations/` | **Yes** |
| `src/power-automate/flows/_index.json` | **No — locked** |
| `src/power-automate/definitions/_index.json` | **No — locked** |
| `src/sharepoint/lists/_index.json` | **No — locked** |
| `src/sharepoint/views/command-center-views.json` | **No — locked** |

Prior shared-index deltas already present on this branch are **pending parent-integration replay only**. Do not add further shared edits. See `SHARED_FILE_RECOMMENDATIONS.md`.

**CONFLICT `51f47dc4`:** closed by Master ownership redesign (exclusive-path plan).

## 3. Exclusive assets (already on branch)

### Power Automate — `HVCG_Ops*` flows + definitions

| Flow | Package | Definition |
|------|---------|------------|
| Approval router | `src/power-automate/flows/HVCG_OpsApprovalRouter.json` | `.../definitions/HVCG_OpsApprovalRouter.definition.json` |
| Expense approval | `src/power-automate/flows/HVCG_OpsExpenseApproval.json` | `.../definitions/HVCG_OpsExpenseApproval.definition.json` |
| Policy review reminders | `src/power-automate/flows/HVCG_OpsPolicyReviewReminders.json` | `.../definitions/HVCG_OpsPolicyReviewReminders.definition.json` |
| Renewal alerts | `src/power-automate/flows/HVCG_OpsRenewalAlerts.json` | `.../definitions/HVCG_OpsRenewalAlerts.definition.json` |
| Weekly digest | `src/power-automate/flows/HVCG_OpsWeeklyDigest.json` | `.../definitions/HVCG_OpsWeeklyDigest.definition.json` |

### SharePoint views (exclusive package)

- `src/sharepoint/views/operations-hub-views.json` — module package (`OperationsHub` v1.0.0), ~20 views across subscriptions, vendors, software, recurring expenses, policies, SOPs, approvals, operational alerts.

### List schema edits exclusive to Ops Hub work

These list JSON files carry Ops Hub field/view-aligned schema deltas on this branch (individual list files remain editable; **lists `_index.json` remains locked**):

| List | Path |
|------|------|
| Approvals | `src/sharepoint/lists/HVCG_Approvals.json` |
| Operational alerts | `src/sharepoint/lists/HVCG_OperationalAlerts.json` |
| Policies | `src/sharepoint/lists/HVCG_Policies.json` |
| Recurring expenses | `src/sharepoint/lists/HVCG_RecurringExpenses.json` |
| SOPs | `src/sharepoint/lists/HVCG_SOPs.json` |
| Software inventory | `src/sharepoint/lists/HVCG_SoftwareInventory.json` |
| Subscriptions | `src/sharepoint/lists/HVCG_Subscriptions.json` |
| Vendors | `src/sharepoint/lists/HVCG_Vendors.json` |

### Power Apps screen stubs

- `src/power-apps/screens/scrOpsHub.md`  
- `src/power-apps/screens/scrHomeOps.md`  

### Environment variable (solution artifact)

- `hvcg_OpsEmail` under `HVCGCommandCenterDev` EnvironmentVariableDefinitions  

## 4. Capability map

```
┌─────────────────────────────────────────────────────────────┐
│                     Operations Hub                          │
│  scrOpsHub · operations-hub-views · HVCG_Ops* flows         │
└────────────────────────────┬────────────────────────────────┘
     ┌───────────┬───────────┼───────────┬───────────┐
     ▼           ▼           ▼           ▼           ▼
 Subscriptions Vendors   Softw/Exp   Policies/SOPs  Approvals
 Renewals      Risk      Recurring   Review cadence Alerts
                         Digest
     └───────────┴───────────┴───────────┴───────────┘
                         ▼
              SharePoint Lists (system of record)
```

## 5. Design principles

1. **Exclusive first** — Ship runnable Ops assets without touching shared indexes.  
2. **Parent replay later** — Index registration / command-center view merge is Integration/parent-only after CRM park.  
3. **Leave CRM alone** — Never interrupt Maker OA / smoke / auth.  
4. **Flows stay Off** until owner Maker import + consent.  
5. **No Prod** from this branch.

## 6. Integration boundaries

| May edit (this agent) | Must not modify |
|-----------------------|-----------------|
| `docs/operations/**` | Locked shared indexes / `command-center-views.json` |
| `HVCG_Ops*` flow + definition JSON | `deployment/**` engines |
| `operations-hub-views.json` | Auth / PnP / `.env*` |
| Ops list JSON listed above | CRM `HVCG_Lead*` / `HVCG_Opportunity*` / `HVCG_Capital*` flows |
| `scrOpsHub.md` / `scrHomeOps.md` | Executive / portal exclusive trees |

Shared-file merge recommendations: `SHARED_FILE_RECOMMENDATIONS.md`.

## 7. Related docs

- `HANDOFF.md` — resume, deliverables, parent next steps  
- `SHARED_FILE_RECOMMENDATIONS.md` — deferred index / view merge plan  
- Root `PROJECT_STATUS.md` / `NEXT_SESSION.md` on this branch (Ops view)
