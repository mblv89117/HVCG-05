# Health Checks — Project Atlas

## Purpose

Verify environment operational health after package apply (Development).

## Existing tools (reuse)

| Script | Path |
|--------|------|
| OS health | `deployment/health/Test-HVCGOSHealth.ps1` |
| Post-deploy health | `deployment/health/Test-HVCGOSPostDeploy.ps1` |
| Operational health | `deployment/health/Invoke-HVCGOSOperationalHealth.ps1` |

Reports typically land under `deployment/reports/health/`.

## Atlas wrapper

```powershell
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasHealthChecks.ps1 -Environment development
```

Wrapper:

1. Runs environment guard (refuses production)
2. Invokes existing health scripts with `-Environment development` when present
3. Copies/summarizes result into `deployment/atlas/reports/`

## Pass criteria (Dev)

- Script exit code 0
- No critical failures in health JSON
- Sites reachable for Dev aliases only

## This delivery

Wrapper authored for QA. **Do not run against live tenants until QA approves.**
