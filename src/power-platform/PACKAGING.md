# Power Platform Packaging & Import — HVCG Command Center DEV

> Product inventory & Sprint 14 release packet: `PRODUCT_INVENTORY.md`, `RELEASE_PACKET.md`, `DATAVERSE_ATLAS_INVENTORY.json`.  
> **Production readiness:** `PRODUCTION_READINESS_REPORT.md` — **NO-GO** for Production import (coordinate Deployment Manager + Owner).  
> UX SoR for Executive Dashboard = **Elite OS SPA** (not canvas). Model-driven = admin SoR.

## What is deployable from this repo

| Artifact | Path | Import method |
|----------|------|---------------|
| Environment variables | `src/power-platform/environment-variables/` + solution XML | pac / Maker portal |
| Connection references | `src/power-platform/connection-references/` | Create connections then bind |
| Flow definitions | `src/power-automate/definitions/*.definition.json` | Create flow → Import definition / rebuild from JSON |
| Solution scaffold | `src/power-platform/solutions/HVCGCommandCenterDev/` | pac solution pack/import when expanded |
| Canvas app | Build sheet (SharePoint-connected) | Maker studio after lists exist |

SharePoint Lists are the data layer (no Dataverse tables in V1). The solution holds **automation + app + connection refs + env vars**.

## One-time CLI setup (optional but recommended)

```bash
# macOS / Linux
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
# or follow https://learn.microsoft.com/power-platform/developer/cli/introduction
```

```powershell
pac auth create --deviceCode
pac org list
pac org select --environment <DEV_ENVIRONMENT_ID_OR_URL>
```

## After SharePoint deploy succeeds

1. Set environment variable values to Dev site URLs / emails (from `config/environments/development.json`).
2. Create connections (SharePoint, Office 365 Outlook, Teams, Approvals) while signed in as the deploying admin (Dev) or service account (Prod later).
3. For each file in `src/power-automate/definitions/`:
   - Power Automate → Create → Instant/Automated per trigger
   - Name = `flowName`
   - Recreate actions using the definition JSON + the matching build sheet in `src/power-automate/flows/<name>.json`
   - Bind connection references
   - Turn **On** after a test
4. Build canvas app per `src/power-apps/BUILD_SHEET.md`.
5. Share app with `HVCG-DEV-Role-*` groups.

## Acceptance criteria (flows)

- Each priority flow writes to `HVCG_AutomationLogs`
- Re-run does not duplicate clients/projects (idempotency keys)
- Executive escalation does not fire for routine overdue low tasks
- Client emails remain off unless `hvcg_EnableClientEmails` = true

## Managed vs unmanaged

| Environment | Solution form |
|-------------|---------------|
| Development | Unmanaged `HVCGOS` (author here) |
| Test | **Managed** `HVCGOS_managed_{version}.zip` |
| Production | **Same managed zip** as Test |

SharePoint lists/columns are **outside** the Dataverse solution. They upgrade via `releases/migrations/` so customer data is never rebuilt.

```powershell
pwsh -File ./deployment/install/Pack-HVCGOSRelease.ps1 -Version 1.1.0
pwsh -File ./deployment/install/Import-HVCGOSManagedSolution.ps1 -Environment test
```

SharePoint data plane (lists) for v1.1.0 includes Intelligence (`HVCG_Relationships`), AI orchestration entities, and `HVCG_OperationalAlerts` via install or `Upgrade-HVCGOS.ps1 -TargetVersion 1.1.0`.