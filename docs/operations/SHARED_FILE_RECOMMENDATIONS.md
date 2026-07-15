# Shared file recommendations (do not apply on this branch)

Operations Hub owns exclusive paths:

- `docs/operations/`  
- `src/power-automate/flows/HVCG_Ops*.json`  
- `src/power-automate/definitions/HVCG_Ops*.definition.json`  
- `src/sharepoint/views/operations-hub-views.json`  
- Ops-aligned list JSON under `src/sharepoint/lists/HVCG_{Approvals,OperationalAlerts,Policies,RecurringExpenses,SOPs,SoftwareInventory,Subscriptions,Vendors}.json`  
- `src/power-apps/screens/scrOpsHub.md`, `scrHomeOps.md`  

When integrating, a **parent merge agent** may apply the following. This agent does **not** modify locked shared files (Master PM redesign — forever for Operations).

## DEF-QA-001 cleared (Plan B) — 2026-07-15

Ops tip **restored** these four locked files to pre-ops baseline `b75b19b` (merge-base with main/intelligence tip). Branch tip no longer carries shared-index deltas. Ops will **never** re-edit these four after restore.

| Locked file | Tip state after restore |
|-------------|-------------------------|
| `src/power-automate/flows/_index.json` | Identical to `b75b19b` |
| `src/power-automate/definitions/_index.json` | Identical to `b75b19b` |
| `src/sharepoint/lists/_index.json` | Identical to `b75b19b` |
| `src/sharepoint/views/command-center-views.json` | Identical to `b75b19b` |

Exclusive package retained: `HVCG_Ops*`, `operations-hub-views.json`, `docs/operations/`, Ops list schemas.

## Parent-replay deltas (must apply after CRM park; not on Ops branch)

Source of truth for view content: exclusive `operations-hub-views.json` (20 views). Index/list rows below were previously on tip `a73929d` and were **stripped** by DEF-QA-001 restore.

### `src/power-automate/flows/_index.json`

Append-only (if missing upstream), `module: OperationsHub`, `packageVersion: 1.0.0`, `defaultState: Off`:

| flowName | path |
|----------|------|
| `HVCG_OpsRenewalAlerts` | `src/power-automate/flows/HVCG_OpsRenewalAlerts.json` |
| `HVCG_OpsExpenseApproval` | `src/power-automate/flows/HVCG_OpsExpenseApproval.json` |
| `HVCG_OpsPolicyReviewReminders` | `src/power-automate/flows/HVCG_OpsPolicyReviewReminders.json` |
| `HVCG_OpsWeeklyDigest` | `src/power-automate/flows/HVCG_OpsWeeklyDigest.json` |
| `HVCG_OpsApprovalRouter` | `src/power-automate/flows/HVCG_OpsApprovalRouter.json` |

### `src/power-automate/definitions/_index.json`

Append matching definition entries for the five Ops flows above (same metadata). Bump `count` by +5 only if those entries are newly added.

### `src/sharepoint/lists/_index.json`

Update **columnCount** only for Ops-aligned lists after schemas merge (do not rewrite CRM/AI/Finance rows; do not flip Unicode dashes):

| list | baseline `columnCount` (`b75b19b`) | Ops schema tip `columnCount` |
|------|-------------------------------------|------------------------------|
| `HVCG_Approvals` | 10 | 14 |
| `HVCG_OperationalAlerts` | 12 | 13 |
| `HVCG_Policies` | 8 | 12 |
| `HVCG_RecurringExpenses` | 8 | 13 |
| `HVCG_SOPs` | 11 | 14 |
| `HVCG_SoftwareInventory` | 10 | 15 |
| `HVCG_Subscriptions` | 9 | 16 |
| `HVCG_Vendors` | 10 | 15 |

### `src/sharepoint/views/command-center-views.json`

**Prefer** provisioning exclusive `operations-hub-views.json` as-is. Optional later: merge unique `(list, title)` pairs after dedupe. Stripped Ops view pairs (now exclusive-only):

- `HVCG_Subscriptions` / Renewals Next 60 Days, Active Subscriptions  
- `HVCG_Vendors` / Contracts Expiring 90 Days, High Risk Vendors  
- `HVCG_SoftwareInventory` / Software Renewals Upcoming, Active Software  
- `HVCG_Policies` / Policies Due for Review, Active Policies  
- `HVCG_SOPs` / SOPs Due for Review, Active SOPs  
- `HVCG_RecurringExpenses` / Expenses Due 30 Days, Pending Expense Approvals  
- `HVCG_Approvals` / Ops Pending Approvals  
- `HVCG_OperationalAlerts` / Ops Open Alerts  
- `HVCG_InternalProjects` / Active Internal Projects, Blocked Internal Projects  
- `HVCG_MeetingPlaybooks` / Active Playbooks  
- `HVCG_SalesScripts` / Active Scripts  
- `HVCG_TrainingCatalog` / Active Training, Required Training  

## Recommended parent-only appends (summary)

| Shared file | Recommendation |
|-------------|----------------|
| `src/power-automate/flows/_index.json` | Append five `HVCG_Ops*` entries (table above). |
| `src/power-automate/definitions/_index.json` | Append matching `.definition.json` paths; adjust `count`. |
| `src/sharepoint/lists/_index.json` | Sync Ops `columnCount` rows only after CRM park. |
| `src/sharepoint/views/command-center-views.json` | Optional merge from `operations-hub-views.json`; prefer dual provisioning. |
| `tests/Invoke-HVCGPreDeploymentTests.ps1` | Optional append-only: invoke `tests/operations/` offline runner. |
| Root / docs architecture maps | Link `docs/operations/ARCHITECTURE.md` under capability map. |

## Exclusive assets already exist (no shared edit required to keep building)

| Asset class | Locations |
|-------------|-----------|
| Ops flows | `src/power-automate/flows/HVCG_Ops{ApprovalRouter,ExpenseApproval,PolicyReviewReminders,RenewalAlerts,WeeklyDigest}.json` |
| Ops definitions | Matching files under `src/power-automate/definitions/` |
| Ops views package | `src/sharepoint/views/operations-hub-views.json` |
| Ops list edits | Eight list JSON files listed above |
| Docs | `docs/operations/{ARCHITECTURE,HANDOFF,SHARED_FILE_RECOMMENDATIONS}.md` |

## Do not touch (explicit)

- Locked shared indexes / `command-center-views.json` from Ops agent  
- `deployment/**` install/upgrade/rollback engines  
- Auth / PnP / `.env*`  
- CRM flows `HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*` and active Maker OA packages  
- Executive exclusive tree (`docs/executive/`, `executive-views.json`)  
- Production environment configs  

## Change-window answer

**Post-CRM Ops change window for shared indexes: not required.** Exclusive-path plan covers continuing Ops work. Parent integration replay is sufficient for index/view registration.

**DEF-QA-001:** cleared by restore-to-`b75b19b` on the four locked files only.
