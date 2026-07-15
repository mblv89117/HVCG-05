# HANDOFF — Executive Command Center

**Branch:** `cursor/executive-command-center`  
**Module version:** 1.0.0  
**Packaging:** Option A — exclusive paths; shared merges via recommendation  

## What shipped

| Area | Location |
|------|----------|
| Architecture / plan / KPIs | `docs/executive/` |
| SharePoint views (isolated) | `src/sharepoint/views/executive-views.json` |
| Power Apps specs + formulas | `src/power-apps/executive/` |
| Power BI CEO package | `src/power-bi/executive/` |
| Weekly brief scaffold (Off) | `src/power-automate/executive/` |
| Permissions / Copilot / flows contract | `docs/executive/PERMISSIONS.md`, `COPILOT_EXECUTIVE.md`, `FLOW_INTEGRATION.md` |
| Seed | `sample-data/executive/executive-seed.json` |
| Offline tests | `tests/executive/test_executive_command_center.py` |
| Shared merge guide | `docs/executive/SHARED_FILE_RECOMMENDATIONS.md` |

## What was intentionally not changed

- Deployment / upgrade / install engines  
- Authentication / env files  
- CRM flow JSON and CRM Maker solution package  
- Shared `_index.json` flow/definition indexes  
- Shared `NamedFormulas.fx` and `command-center-views.json`  

## Parent integrator next

1. Verify offline PASS on this branch.  
2. Apply append-only merges from `SHARED_FILE_RECOMMENDATIONS.md`.  
3. Re-run full predeploy suite on integration branch.  
4. Owner Maker/BI steps per `OWNER_ACTION_GUIDE.md`.

## Resume

See root `NEXT_SESSION.md` on this branch.
