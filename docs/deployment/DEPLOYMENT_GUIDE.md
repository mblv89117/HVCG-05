# DEPLOYMENT GUIDE — HVCG OS v1.0.0

## Preferred entry point

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

Environments: `development` | `test` | `production`

Legacy equivalent for Dev only: `deployment/Deploy-HVCGDevelopment.ps1` (still supported).

## After install

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Test-HVCGOSPostDeploy.ps1 -Environment development
```

## Upgrades (preserve customer data)

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment test -TargetVersion 1.0.0
```

## Soft rollback

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0
# Production:
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment production -TargetVersion 1.0.0 -Force
```

## Power Platform managed solutions (Test/Prod)

1. Author/export from Dev: `pwsh -File ./deployment/install/Pack-HVCGOSRelease.ps1`
2. Import: `pwsh -File ./deployment/install/Import-HVCGOSManagedSolution.ps1 -Environment test`

SharePoint data plane is **not** inside the managed zip — it upgrades via `releases/migrations/`.

## Pipelines

- GitHub Actions: `.github/workflows/hvcg-os-release.yml`
- Azure DevOps: `deployment/pipelines/azure-pipelines.yml`

Full release engineering: `RELEASE.md`.
