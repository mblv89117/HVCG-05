# HANDOFF — Executive Command Center

**Branch:** `cursor/executive-command-center`  
**Module version:** 1.0.0  
**Packaging:** Option A — exclusive paths; shared merges via recommendation  
**Offline status:** PASS (`python3 tests/executive/run_offline_tests.py`)

## What shipped

| Area | Location |
|------|----------|
| Architecture / data map / KPIs / screens | `docs/executive/` |
| SharePoint views (isolated) | `src/sharepoint/views/executive-views.json` |
| Power Apps specs + components + formulas | `src/power-apps/executive/`, `src/power-apps/formulas/ExecutiveNamedFormulas.fx` |
| Power BI CEO package | `src/power-bi/executive/` |
| Weekly brief scaffold (default **Off**) | `src/power-automate/executive/` |
| Permissions / Copilot / escalation / flow contracts | `PERMISSIONS.md`, `COPILOT_EXECUTIVE.md`, `ESCALATION_INTEGRATION.md`, `FLOW_INTEGRATION.md` |
| Seed / fixtures | `sample-data/executive/` |
| Offline tests | `tests/executive/`, `tests/unit/test_executive_command_center.py` |
| Shared merge guide | `docs/executive/SHARED_FILE_RECOMMENDATIONS.md` |

## Intentionally not changed

- `deployment/**` engines  
- Authentication / `.env*` / environment configs  
- CRM flow JSON (`HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*`) and Maker smoke packages  
- Shared `flows/_index.json` / definition indexes (weekly brief stays module-local)  
- Shared `command-center-views.json` and `NamedFormulas.fx` (recommendations only)

## Parent integrator next

1. Confirm offline PASS on this branch.  
2. Apply append-only merges from `SHARED_FILE_RECOMMENDATIONS.md`.  
3. Re-run full predeploy suite on the integration branch.  
4. Owner Maker / Power BI steps per `OWNER_ACTION_GUIDE.md` and `SMOKE_TEST_CHECKLIST.md` (Dev only).

## Contaminations cleared on this worktree

- Removed untracked Portal / Data Room flow stubs that appeared while another agent shared disk — see SHARED recommendations.

## Resume

Continue only under Option A exclusive paths. Do not wait on CRM smoke for further ECC doc/spec work.
