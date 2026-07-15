# DEPLOYMENT GUIDE — HVCG OS v1.1.0

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
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
```

## Upgrade from v1.0.0 (preserve customer data)

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`  
Diff: `releases/migrations/diffs/v1.0.0_to_v1.1.0.json`

Adds 13 lists (Relationships, 11 AI orchestration, OperationalAlerts) and extends existing AI queues with `JobId` linkage. Customer data is preserved (additive only).

## Soft rollback

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0
# Production:
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment production -TargetVersion 1.0.0 -Force
```

New v1.1.0 lists/columns remain after soft rollback; apps ignore unused schema.

## Backup & restore

```powershell
# Backup (weekly Dev; nightly Prod recommended)
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development

# Full backup with document inventory (Prod weekly)
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment production -Mode Full

# Restore (additive default; review WhatIf first)
pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -Environment development -WhatIf
pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -Environment development -RestoreData
```

See `DISASTER_RECOVERY.md` for RPO/RTO targets and restore order.

## Power Platform managed solutions (Test/Prod)

1. Author/export from Dev: `pwsh -File ./deployment/install/Pack-HVCGOSRelease.ps1 -Version 1.1.0`
2. Import: `pwsh -File ./deployment/install/Import-HVCGOSManagedSolution.ps1 -Environment test`

SharePoint data plane is **not** inside the managed zip — it upgrades via `releases/migrations/`.

## Pipelines

- GitHub Actions: `.github/workflows/hvcg-os-release.yml`
- Azure DevOps: `deployment/pipelines/azure-pipelines.yml`

Full release engineering: `RELEASE.md`.  
Release notes: `releases/v1.1.0/notes/RELEASE_NOTES.md`.
