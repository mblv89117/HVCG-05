# Environment Variables — RC-1 Development Baseline

**Solution:** `HVCGCommandCenterDev`  
**Proven in:** HVCG Development  
**STATUS:** Definitions + Dev values are included in the RC solution export  

---

## Included in solution export (8)

| Schema name | Role | Dev current value (summary) |
|-------------|------|-----------------------------|
| `hvcg_CommandCenterSiteUrl` | CRM flow SharePoint site | Dev Command Center URL |
| `hvcg_CrmEnableTeamsNotify` | Teams notify gate | `false` |
| `hvcg_CrmTestRecipient` | Test notification UPN | Owner UPN |
| `hvcg_EnableClientEmails` | Client email gate | `false` |
| `hvcg_ExecutiveEmail` | Executive recipient | Owner UPN |
| `hvcg_OpsEmail` | Ops recipient | Owner UPN |
| `hvcg_ClientsSiteUrl` | Clients hub site | Dev Clients URL |
| `hvcg_KnowledgeSiteUrl` | Knowledge site | Dev Knowledge URL |

CRM smoke flows **require** `hvcg_CommandCenterSiteUrl` and `hvcg_CrmEnableTeamsNotify` (also present as flow parameter defaults).

---

## Intentionally not in Dev / not in RC runtime

| Schema name | Why |
|-------------|-----|
| `hvcg_TeamsCrmChannelId` | Teams notify Off; channel IDs are tenant-specific |
| `hvcg_TeamsCrmChannelGroupId` | Same |
| `hvcg_TeamsCapitalChannelId` | Same |
| `hvcg_TeamsCapitalChannelGroupId` | Same |

### How Production will obtain Teams channel vars (when approved)

1. Create definitions (or add to solution after creation).
2. Owner sets current values to Production team/channel IDs.
3. Keep gate `false` until UAT on test channels.
4. Owner approves enabling `hvcg_CrmEnableTeamsNotify`.

---

## Production value strategy

1. Do **not** import Dev current values into Production unchanged.
2. Fill `settings/deploymentSettings-template.json` → private target file `EnvironmentVariables[].Value`.
3. After import, verify CRM flow parameters are not still using Dev SharePoint `defaultValue`s.

See `validation/ENV_VAR_GAP_VALIDATION.md` for remediation history and risks.
