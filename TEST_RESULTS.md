# TEST RESULTS

**Last run:** 2026-07-14 — HVCG OS **v1.1.0** pre-deployment harness  
**Version:** 1.1.0  
**Critical result:** **PASS** (`tests/Invoke-HVCGPreDeploymentTests.ps1`)

## Package validation

| Check | Result |
|-------|--------|
| Schema integrity | PASS (81 lists, 21 templates, 11 flows) |
| SemVer VERSION ↔ version.json | PASS (1.1.0) |
| Baseline migration 0.0.0→1.0.0 | PASS |
| v1.1.0 migration 1.0.0→1.1.0 | PASS (`20260714_002`) |
| Install/Upgrade/Rollback/Health/Backup/Restore scripts | PASS (exist + parse) |
| Intelligence/AI/backup unit suite | PASS |
| Operational health report (WhatIf) | PASS → `deployment/reports/health/operational-latest.json` |
| Release notes v1.1.0 | PASS |
| Release immutability v1.0.0 | PASS |

## Tenant

**PENDING** — owner authentication required for live Microsoft 365 install.

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```
