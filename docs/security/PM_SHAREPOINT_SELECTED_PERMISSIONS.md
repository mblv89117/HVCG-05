# Atlas Hub PM SharePoint Selected permissions

Architecture / security decision for Gate 11R-4C-V-R5.

## Decision

Retain the existing HVCG Command Center site and the four-list Microsoft Graph application permission:

`Lists.SelectedOperations.Selected`

on managed identity `id-atlas-prod`, with direct resource grants:

| List | Grant |
|------|--------|
| HVCG_Projects | write |
| HVCG_Tasks | write |
| HVCG_Milestones | write |
| HVCG_Clients | read |

Do not grant Risks, Decisions, or other non-PM lists. Do not create a dedicated PM site. Do not add an 83rd HVCG list. SharePoint remains the operational system of record.

This decision accepts a residual metadata risk. It does **not** authorize production PM App Service configuration or Hub deployment.

## Proven live control

In the tested live environment, a known-existing item on ungranted `HVCG_Decisions` returned `404 itemNotFound` to the application-worker Graph token, while a granted Projects item returned `200`. Ungranted item collections returned `200` with an empty, security-trimmed `value`. Ungranted **item / business-data** access was not demonstrated.

**ITEM/BUSINESS-DATA ISOLATION = PLATFORM-ENFORCED IN THE TESTED LIVE ENVIRONMENT**

This is observed tenant behavior, not a Microsoft contractual guarantee.

## Residual exposure

With only `Lists.SelectedOperations.Selected` and the four list grants, the raw managed-identity token was able to:

- enumerate Command Center list catalog metadata (`GET /sites/{site-id}/lists`)
- resolve metadata for ungranted lists (including Risks and Decisions)
- retrieve ungranted column/schema metadata

**CATALOG/SCHEMA METADATA ISOLATION = NOT PLATFORM-ENFORCED IN THE TESTED LIVE ENVIRONMENT**

Do not claim that Selected permissions provide metadata isolation in this tenant.

## Classification

**MODERATE METADATA / RECONNAISSANCE RISK**

Not proven cross-list business-data leakage.

## Compensating controls

Application defense-in-depth (not a substitute for Microsoft authorization):

- isolated user-assigned managed identity on Hub only
- exact configured PM site (`INTEGRATION_PM_SHAREPOINT_SITE_ID`)
- exact four-list transport allowlist from server configuration
- capability matrix (Clients read-only; no PM DELETE; archive remains `501 PM_OPERATION_NOT_IMPLEMENTED`)
- no arbitrary Graph proxy
- no `/lists` catalog operation
- no `/columns` operation
- no generic metadata endpoint
- strict `@odata.nextLink` validation (HTTPS, `graph.microsoft.com`, same site, same list, items only)
- Graph data-plane redirect rejection (`redirect: 'manual'`)
- token memory-only; no token/`IDENTITY_HEADER` logging
- existing Hub JWT, role, ClientCode, project, and ETag authorization

## Important limitation

Application controls protect **normal application execution**. They do **not** prevent catalog/schema metadata access after:

- worker RCE
- malicious replacement code
- managed-identity token disclosure

Do not describe these compensating controls as platform-enforced.

## Revisit triggers

Require architectural re-review if any of the following occurs:

- Microsoft documentation changes Selected behavior materially
- live item isolation stops denying ungranted items
- metadata exposed by Graph becomes materially more sensitive
- regulated or sensitive schema is added to the Command Center
- Hub's threat classification materially increases
- arbitrary Graph proxy behavior is introduced
- a dedicated PM-site migration is otherwise justified
