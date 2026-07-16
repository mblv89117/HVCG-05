# ENVIRONMENT VARIABLE MAP — Production

**Source:** RC-1 `docs/ENVIRONMENT_VARIABLES.md` + Prod template (Dev URLs stripped)

| Schema | Prod Value | Default in template | Gate rule |
|--------|------------|---------------------|-----------|
| hvcg_CommandCenterSiteUrl | UNKNOWN (Prod SP) | empty | Required before smoke |
| hvcg_ClientsSiteUrl | UNKNOWN (Prod SP) | empty | Required before client hub flows |
| hvcg_KnowledgeSiteUrl | UNKNOWN (Prod SP) | empty | Required before knowledge flows |
| hvcg_CrmEnableTeamsNotify | `false` | `false` | Must stay false until policy + approval |
| hvcg_EnableClientEmails | `false` | `false` | Must stay false |
| hvcg_CrmTestRecipient | UNKNOWN / owner UPN | manny@… | Internal only |
| hvcg_ExecutiveEmail | UNKNOWN / owner UPN | manny@… | Internal only |
| hvcg_OpsEmail | UNKNOWN / owner UPN | manny@… | Internal only |

## Not in RC runtime (Teams channels)

| Schema | Status |
|--------|--------|
| hvcg_TeamsCrmChannelId | UNKNOWN — not required while notify Off |
| hvcg_TeamsCrmChannelGroupId | UNKNOWN |
| hvcg_TeamsCapitalChannelId | UNKNOWN |
| hvcg_TeamsCapitalChannelGroupId | UNKNOWN |

**Forbidden:** copying `*-Dev` SharePoint URLs into Prod Values.
