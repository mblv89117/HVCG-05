# Environment Variable Gap — Validation Report

**Generated:** 2026-07-16T00:48:00Z  
**Environment inspected:** HVCG Development only (`https://org1131a2b0.crm.dynamics.com/`)  
**Solution:** `HVCGCommandCenterDev`  
**Production:** untouched  
**Canvas:** not published / not activated  

---

## STATUS:

READY WITH MANUAL OWNER ACTIONS

---

## Executive finding

The earlier “missing Environment Variable definitions” gap was an **actual packaging defect**, not an intentional external design.

| Fact | Detail |
|------|--------|
| Definitions in Dev Dataverse | **8** `hvcg_*` definitions existed |
| Values in Dev Dataverse | **8** current values existed |
| In solution before fix | **0** env var definitions / values |
| In solution after fix | **8** definitions + **8** values (auto-added with definitions) |
| Re-export | `deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-004621.zip` contains `environmentvariabledefinitions/` for all 8 |
| Teams channel vars (repo-only) | **4** never created in Dev — **intentionally deferred** (Teams notify gated `false`) |

CRM smoke already passed because the four CRM flows embed **SharePoint URL / Teams gate as flow parameter `defaultValue`s**, and Dev connection references are bound. That masks the packaging gap in Dev but does **not** make Production import safe without owner actions.

---

## Inspection results

### 1. Solution components (after remediation)

| Component type | Count | Notes |
|----------------|-------|-------|
| Workflow | 15 | Includes 4 CRM flows |
| Environment Variable Definition | 8 | Added 2026-07-16 via `pac solution add-solution-component` |
| Environment Variable Value | 8 | Pulled in with definitions (contain **Dev** site URLs / emails) |
| Connection Reference | 4 | Already in solution (`hvcg_shared*`) |

### 2. Environment Variable Definitions (live Dev)

| Schema name | In Dev | In solution (after) | CRM flow dependency |
|-------------|--------|---------------------|---------------------|
| `hvcg_CommandCenterSiteUrl` | Yes | Yes | **Required** (all 4 CRM flows) |
| `hvcg_CrmEnableTeamsNotify` | Yes | Yes | **Required** (all 4 CRM flows) |
| `hvcg_CrmTestRecipient` | Yes | Yes | Supporting (notifications) |
| `hvcg_EnableClientEmails` | Yes | Yes | Supporting |
| `hvcg_ExecutiveEmail` | Yes | Yes | Supporting |
| `hvcg_OpsEmail` | Yes | Yes | Supporting |
| `hvcg_ClientsSiteUrl` | Yes | Yes | Supporting (other modules) |
| `hvcg_KnowledgeSiteUrl` | Yes | Yes | Supporting |
| `hvcg_TeamsCrmChannelId` | **No** | No | Deferred — Teams notify Off |
| `hvcg_TeamsCrmChannelGroupId` | **No** | No | Deferred |
| `hvcg_TeamsCapitalChannelId` | **No** | No | Deferred |
| `hvcg_TeamsCapitalChannelGroupId` | **No** | No | Deferred |

### 3. Environment Variable Values (live Dev)

All 8 present. Examples:

- `hvcg_CommandCenterSiteUrl` → Dev Command Center site URL  
- `hvcg_CrmEnableTeamsNotify` → `false`  
- Email recipients → owner UPN  

These **current values are now inside the unmanaged solution export**. That is correct for Dev ALM snapshotting, but **unsafe to apply unchanged to Production**.

### 4. Connection references

| Logical name | In Dev | Bound connection | In solution | CRM flows use |
|--------------|--------|------------------|-------------|---------------|
| `hvcg_sharedsharepointonline` | Yes | Yes | Yes | **Yes** (all 4) |
| `hvcg_sharedoffice365` | Yes | Yes | Yes | Not by current CRM smoke defs |
| `hvcg_sharedteams` | Yes | Yes | Yes | Gated / not required while Teams Off |
| `hvcg_sharedapprovals` | Yes | Yes | Yes | Not by current CRM smoke defs |

### 5. Flow dependencies (CRM)

Each of:

- `HVCG_LeadQualifiedCreateOpportunity`
- `HVCG_OpportunityStageChangedNotify`
- `HVCG_OpportunityWonCloseout`
- `HVCG_CapitalFundingStatusNotify`

depends on:

1. Connection reference `hvcg_sharedsharepointonline`  
2. Flow parameters `hvcg_CommandCenterSiteUrl` and `hvcg_CrmEnableTeamsNotify` with **baked `defaultValue`** (Dev URL / `false`) — **not** formal environment-variable metadata binding in the exported JSON  

**Risk:** even after env vars are in the solution, runtime may still honor flow parameter defaults unless Maker rebinds parameters to environment variables (or defaults are updated per environment).

---

## Intentionally external / deferred (not blockers for Dev CRM smoke)

### Four Teams channel environment variables

**Why deferred:** `hvcg_CrmEnableTeamsNotify=false` is Dev policy. Channel IDs are tenant-specific and must not be invented. CRM smoke does not call Teams when the gate is false.

**How Production will obtain them (when Teams notify is approved):**

1. Create definitions (or import from solution once added).  
2. Owner sets **current values** to Production Teams team/channel IDs.  
3. Set `hvcg_CrmEnableTeamsNotify=true` only after UAT on test channels.  
4. Re-smoke notification paths.

Until then, absence of the four Teams vars is **expected**, not a CRM flow smoke blocker.

---

## Every remaining missing dependency

| Dependency | Status | Blocks automated Prod deploy? |
|------------|--------|-------------------------------|
| 8 core env var definitions in solution | **Resolved** (added + re-exported) | No |
| Prod-specific env **values** | Missing until owner fills `deploymentSettings` | **Yes** (manual) |
| Connection IDs on target environment | Empty in settings template | **Yes** (manual) |
| Formal flow parameter → env var binding | Still defaultValue-based | **Yes** (verify/fix before Prod) |
| 4 Teams channel env vars | Intentionally absent | No (while Teams Off) |
| Canvas app in solution | Absent (publish gated) | Out of scope for this report; UI not required for flow deploy |
| Production environment | Not touched | N/A |

---

## Deployment risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Unmanaged export embeds **Dev SharePoint URLs** in env var defaults/values | High for Prod | Use `deploymentSettings` on import; never import Dev values into Prod unchanged |
| CRM flows bake Dev URL in parameter `defaultValue` | High for Prod | Owner: in Maker, bind parameters to env vars **or** set Prod defaults before activate |
| Connection references import unbound | High | Owner creates/binds connections in target env via settings / Maker |
| Accidental Teams enable with empty channel IDs | Medium | Keep `hvcg_CrmEnableTeamsNotify=false` until channels set |
| Canvas not in package | Low for flow-only deploy | Separate owner approval before publish |

**Deployment is supported** for Dev→target **only if** owner completes the actions below. It is **not** a hands-off “READY FOR DEPLOYMENT” promote.

---

## Owner actions (required before any non-Dev deploy)

1. **Copy** `deployment/packages/crm/deploymentSettings-template.json` → a **private** Prod (or target) settings file (do not commit secrets/Prod IDs if policy forbids).  
2. **Set** `EnvironmentVariables[].Value` for all 8 schemas to **target** URLs / emails / flags (Prod Command Center URL, Teams notify `false` until approved).  
3. **Set** `ConnectionReferences[].ConnectionId` for all four connectors in the target environment (or bind in Maker after import).  
4. **Import** solution with `--settings-file` (or Maker equivalent).  
5. **Open each CRM flow** and confirm SharePoint site parameter resolves to **target** site (not Dev). Rebind to environment variables if still on Dev defaults.  
6. **Do not activate** flows that send client/Teams traffic until gates and recipients are verified.  
7. **Do not publish** Canvas until explicit owner approval (`docs/crm/CANVAS_APP_OWNER_GUIDE.md`).  
8. When Teams notify is approved: create/set the four Teams channel env vars, then enable the gate.

---

## Rollback plan

| Scope | Rollback |
|-------|----------|
| Dev solution component add (env vars) | Low risk — definitions already existed in Dev; solution membership can remain. To undo membership only: remove components from unmanaged solution in Maker (does not delete env vars from environment). |
| Bad target import | Delete unmanaged solution layer / re-import prior zip; restore prior connection bindings; set env values back from known-good settings file. |
| Flow mis-pointing at Dev after import | Turn flows **Off**; fix parameters/env values; re-smoke in target; only then re-activate. |
| Production | **No Production action taken in this work.** If a future Prod import fails: deactivate CRM flows immediately, revert solution upgrade/import, restore prior managed version. |

Evidence zip to keep as last-good Dev package:  
`deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-004621.zip`  
SHA-256: `b08b45bc2aad8605d13a6dbce89eb01895510ae64ab452f2ea050a369f9e3522`

Prior export (pre–env-var fix):  
`deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-003427.zip`

---

## Remediation performed (Dev only)

1. Confirmed 8 definitions + 8 values in Dataverse, 0 in solution.  
2. Added all 8 definitions to `HVCGCommandCenterDev` (`componentType` 380 by GUID).  
3. Platform also associated 8 values to the solution.  
4. Re-exported unmanaged solution; verified `environmentvariabledefinitions/` present for all 8.  
5. Generated `deployment/packages/crm/deploymentSettings-template.json` via `pac solution create-settings`.  
6. No publish, no activate, no Production.

---

## Artifacts

| Path | Role |
|------|------|
| `docs/crm/ENV_VAR_GAP_VALIDATION.md` | This report |
| `deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-004621.zip` | Post-fix export |
| `deployment/packages/crm/export-inspect-20260716-004621/` | Unpacked inspect |
| `deployment/packages/crm/deploymentSettings-template.json` | Import settings skeleton (Values empty) |
| `deployment/packages/crm/MANIFEST.json` | Updated machine summary |

---

## Conclusion mapping

| Candidate STATUS | Why not / why yes |
|------------------|-------------------|
| READY FOR DEPLOYMENT | **No** — Prod values, connection IDs, and flow defaultValue rebinding still require owner |
| **READY WITH MANUAL OWNER ACTIONS** | **Yes** — packaging gap fixed; deploy supported with explicit owner steps above |
| BLOCKED | **No** — Dev CRM flows remain operational; gap was remediable and remediated |
