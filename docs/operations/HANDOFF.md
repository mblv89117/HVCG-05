# HANDOFF — Operations Hub

**Branch:** `cursor/operations-hub`  
**Worktree:** `.worktrees/operations-hub`  
**Agent:** `operations`  
**Status:** **READY FOR INTEGRATION**  
**Packaging:** Exclusive paths only (Master PM ownership redesign)  
**CONFLICT:** `51f47dc4` closed by redesign — shared indexes locked forever for Ops agent  
**Offline suite:** `python3 tests/operations/run_offline_tests.py` → **PASS**

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
| Offline tests | `tests/operations/run_offline_tests.py`, `test_operations_hub.py` |
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

## Offline validation

```bash
cd .worktrees/operations-hub
python3 tests/operations/run_offline_tests.py
```

Expected: `PASS operations hub module checks`.

## Parent integrator next steps

1. Merge exclusive Ops package after CRM park / when Integration is cleared.  
2. Apply append-only items in `SHARED_FILE_RECOMMENDATIONS.md` (parent-only).  
3. Owner Maker import of `HVCG_Ops*` — leave **Off** until approved.  
4. Never ask Ops agent to edit locked shared indexes.

## Resume cue

Module is **READY FOR INTEGRATION**. Ops agent stays exclusive-path only; Maker import deferred to owner OA.

## Contamination note

Early mixed commit briefly hosted `docs/executive/*` on this branch; dropped in `4da55ae`. Executive SoR remains `cursor/executive-command-center`. Do not re-add Executive docs here.
