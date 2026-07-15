# HVCG OS Release Engineering

## Semantic versioning

| File | Purpose |
|------|---------|
| `VERSION` | Current release `MAJOR.MINOR.PATCH` |
| `version.json` | Metadata + upgrade compatibility |
| `releases/vX.Y.Z/` | Frozen artifacts, notes, checksums |
| `releases/migrations/` | Additive upgrade packs |
| `HVCG_SystemInfo` list | Installed version in each tenant environment |

**v1.1.0** is the current release (intelligence layer, AI orchestration, backup/monitoring).  
**v1.0.0** artifacts remain immutable at `releases/v1.0.0/`.

### Compatibility rules

- **1.x → 1.y**: Additive only (new lists/columns). Customer data retained.
- **1.0.0 → 1.1.0**: Migration pack `20260714_002_intelligence_ai_backup_v1_1_0.json`; adds 13 lists.
- **1.x → 2.0**: Requires dedicated migration pack + dual-write/deprecation plan (`releases/migrations/POLICY_v2_0_0.md`).
- Never rebuild customer items from `sample-data/` during upgrades.

## Commands

```powershell
# Fresh install (Dev) — installs current VERSION (1.1.0)
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development

# Upgrade from 1.0.0 to 1.1.0
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0

# Soft rollback (data retained)
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0

# Health + post-deploy
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Test-HVCGOSPostDeploy.ps1 -Environment development

# Operational health (v1.1.0)
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development

# Backup (v1.1.0)
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment production -Mode Full

# Restore (v1.1.0)
pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -Environment development -WhatIf
pwsh -File ./deployment/restore/Restore-HVCGOS.ps1 -Environment development -RestoreData

# Pack release artifacts
pwsh -File ./deployment/install/Pack-HVCGOSRelease.ps1 -Version 1.1.0
```

## Environments

| Env | Config | Power Platform solution |
|-----|--------|-------------------------|
| development | `config/environments/development.json` | Unmanaged `HVCGOS` |
| test | `config/environments/test.json` | **Managed** zip |
| production | `config/environments/production.json` | **Managed** zip (same as Test) |

SharePoint data plane is always upgraded via migration scripts (not Dataverse solution layers).

## Pipeline

See `.github/workflows/hvcg-os-release.yml` and `deployment/pipelines/azure-pipelines.yml`.

## Release notes

- Current: `releases/v1.1.0/notes/RELEASE_NOTES.md`
- v1.0.0 (immutable): `releases/v1.0.0/notes/RELEASE_NOTES.md`

## Migration packs

| Pack | From | To | Status |
|------|------|----|--------|
| `20260714_001_baseline_v1_0_0` | 0.0.0 | 1.0.0 | Active |
| `20260714_002_intelligence_ai_backup_v1_1_0` | 1.0.0 | 1.1.0 | Active |
| `PLACEHOLDER_v1_1_0` | 1.0.0 | 1.1.0 | Superseded by `20260714_002` |

## Related documentation

- `DISASTER_RECOVERY.md` — RPO/RTO, restore order
- `MONITORING.md` — signal sources, alerting cadence
- `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md` — dashboard spec
