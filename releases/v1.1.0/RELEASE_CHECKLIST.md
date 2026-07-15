# HVCG OS v1.1.0 — Release Checklist

**Status:** IMMUTABLE  
**Product:** HVCG OS  
**Release:** 1.1.0  
**Baseline:** Official SharePoint Development baseline  
**Release date:** 2026-07-14  

Do not edit this document after publish. Future changes belong in a newer release package.

---

## Release identity (frozen)

| Item | Value |
|------|--------|
| **Product version** | `1.1.0` |
| **Commit hash** | `f99164aebf7706ee1e2ed1cb82ad172cd5a4fa43` |
| **Git tag** | `v1.1.0-dev-sharepoint-baseline` |
| **Branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Annotated tag message** | HVCG OS Development SharePoint baseline — 1,147 fields, zero drift |
| **Remote** | `origin` (`https://github.com/mblv89117/HVCG-05.git`) |

Verify locally:

```bash
git fetch --tags
git rev-parse v1.1.0-dev-sharepoint-baseline^{}
# expect: f99164aebf7706ee1e2ed1cb82ad172cd5a4fa43
```

---

## Runtime prerequisites (checklist)

| Requirement | Required / baseline |
|-------------|---------------------|
| PowerShell | **7.0+** (`#Requires -Version 7.0`) |
| PnP.PowerShell | **Baseline validated: 3.3.0** (module min in installer: ≥ 2.0.0; Dev baseline uses **3.3.0**) |
| Microsoft.Graph | **Baseline validated: 2.38.1** (module min in installer: ≥ 2.0.0; Dev baseline uses **2.38.1**) |
| Entra app for PnP Interactive | Client ID in `config/environments/development.json` → `authentication.pnpEntraAppClientId` |
| Tenant interactive auth | Graph + PnP (browser / Interactive) |

### Required PowerShell modules

- `PnP.PowerShell` (**3.3.0** for this baseline)
- `Microsoft.Graph` (**2.38.1** for this baseline)

Optional (Power Platform packaging, not required for SharePoint list baseline):

- Power Platform CLI (`pac`)

---

## Pre-flight checklist

- [ ] Checkout tag `v1.1.0-dev-sharepoint-baseline` (or commit `f99164a`)
- [ ] Confirm PowerShell ≥ 7.0: `$PSVersionTable.PSVersion`
- [ ] Confirm modules match baseline (or compatible ≥ mins used by installer):
  ```powershell
  Get-Module PnP.PowerShell, Microsoft.Graph -ListAvailable |
    Select-Object Name, Version
  ```
- [ ] Copy `config/environments/development.example.json` → `development.json` (never commit)
- [ ] Set tenant domain, site URLs, identities, and `authentication.pnpEntraAppClientId`
- [ ] Register PnP Entra app if Client ID missing:
  ```powershell
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig
  ```
- [ ] Run pre-deployment tests:
  ```powershell
  pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
  ```
- [ ] Confirm RESULT: **PASS**

---

## Deployment checklist (Development SharePoint)

- [ ] Install / deploy Development (or repair if sites already exist):
  ```powershell
  pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
  # or
  pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1
  # additive schema repair (idempotent):
  pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
  ```
- [ ] Confirm repair/deploy exit code **0**
- [ ] Confirm schema validation: **1,147** fields, **hasDrift=false**, **isCompliant=true**
- [ ] Confirm lookups, views, and seed completed
- [ ] Manual UI check — Command Center / Knowledge / Clients Hub

---

## Baseline acceptance criteria (Dev — achieved)

| Criterion | Expected |
|-----------|----------|
| Lists | 81 configured lists |
| Fields | 1,147 compliant |
| Drift | 0 missing / 0 extra / 0 mismatched |
| Lookups | Provisioned via `Add-PnPFieldFromXml` |
| Views | Succeeded |
| Seed | 3 clients, 21 templates (team rows idempotent) |
| Leftover repair processes | None |

---

## Post-deploy checklist

- [ ] Health:
  ```powershell
  pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
  pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
  ```
- [ ] Optional backup snapshot:
  ```powershell
  pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
  ```
- [ ] Review local reports under `deployment/reports/` (gitignored; do not commit tenant data)

---

## Immutability rules

1. **Do not amend** commit `f99164a` or retag `v1.1.0-dev-sharepoint-baseline`.
2. **Do not rewrite** this checklist, `DEPLOYMENT_BASELINE.md`, or `ROLLBACK.md` in place for behavioral changes.
3. Product/schema changes after this baseline require a **new** version and release package.
4. Soft rollback of the installed version **marker** uses `ROLLBACK.md` / `Rollback-HVCGOS.ps1` — it does **not** delete customer SharePoint list data.

---

## Related immutable artifacts

| Artifact | Path |
|----------|------|
| Deployment baseline | `releases/v1.1.0/DEPLOYMENT_BASELINE.md` |
| Rollback guide | `releases/v1.1.0/ROLLBACK.md` |
| Release notes | `releases/v1.1.0/notes/RELEASE_NOTES.md` |
| Version metadata | `releases/v1.1.0/version.json` |
| Checksums | `releases/v1.1.0/checksums/sha256.json` |
| Prior release (immutable) | `releases/v1.0.0/` |
