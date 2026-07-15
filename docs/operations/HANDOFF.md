# HANDOFF — Operations Hub

**Branch:** `cursor/operations-hub`  
**Worktree:** `.worktrees/operations-hub`  
**Agent:** `operations`  
**Status:** **IN PROGRESS**  
**Packaging:** Exclusive paths only (Master PM ownership redesign)  
**CONFLICT:** `51f47dc4` closed by redesign — shared indexes locked forever for Ops agent

## Deliverables (exclusive)

| Deliverable | Path |
|-------------|------|
| Architecture | `docs/operations/ARCHITECTURE.md` |
| This handoff | `docs/operations/HANDOFF.md` |
| Shared merge recommendations | `docs/operations/SHARED_FILE_RECOMMENDATIONS.md` |
| Ops flows (5) | `src/power-automate/flows/HVCG_Ops*.json` |
| Ops definitions (5) | `src/power-automate/definitions/HVCG_Ops*.definition.json` |
| Ops views package | `src/sharepoint/views/operations-hub-views.json` |
| Ops list schema deltas | `HVCG_{Approvals,OperationalAlerts,Policies,RecurringExpenses,SOPs,SoftwareInventory,Subscriptions,Vendors}.json` |
| Screen stubs | `src/power-apps/screens/scrOpsHub.md`, `scrHomeOps.md` |
| Branch status | `PROJECT_STATUS.md`, `NEXT_SESSION.md` |

## Exclusive assets already present

Confirmed on branch tip relative to merge-base `b75b19b`:

- All five `HVCG_Ops*` flow packages + definitions  
- `operations-hub-views.json` (new exclusive views package)  
- Exclusive Ops list schema edits (8 lists above)  
- Docs package under `docs/operations/`

## Intentionally not touched (locked)

- `src/power-automate/flows/_index.json`  
- `src/power-automate/definitions/_index.json`  
- `src/sharepoint/lists/_index.json`  
- `src/sharepoint/views/command-center-views.json`  
- `deployment/**` engines  
- CRM Maker OA / smoke / auth paths  
- Production  

## Deferred to parent integration replay

Shared-index deltas already sitting on `cursor/operations-hub` (from earlier mixed work) must **not** be edited further by Ops. Parent/Integration replay after CRM park should:

1. Register `HVCG_Ops*` in flow + definition indexes (append-only).  
2. Register Ops list title deltas in `lists/_index.json` if still missing upstream.  
3. Optionally merge unique titles from `operations-hub-views.json` into `command-center-views.json` (prefer keeping both files).  

Details: `SHARED_FILE_RECOMMENDATIONS.md`.

## Do not require post-CRM change window (Ops)

**No** further Ops-owned shared change window is required. Exclusive-path plan is sufficient. Index appends are parent-only recommendations after CRM smoke park.

## Resume cue (next Ops work)

1. Keep heartbeat `IN_PROGRESS`.  
2. Harden exclusive docs / offline checks if requested.  
3. Maker import of `HVCG_Ops*` only after owner OA + CRM park — leave flows **Off**.  
4. Never re-open locked shared files.

## Contamination note

Early mixed commit briefly hosted `docs/executive/*` on this branch; dropped in `4da55ae`. Executive SoR remains `cursor/executive-command-center`. Do not re-add Executive docs here.
