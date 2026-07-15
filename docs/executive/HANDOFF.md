# HANDOFF — Executive Command Center (Agent 1)

**Branch:** `cursor/executive-command-center`  
**Base:** `b75b19b` (intelligence-ai-ops)  
**Packaging:** Option A — exclusive paths only  
**Audience:** Owner / CEO (Manny)

## Deliverables

| Deliverable | Path |
|-------------|------|
| Architecture | `docs/executive/ARCHITECTURE.md` |
| Data map | `docs/executive/DATA_MAP.md` |
| KPI definitions / catalog | `docs/executive/KPI_DEFINITIONS.md`, `KPI_CATALOG.md` |
| Screen specs | `docs/executive/SCREEN_SPECS.md`, `DASHBOARD_SPEC.md`, `src/power-apps/executive/` |
| Power BI model | `docs/executive/POWERBI_CEO_MODEL.md`, `POWER_BI_CEO_COMMAND.md`, `src/power-bi/executive/` |
| Power Apps formulas / components | `src/power-apps/formulas/ExecutiveNamedFormulas.fx`, `src/power-apps/executive/*` |
| SharePoint views | `src/sharepoint/views/executive-views.json` |
| Copilot prompts | `docs/executive/COPILOT_EXECUTIVE.md` |
| Flow integration (Off scaffold) | `docs/executive/FLOW_INTEGRATION.md`, `src/power-automate/executive/` |
| Test plan + offline tests | `docs/executive/TEST_PLAN.md`, `tests/executive/`, `tests/unit/test_executive_command_center.py` |
| Smoke / owner guides | `SMOKE_TEST_CHECKLIST.md`, `OWNER_ACTION_GUIDE.md`, `ACCEPTANCE_REPORT.md` |
| Shared merge recommendations | `docs/executive/SHARED_FILE_RECOMMENDATIONS.md` |
| Sample KPI fixture + seed | `sample-data/executive/` |

## Offline validation

```bash
cd .worktrees/executive-command-center   # or clone + checkout branch
python3 tests/executive/run_offline_tests.py
# or: python3 tests/executive/test_executive_command_center.py
```

Expected: `PASS executive command center module checks`.

## Intentionally not touched

- `deployment/**` engines  
- Authentication / environment secrets  
- CRM flows (`HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*`) and active Maker OA solution packages  
- Shared `command-center-views.json`, `NamedFormulas.fx`, `flows/_index.json` (recommendations only)  
- Production  

## Parent integrator next steps

1. Merge this branch after offline PASS.  
2. Apply append-only items in `SHARED_FILE_RECOMMENDATIONS.md`.  
3. Owner Maker build per `POWER_APPS_BUILD_GUIDE.md` + BI publish per `POWER_BI_CEO_COMMAND.md`.  
4. Keep weekly brief **Off** until owner approves (`FLOW_INTEGRATION.md`).  

## Contamination note

Parallel agents may briefly create `docs/portal` in this worktree. That path belongs on `cursor/client-portal-data-rooms`. Offline runner deletes it if present; do not commit it on this branch.

## Resume cue

Owner: Maker wire `scrHomeExec` with `nfExec*` formulas → publish Dev → optional live smoke using `SMOKE_TEST_CHECKLIST.md`.
