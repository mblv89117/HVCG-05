# Post Deployment Validation — Project Atlas

## Purpose

Confirm Development environment remains healthy and correct after a Dev package apply.

## Checks

| ID | Check |
|----|-------|
| PD-01 | Environment still development |
| PD-02 | Health wrapper PASS |
| PD-03 | Smoke wrapper PASS (selected suite) |
| PD-04 | Feature flags unchanged (gates Off) |
| PD-05 | Deployment log finalized |

## Command

```powershell
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasPostDeployValidate.ps1 -Environment development
```

## Relation to health/smoke

Post-deploy is the **orchestrator**; health and smoke are dependencies.
