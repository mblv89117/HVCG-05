# Solution Export Validation — HVCGCommandCenterDev (Development)

**Generated:** 2026-07-16T00:35:42Z  
**Environment:** HVCG Development only (`https://org1131a2b0.crm.dynamics.com/`)  
**Solution:** `HVCGCommandCenterDev` v`1.1.0.1` (unmanaged)  
**Production:** untouched  
**Machine manifest:** `deployment/packages/crm/MANIFEST.json`

## Export artifact

| Item | Value |
|------|-------|
| Zip | `deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-003427.zip` |
| SHA-256 | `76414a1d836a12a527e472095c99d2396daff788663a248a752282e4523fdea0` |
| Inspect folder | `deployment/packages/crm/export-inspect-20260716-003427/` |
| Enriched (export + repo conn refs + env vars) | `deployment/packages/crm/enriched-validation-20260716/` |

## Verdict

**PASS_WITH_GAPS** — all expected CRM flows are present with the validated recurrence + HTTP patterns. Connection references are present in `customizations.xml`. Environment variable **definitions are not RootComponents** in the live export. No canvas app is in the environment or solution yet.

## Workflows (15)

All four CRM smoke-validated flows are present:

| Flow | Present | Pattern check |
|------|---------|---------------|
| `HVCG_LeadQualifiedCreateOpportunity` | Yes | Recurrence + HTTP |
| `HVCG_OpportunityStageChangedNotify` | Yes | Recurrence + HTTP |
| `HVCG_OpportunityWonCloseout` | Yes | Recurrence + HTTP |
| `HVCG_CapitalFundingStatusNotify` | Yes | Recurrence + HTTP |

Plus 11 non-CRM solution flows (onboarding, reminders, health, weekly summary, etc.).

## Connection references

Present in export `customizations.xml`:

- `hvcg_sharedapprovals`
- `hvcg_sharedoffice365`
- `hvcg_sharedsharepointonline`
- `hvcg_sharedteams`

CRM flows bind SharePoint via `shared_sharepointonline`. Repo packager folders under `src/power-platform/solutions/HVCGCommandCenterDev/src/ConnectionReferences/` are merged into `enriched-validation-20260716/` for repository validation.

## Environment variables

| Check | Result |
|-------|--------|
| RootComponents / `EnvironmentVariableDefinitions/` in live export | **Missing** |
| Referenced by CRM flow parameters | `hvcg_CommandCenterSiteUrl`, `hvcg_CrmEnableTeamsNotify` |
| Repo definitions available | 12 under solution `EnvironmentVariableDefinitions/` |

**Gap:** before any managed promote, add env var definitions to the unmanaged Dev solution (or confirm they already exist in the environment and are solution-aware). Repo copies are staged in the enriched package for review only — this step does **not** import or publish.

## Canvas / CRM UI components

| Check | Result |
|-------|--------|
| Canvas app in `pac canvas list` | **0** |
| Canvas app in solution export | **No** |
| Build/import package | Prepared — see `docs/crm/CANVAS_APP_OWNER_GUIDE.md` |

**Do not publish or activate the canvas app without explicit owner approval.**

## Safety

- Export used active PAC profile `HVCG-Dev-Maker` → HVCG Development only.
- No Production auth or solution operations.
- Teams notify remains gated by `hvcg_CrmEnableTeamsNotify` (Dev policy: false).
