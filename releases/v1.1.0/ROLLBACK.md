# HVCG OS v1.1.0 — Rollback

**Status:** IMMUTABLE  
**Product:** HVCG OS  
**Release:** 1.1.0  
**Release date:** 2026-07-14  

Soft-rollback guidance for the official v1.1.0 Development SharePoint baseline.  
This document is frozen with the release. Do not rewrite for new product behavior — ship a new version instead.

---

## Release identity (frozen)

| Item | Value |
|------|--------|
| **Commit hash** | `f99164aebf7706ee1e2ed1cb82ad172cd5a4fa43` |
| **Git tag** | `v1.1.0-dev-sharepoint-baseline` |
| **Branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Product version** | `1.1.0` |

---

## Required runtime (same as baseline)

| Component | Requirement |
|-----------|-------------|
| **PowerShell** | **7.0+** |
| **PnP.PowerShell** | **3.3.0** (baseline-validated) |
| **Microsoft.Graph** | **2.38.1** (baseline-validated) |

### Required modules

- `PnP.PowerShell` **3.3.0**
- `Microsoft.Graph` **2.38.1**

---

## Rollback policy (important)

| Action | Supported? |
|--------|------------|
| Soft-rollback `InstalledVersion` marker in `HVCG_SystemInfo` | **Yes** |
| Retain customer / Dev list **data** | **Yes** (lists/columns are **not** deleted) |
| Remove v1.1.0 lists/columns automatically | **No** |
| Destructive SharePoint wipe | **Not supported** by rollback tooling |
| Production rollback | Requires explicit **`-Force`** after approval |

v1.1.0 → soft-rollback to **1.0.0** keeps additive schema in place; apps/flows targeting 1.0.0 remain coherent while unused 1.1.0 lists stay idle.

---

## Rollback commands

Work from repository root at tag `v1.1.0-dev-sharepoint-baseline`.

### Development — soft rollback to 1.0.0

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 `
  -Environment development `
  -TargetVersion 1.0.0
```

### WhatIf (no tenant change)

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 `
  -Environment development `
  -TargetVersion 1.0.0 `
  -WhatIf
```

### Optionally flag flows for manual disable

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 `
  -Environment development `
  -TargetVersion 1.0.0 `
  -DisableFlows
```

(Flows are **not** auto-enumerated/disabled in-script; owner turns them off in Maker / `pac` as noted by the report.)

### Production (gated)

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 `
  -Environment production `
  -TargetVersion 1.0.0 `
  -Force
```

### Test environment

```powershell
pwsh -File ./deployment/rollback/Rollback-HVCGOS.ps1 `
  -Environment test `
  -TargetVersion 1.0.0
```

---

## After rollback

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
```

Owner follow-ups (typical):

1. Confirm `HVCG_SystemInfo.InstalledVersion` = target (e.g. `1.0.0`).
2. If a managed Dataverse solution was imported at 1.1.0.0, re-import the prior managed zip from `releases/v1.0.0/artifacts/` (or archive).
3. Disable any v1.1.0-only flows manually if `-DisableFlows` was requested.
4. Do **not** rebuild customer items from `sample-data/` as a rollback strategy.

---

## Re-advance to v1.1.0 after soft rollback

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 `
  -Environment development `
  -TargetVersion 1.1.0
```

Or idempotent schema repair if lists already match this baseline:

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

---

## Related documents

- `releases/v1.1.0/DEPLOYMENT_BASELINE.md` — deploy commands & runtime pin
- `releases/v1.1.0/RELEASE_CHECKLIST.md` — acceptance & immutability rules
- `releases/v1.1.0/notes/RELEASE_NOTES.md`
- `DISASTER_RECOVERY.md` — restore order (data recovery ≠ version soft-rollback)
