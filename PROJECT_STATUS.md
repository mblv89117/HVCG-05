# PROJECT STATUS

**Last updated:** 2026-07-14  
**Product:** HVCG OS  
**Version:** **1.1.0** (`VERSION` / `version.json`)  
**Branch:** `cursor/v1.1.0-intelligence-ai-ops`  
**Overall status:** **Finalized** — v1.1.0 repository package ready for Development install

## Verdict

HVCG OS **v1.1.0** is a complete, semantically versioned, installable package: intelligence layer, AI orchestration foundation, backup/restore/DR, operational monitoring, upgrade/rollback, health checks, managed solution manifests, and Dev → Test → Production pipelines.

Pre-deployment critical tests: **PASS**. Live tenant install awaits owner authentication.

v1.0.0 artifacts remain immutable at `releases/v1.0.0/`.

## Install (Development)

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

## Upgrade from v1.0.0

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`

## Post-install

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

## Release engineering

| Capability | Path |
|------------|------|
| Release notes | `releases/v1.1.0/notes/RELEASE_NOTES.md` |
| v1.0.0 (immutable) | `releases/v1.0.0/notes/RELEASE_NOTES.md` |
| Upgrade | `deployment/upgrade/Upgrade-HVCGOS.ps1` |
| Rollback | `deployment/rollback/Rollback-HVCGOS.ps1` |
| Health | `deployment/health/Test-HVCGOSHealth.ps1` |
| Operational health | `deployment/health/Invoke-HVCGOSOperationalHealth.ps1` |
| Backup / restore | `deployment/backup/Backup-HVCGOS.ps1`, `deployment/restore/Restore-HVCGOS.ps1` |
| Guide | `RELEASE.md` |
| GitHub Actions | `.github/workflows/hvcg-os-release.yml` |
| Azure Pipelines | `deployment/pipelines/azure-pipelines.yml` |

## v1.1.0 capabilities packaged

| Area | Status |
|------|--------|
| `HVCG_Relationships` + query catalog | Shipped |
| AI orchestration lists + governance docs | Shipped |
| Backup / restore / `DISASTER_RECOVERY.md` | Shipped |
| Operational monitoring + System Health dashboard spec | Shipped |
| Schema: 81 lists | Shipped |

## Next owner step

Run Development install (or upgrade), then health + backup. Power Platform canvas/flows still require Maker consent after lists exist.
