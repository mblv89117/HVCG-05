# Shared file recommendations (do not apply on this branch)

Executive Command Center owns exclusive paths under `docs/executive/`, `src/power-apps/executive/`, `src/power-apps/formulas/ExecutiveNamedFormulas.fx`, `src/power-bi/executive/`, `src/sharepoint/views/executive-views.json`, `tests/executive/`, `tests/unit/test_executive_command_center.py`.

When integrating, a **parent merge agent** may apply the following. This branch does **not** modify these shared files (avoids CRM / Ops / Finance collisions).

| Shared file | Recommendation |
|-------------|----------------|
| `src/power-apps/screens/scrHomeExec.md` | Replace stub body with pointer to `src/power-apps/executive/scrHomeExec.build.md` + `docs/executive/SCREEN_SPECS.md`, or paste Row A–D tables from SCREEN_SPECS. |
| `src/power-apps/formulas/NamedFormulas.fx` | Append `#include`-style comment block: “Also paste ExecutiveNamedFormulas.fx (nfExec*)”. Do not rename CRM `nf*` formulas. |
| `src/power-apps/BUILD_SHEET.md` | Add checklist step: paste `ExecutiveNamedFormulas.fx`; wire `cmpExec*` from `src/power-apps/executive/COMPONENTS.md`. |
| `src/power-apps/README.md` | Link Executive module docs. |
| `src/sharepoint/views/command-center-views.json` | Optionally merge unique titles from `executive-views.json` after dedupe by `(list, title)`. Prefer provisioning both files. |
| `docs/architecture/REPORTING.md` | Add link to `docs/executive/POWERBI_CEO_MODEL.md` as CEO dataset specialization. |
| `docs/architecture/POWERBI_ENTERPRISE_MODEL.md` | Note CEO app uses `HVCG_CEO_Command` subset. |
| `tests/Invoke-HVCGPreDeploymentTests.ps1` | Append-only check invoking `tests/unit/test_executive_command_center.py`. |
| `ARCHITECTURE.md` (root) | Link Executive module under capability map. |

## Do not touch (explicit)

- `deployment/**` install/upgrade/rollback engines  
- Auth / PnP / `.env*`  
- CRM flows `HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*`  
- Active Maker OA / smoke-test solution packages under CRM agent control  
- Production environment configs

## Cross-branch overlap notes

| Overlap | Recommendation |
|---------|----------------|
| Accidental `portal(schema)` commit briefly landed on this branch history | Keep Client Portal / Data Rooms on `cursor/client-portal-data-rooms` only. ECC branch must remain portal-free (reset locally if contaminated). |
| Ops Hub views / list schema edits | Stay on `cursor/operations-hub`. Do not edit Ops lists from ECC. |
| Finance Ops packaging | Stay on `cursor/finance-operations`. ECC **reads** finance lists for KPIs; does not own finance migrations. |
| Soft-conflict `tests/Invoke-HVCGPreDeploymentTests.ps1` | Parent integrator appends: `python3 tests/executive/test_executive_command_center.py` (or unit mirror). |
