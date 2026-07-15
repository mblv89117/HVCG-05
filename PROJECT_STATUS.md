# PROJECT STATUS

**Last updated:** 2026-07-14  
**Product:** HVCG OS  
**Version:** **1.1.0** (`VERSION` / `version.json`)  
**Overall status:** v1.1.0 packaged — installable release ready

## Verdict

HVCG OS is packaged as a **semantically versioned, installable solution** with upgrade/rollback, config migration, health checks, post-deploy validation, operational health, backup/restore, managed solution promotion path, and Dev → Test → Production pipelines.

v1.1.0 is **additive and backward compatible** with v1.0.0. Immutable v1.0.0 artifacts remain at `releases/v1.0.0/`.

## Install (Development)

Fresh install (installs v1.1.0 from `VERSION`):

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

## Upgrade from v1.0.0

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`

## Release engineering

| Capability | Path |
|------------|------|
| Release notes | `releases/v1.1.0/notes/RELEASE_NOTES.md` |
| v1.0.0 (immutable) | `releases/v1.0.0/notes/RELEASE_NOTES.md` |
| Upgrade | `deployment/upgrade/Upgrade-HVCGOS.ps1` |
| Rollback | `deployment/rollback/Rollback-HVCGOS.ps1` |
| Health | `deployment/health/Test-HVCGOSHealth.ps1` |
| Operational health | `deployment/health/Invoke-HVCGOSOperationalHealth.ps1` |
| Post-deploy | `deployment/health/Test-HVCGOSPostDeploy.ps1` |
| Backup | `deployment/backup/Backup-HVCGOS.ps1` |
| Restore | `deployment/restore/Restore-HVCGOS.ps1` |
| Pack release | `deployment/install/Pack-HVCGOSRelease.ps1` |
| Managed import | `deployment/install/Import-HVCGOSManagedSolution.ps1` |
| Guide | `RELEASE.md` |
| GitHub Actions | `.github/workflows/hvcg-os-release.yml` |
| Azure Pipelines | `deployment/pipelines/azure-pipelines.yml` |

## Data preservation

Upgrades apply **additive** migrations only. Customer list items are never rebuilt from sample data. Soft rollback retains data and resets `HVCG_SystemInfo.InstalledVersion`.

## v1.1.0 additions

| Area | Delivered |
|------|-----------|
| Intelligence Layer | `HVCG_Relationships` + query catalog |
| AI orchestration | 11 foundation lists + existing `HVCG_AI_*` queues |
| Backup / DR | Backup/restore scripts + `DISASTER_RECOVERY.md` |
| Monitoring | Operational health script + `HVCG_OperationalAlerts` |

## Next step

Run install or upgrade on Dev, then health + operational health + post-deploy validation. Author Power Platform components in Dev and export managed zip into `releases/v1.1.0/artifacts/` for Test/Prod.
