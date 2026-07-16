# Owner Deployment Guide — RC-1 Development Baseline

**Audience:** HVCG Owner / Global Admin / Maker  
**Package:** `releases/RC-1-Development-Baseline`  
**Status:** Development Baseline Complete — **Owner approval required** before Production  

This guide describes how a **future** target-environment deployment would use this RC. It does **not** authorize Production import.

---

## Hard stops

| Action | Allowed now? |
|--------|----------------|
| Review / checksum this RC in git | Yes |
| Deploy / smoke in **Development** (already done) | Already complete |
| Import into **Production** | **No — wait for Owner approval** |
| Publish Canvas | **No** |
| Activate Production flows | **No** |
| Enable Teams notify | **No** until channel vars + approval |

---

## What this RC contains

1. Unmanaged solution zip (15 workflows, 4 connection refs, 8 env var definitions + Dev current values).
2. `deploymentSettings-template.json` with empty `Value` / `ConnectionId` fields.
3. Validation + smoke evidence from Development.

## Prerequisites (any future non-Dev target)

1. Target Power Platform environment exists and you are authenticated as Maker/Admin.
2. SharePoint target sites / lists exist (or are repaired) for that environment.
3. Private copy of settings file (do not commit Production connection IDs or secrets).

## Deployment sequence (only after Owner approval)

1. Copy `settings/deploymentSettings-template.json` → private `deploymentSettings-<target>.json`.
2. Set all eight `EnvironmentVariables[].Value` to **target** URLs / emails / flags:
   - `hvcg_CommandCenterSiteUrl` → target Command Center site
   - `hvcg_CrmEnableTeamsNotify` → `false` until Teams UAT approved
   - Recipients / other site URLs as appropriate
3. Create or select connections in the target environment; set `ConnectionReferences[].ConnectionId`.
4. Import solution with settings file, for example:

```bash
pac solution import \
  --path ./solution/HVCGCommandCenterDev-unmanaged-20260716-004621.zip \
  --settings-file ./deploymentSettings-<target>.json \
  --async
```

5. In Maker, open each CRM flow and **confirm** SharePoint site parameters resolve to the **target** site (not Dev defaults). Rebind to environment variables if needed.
6. Leave flows **Off** until smoke in target passes; then activate only with Owner confirmation.
7. Do **not** publish Canvas unless Owner separately approves (`docs/crm/CANVAS_APP_OWNER_GUIDE.md`).

## CRM flows in package

- `HVCG_LeadQualifiedCreateOpportunity`
- `HVCG_OpportunityStageChangedNotify`
- `HVCG_OpportunityWonCloseout`
- `HVCG_CapitalFundingStatusNotify`

## Related docs in this RC

- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/CONNECTION_REFERENCES.md`
- `guides/ROLLBACK_GUIDE.md`
- `validation/ENV_VAR_GAP_VALIDATION.md`
