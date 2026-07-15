# Shared file recommendations (do not apply on this branch)

Operations Hub owns exclusive paths:

- `docs/operations/`  
- `src/power-automate/flows/HVCG_Ops*.json`  
- `src/power-automate/definitions/HVCG_Ops*.definition.json`  
- `src/sharepoint/views/operations-hub-views.json`  
- Ops-aligned list JSON under `src/sharepoint/lists/HVCG_{Approvals,OperationalAlerts,Policies,RecurringExpenses,SOPs,SoftwareInventory,Subscriptions,Vendors}.json`  
- `src/power-apps/screens/scrOpsHub.md`, `scrHomeOps.md`  

When integrating, a **parent merge agent** may apply the following. This agent does **not** modify locked shared files (Master PM redesign — forever for Operations).

## Prior shared-index deltas → parent replay later

Branch `cursor/operations-hub` already contains historical diffs vs merge-base `b75b19b` on locked files (~496 insertions across four indexes/views). Treat those diffs as **pending parent-integration replay after CRM park**, not as Ops continuing work:

| Locked file | Why it appeared | Parent action |
|-------------|-----------------|---------------|
| `src/power-automate/flows/_index.json` | Earlier Ops registered `HVCG_Ops*` entries | Replay append-only `HVCG_Ops*` registrations if missing upstream; discard non-Ops churn |
| `src/power-automate/definitions/_index.json` | Same for Ops definitions | Same — append-only Ops definition entries |
| `src/sharepoint/lists/_index.json` | Ops list title/schema index sync | Replay Ops list index rows only; do not overwrite CRM/AI/Finance rows |
| `src/sharepoint/views/command-center-views.json` | Earlier attempt to publish Ops views into shared file | Prefer **keeping** exclusive `operations-hub-views.json`; optionally merge unique `(list, title)` pairs after dedupe |

**Do not** ask Operations to re-edit these files. CONFLICT `51f47dc4` is closed by ownership redesign.

## Recommended parent-only appends

| Shared file | Recommendation |
|-------------|----------------|
| `src/power-automate/flows/_index.json` | Append entries for: `HVCG_OpsApprovalRouter`, `HVCG_OpsExpenseApproval`, `HVCG_OpsPolicyReviewReminders`, `HVCG_OpsRenewalAlerts`, `HVCG_OpsWeeklyDigest` (state Off / Dev only). |
| `src/power-automate/definitions/_index.json` | Append matching `.definition.json` paths for the five Ops flows. |
| `src/sharepoint/lists/_index.json` | Ensure index rows exist for Ops lists above if absent after CRM park merge. |
| `src/sharepoint/views/command-center-views.json` | Optional: merge unique titles from `operations-hub-views.json` after dedupe by `(list, title)`. Prefer provisioning both view packages. |
| `tests/Invoke-HVCGPreDeploymentTests.ps1` | Optional append-only: invoke future `tests/operations/` offline runner if added. |
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
