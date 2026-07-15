# HVCG OS v1.1.0 — Deployment Baseline

**Status:** IMMUTABLE  
**Product:** HVCG OS  
**Release:** 1.1.0  
**Scope:** Official SharePoint **Development** baseline  
**Release date:** 2026-07-14  

This document freezes the known-good Development SharePoint deployment for v1.1.0.  
Do not modify after publish. Drift from this baseline requires a newer release.

---

## Release identity (frozen)

| Item | Value |
|------|--------|
| **Commit hash** | `f99164aebf7706ee1e2ed1cb82ad172cd5a4fa43` |
| **Git tag** | `v1.1.0-dev-sharepoint-baseline` |
| **Branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Product version** | `1.1.0` |
| **Power Platform solution version** | `1.1.0.0` (packaging; separate from SharePoint list plane) |

```bash
git checkout v1.1.0-dev-sharepoint-baseline
git rev-parse HEAD
# f99164aebf7706ee1e2ed1cb82ad172cd5a4fa43
```

---

## Required runtime

| Component | Requirement |
|-----------|-------------|
| **PowerShell** | **7.0 or later** (scripts use `#Requires -Version 7.0`) |
| **PnP.PowerShell** | **3.3.0** (version used to establish this baseline) |
| **Microsoft.Graph** | **2.38.1** (version used to establish this baseline) |

Installer module floors (auto-install if missing): PnP.PowerShell ≥ 2.0.0, Microsoft.Graph ≥ 2.0.0.  
**This baseline was proven with PnP.PowerShell 3.3.0 and Microsoft.Graph 2.38.1.** Prefer those exact versions when reproducing Dev.

### Required modules

```powershell
# Exact baseline-compatible install (recommended for reproduction)
Install-Module PnP.PowerShell -RequiredVersion 3.3.0 -Scope CurrentUser -Force -AllowClobber
Install-Module Microsoft.Graph -RequiredVersion 2.38.1 -Scope CurrentUser -Force -AllowClobber

Import-Module PnP.PowerShell -RequiredVersion 3.3.0
Import-Module Microsoft.Graph -RequiredVersion 2.38.1
```

Additional requirements:

- Entra ID application for PnP Interactive (`authentication.pnpEntraAppClientId`)
- Permissions per `docs/deployment/PNP_AUTHENTICATION.md` (SharePoint: `AllSites.FullControl`, `User.Read.All`; Graph as registered)

---

## Development sites (baseline tenant shape)

| Site | Alias (Dev) |
|------|-------------|
| Command Center (lists + views + seed) | `HVCG-CommandCenter-Dev` |
| Knowledge Center | `HVCG-Knowledge-Dev` |
| Clients Hub | `HVCG-Clients-Dev` |

Example Dev URLs (tenant-specific; configure in local `development.json` — never commit):

- `https://<tenant>.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- `https://<tenant>.sharepoint.com/sites/HVCG-Knowledge-Dev`
- `https://<tenant>.sharepoint.com/sites/HVCG-Clients-Dev`

---

## What this baseline includes

| Area | Baseline state |
|------|----------------|
| List schemas | 81 lists from `src/sharepoint/lists/` |
| Fields | **1,147** compliant vs repo schema |
| Schema drift | **Zero** (missing / extra / mismatched) |
| Lookups | **133** via `Add-PnPFieldFromXml` (CAML) |
| Views | Command Center views provisioned |
| Seed | Demo clients + project templates seeded |
| Resilience | `Invoke-HVCGPnPWithRetry` (429 / Retry-After / 503 / throttle / transient) |
| Drift gate | Deploy/repair fails if schema drift exists |
| Auth | `Connect-HVCGPnPOnline` Interactive + ClientId |

---

## Deployment commands

Work from repository root at tag `v1.1.0-dev-sharepoint-baseline`.

### 1) Pre-deployment tests

```powershell
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
```

### 2) PnP Entra app (once per tenant / workstation config)

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig
```

### 3) Fresh Development install

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

Equivalent full Dev orchestration:

```powershell
pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1
```

### 4) Idempotent schema repair (additive; no site/list deletion)

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

Optional:

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development -SkipViews
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development -SkipSeed
```

### 5) Upgrade path (from installed 1.0.0)

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`

### 6) Post-deploy verification

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Test-HVCGOSPostDeploy.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

---

## Expected success signals

- Process exit code **0**
- Schema validation report: `isCompliant=true`, `hasDrift=false`, ~**1147** fields OK
- Local reports (gitignored):
  - `deployment/reports/HVCG-Dev-Deploy-latest.json`
  - `deployment/reports/schema/schema-validation-latest.json`

---

## Out of scope for this SharePoint baseline

- Production / Test gated promotion
- Canvas app Maker packaging and flow connection consent (post-list work)
- Destructive SharePoint teardown

---

## Related documents

- `releases/v1.1.0/RELEASE_CHECKLIST.md`
- `releases/v1.1.0/ROLLBACK.md`
- `releases/v1.1.0/notes/RELEASE_NOTES.md`
- `docs/deployment/PNP_AUTHENTICATION.md`
- `RELEASE.md` (engineering overview; not a substitute for this frozen baseline)
