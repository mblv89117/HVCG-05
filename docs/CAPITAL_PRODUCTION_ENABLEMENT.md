# Atlas Capital Operations — Production enablement

**Source checkpoint:** `d50a4b2` plus this enablement commit on `feature/atlas-capital-operations`.  
**Owner task:** authenticate → review targets → run **one** script. Cursor then deploys Hub and certifies.

This is **not** a new platform. No new SharePoint lists. No `Sites.Manage.All` on Hub runtime identity.

---

## What Manny runs (PnP app first — not Enable -Apply)

```powershell
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-capital-operations"

# 1. Review the provisioning app (no Entra mutation)
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1

# 2. Register it (interactive + MFA, Client ID only into gitignored development.json)
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig

# 3. Complete Capital WhatIf (no production writes)
pwsh -File ./deployment/scripts/Enable-HVCGCapitalMinSlice.ps1
```

Do **not** run Enable `-Apply` until step 3 prints a complete WHATIF summary.

The PnP app is `HVCG-PnP-Capital-Provisioning` (single-tenant public client, `AllSites.Manage` + Graph `User.Read`). It is not `id-atlas-prod`. See [docs/deployment/PNP_AUTHENTICATION.md](deployment/PNP_AUTHENTICATION.md).

Prerequisites: `az login` as `manny@highvaluecapitalgroup.com` on HVCG Production, and HVCG PnP interactive login (same as other Command Center scripts).

After `-Apply`, tell Cursor: **deploy Hub and continue certification.** Do not set `INTEGRATION_CAPITAL_BACKEND=sharepoint` on the currently running Hub yourself.

Cursor sequence after approval:

1. `Deploy-HVCGCapitalHub.ps1 -Apply` (archives current `server.js`, deploys this commit)
2. `Set-HVCGCapitalHubAppSettings.ps1 -Apply -AllowSyntheticGraph` (temporary QA window)
3. `Invoke-HVCGCapitalLiveQa.mjs` (real Hub → Graph → SharePoint)
4. `Cleanup-HVCGCapitalQa.ps1 -Apply` (mark/delete labeled SYNTHETIC QA rows; keep SYN01)
5. `Set-HVCGCapitalHubAppSettings.ps1 -Apply` (synthetic Graph **false**)
6. Prove SYN01 create is denied and `/health` still ok

---

## A. Exact SharePoint site

| Item | Value |
|------|--------|
| Hostname | `highvaluecapitalgroup.sharepoint.com` |
| Site URL | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` |
| Graph site ID | `highvaluecapitalgroup.sharepoint.com,92b2d35f-6f09-4ec2-8cba-28469e3588d9,ddc8e675-aa6a-46f8-9fd6-86f91dce728e` |
| Tenant | `3df46563-86f3-4414-87fd-84ba967741ef` |
| Subscription | HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319` |

| Display name | List ID | Role |
|--------------|---------|------|
| HVCG_CapitalOpportunities | `255763b8-7c44-446b-8290-adde5c3c6f66` | write |
| HVCG_DocumentRequests | `89a421e9-3086-47ef-80c3-214500d3d92c` | write |
| HVCG_LenderOutreach | `c49d02bb-eab5-44b5-8232-714e30867887` | write |
| HVCG_Lenders | `6b759f97-d074-4cc0-b3c7-c62c947fb74e` | read (Sites.Read.All already covers catalog; no extra grant) |
| HVCG_Clients | `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` | read (already granted) |

Script **fails** if any of those list IDs do not match, including HVCG_Clients.

---

## B. Exact additive columns (minimum only)

Reconciled against Hub mapper (`apps/atlas-integration-api/src/capital/sharepoint/map.ts`) and live columns.

**Reused (do not add):**

| Need | Existing field |
|------|----------------|
| Opportunity amount | `TargetAmount` |
| Legacy status / Power Automate | `FundingStatus` (do **not** overload with 23 stages) |
| Opportunity idempotency | `HVCG_IdempotencyKey` (**CORE**, already on opportunities) |
| Checklist identity | `TemplateItemKey` |
| Checklist status | `RequestStatus` |
| Checklist/opportunity relation | `CapitalOpportunityId` |
| Checklist idempotency | `HVCG_IdempotencyKey` (already on document requests; Hub now writes `cap-chk|{opp}|{itemKey}`) |
| Outreach relation | `CapitalOpportunityId`, `LenderId` |
| Outreach timestamp / submitter | `OutreachDate`, `OwnerEmail` |

`Notes` still stores an `ATLAS_CAPITAL_STATE:` fallback. Explicit columns below are added because stuffing pipeline state only into operator Notes is semantically unsafe.

### HVCG_CapitalOpportunities — add

| Display / internal | Type | Required | Default | Values | Indexed | Live? | Why |
|--------------------|------|----------|---------|--------|---------|-------|-----|
| Stage | Choice | no | NeedIdentified | 23 `CAPITAL_STAGES` | yes | **missing** | CREATE/READ/UPDATE + stage transition. Distinct from `FundingStatus`. |
| StageEnteredAt | DateTime | no | — | — | no | **missing** | Aging / days in stage |
| NextAction | Note | no | — | — | no | **missing** | Next-action update (`POST …/next-action`) |
| NextActionOwner | Text | no | — | — | yes | **missing** | Who owns the next action |
| MannyStrategyApproval | Choice | no | NOT_REQUIRED | NOT_REQUIRED PENDING APPROVED REJECTED REVISE | yes | **missing** | Strategy approval state |
| MannyShortlistApproval | Choice | no | NOT_REQUIRED | same | no | **missing** | Shortlist gate before recorded submission |

Not added: TransactionType, Purpose, Blockers, Risk, ClientApproval, ClosingReadiness, NextActionDue (Notes fallback / later).

### HVCG_DocumentRequests — add **none**

### HVCG_LenderOutreach — add

| Display / internal | Type | Required | Default | Values | Indexed | Live? | Why |
|--------------------|------|----------|---------|--------|---------|-------|-----|
| SubmissionStatus | Choice | no | draft | draft submitted acknowledged rfi underwriting offer declined withdrawn | yes | **missing** | Shortlist vs recorded-only submission. `Response` is the **lender** reply — do not overload. |
| HVCG IdempotencyKey / HVCG_IdempotencyKey | Text | no | — | — | yes | **missing** | **CORE** on this list (not an additive mapper field). Idempotent outreach/submission replay |

Not added: SubmissionMethod, SubmittedAt, SubmittedBy (reuse OutreachDate / OwnerEmail).

---

## C. Exact managed identity (verified live 2026-08-18)

| Item | Value |
|------|--------|
| Name | `id-atlas-prod` |
| Resource group | `rg-atlas-shared` |
| **Application / client ID** | `2b9ca61d-2396-4caa-95cd-30200d2ff36a` |
| **Principal / object ID** | `6fbaf3e8-1baf-4391-b832-973c8964ad7d` |

Verified with `az identity show`. The application ID is what Graph list permissions `grantedToV2.application.id` uses. The object ID is the directory principal. Do not swap them.

Runtime Graph roles already present: `Lists.SelectedOperations.Selected`, `Sites.Read.All`. **Do not add `Sites.Manage.All`.**

---

## D. Exact Selected grants

List-level Graph permission **write** on:

- HVCG_CapitalOpportunities
- HVCG_DocumentRequests
- HVCG_LenderOutreach

Same pattern as existing HVCG_Clients **read** grant. No site-wide write. No owner role. Lenders/Clients: no new grant.

Provisioning uses Manny PnP + delegated Graph. Runtime Hub identity is only the **grantee**.

---

## E. Exact Hub App Settings (apply **after** this Hub build is deployed)

App: `app-atlas-integration-hub` / `rg-atlas-prod`. Restart: App Settings change recycles the app.

| Setting | Production value | Secret? | Source |
|---------|------------------|---------|--------|
| INTEGRATION_CAPITAL_BACKEND | `sharepoint` | no | this package |
| INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID | `255763b8-7c44-446b-8290-adde5c3c6f66` | no | live list |
| INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID | `89a421e9-3086-47ef-80c3-214500d3d92c` | no | live list |
| INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID | `c49d02bb-eab5-44b5-8232-714e30867887` | no | live list |
| INTEGRATION_CAPITAL_LENDERS_LIST_ID | `6b759f97-d074-4cc0-b3c7-c62c947fb74e` | no | live list |
| INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH | `false` (temporarily `true` only during labeled QA) | no | this package |
| INTEGRATION_CAPITAL_OPTIONAL_COLUMNS | `Stage,StageEnteredAt,NextAction,NextActionOwner,MannyStrategyApproval,MannyShortlistApproval,SubmissionStatus` | no | additive columns this script adds. **Do not list HVCG_IdempotencyKey** — it is CORE |
| INTEGRATION_CLIENT_ENTITLEMENT_GROUPS | existing seven mappings **plus** `{newGroupId}:SYN01` | no (group IDs) | Enable script prints `SYN01_ENTRA_GROUP_ID`. Script appends; never empties the map |

Site ID and clients list reuse existing `INTEGRATION_PM_SHAREPOINT_SITE_ID` and `INTEGRATION_PM_CLIENTS_LIST_ID`. `AZURE_CLIENT_ID` already set to Hub MI. Token encryption and Entra secrets stay in the existing App Service / Key Vault locations — **do not print them**.

Never set `INTEGRATION_CAPITAL_BACKEND=development-json` in production.

`Set-HVCGCapitalHubAppSettings.ps1` refuses to run until `GET /health` reports `capitalBackend` (proves the new Hub build is live).

---

## F. Deployment target

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` |
| RG | `rg-atlas-prod` |
| OS | Linux Node 22, `node server.js` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Build | git `feature/atlas-capital-operations` HEAD after this enablement commit |
| Mechanism | `Deploy-HVCGCapitalHub.ps1` — esbuild bundle → zip → `az webapp deploy`. Archives current Kudu `server.js` under `deployment/artifacts/hub-rollback/` (gitignored) |
| Health | `GET /health` → `ok`, `pmBackend.mode=sharepoint`, after settings `capitalBackend.mode=sharepoint` |
| Rollback | `Rollback-HVCGCapitalHub.ps1 -Apply` restores archived zip and **deletes all `INTEGRATION_CAPITAL_*` keys together**. Does not delete lists/columns. Does not shrink entitlement map |

GitHub workflows do **not** deploy Hub.

---

## Pre-flight (verified 2026-08-18, refreshed this package)

| ITEM | CURRENT STATE | REQUIRED STATE | CHANGE REQUIRED | RISK |
|------|---------------|----------------|-----------------|------|
| Tenant / subscription | HVCG Production, Manny signed in | same | no | none |
| Hub MI client/principal IDs | match table C | match | no | none |
| Site / list IDs | match table A | match | no | none |
| Opportunity columns Stage/NextAction/Manny* | missing | present | **yes** | additive |
| DocumentRequests TemplateItemKey / RequestStatus | present | reuse | no | none |
| Outreach SubmissionStatus / HVCG_IdempotencyKey | missing | present | **yes** | additive |
| Hub MI Graph roles | Selected + Sites.Read.All | same (no Manage) | no | none |
| List write grants on 3 capital lists | none | write | **yes** | least-privilege list grants |
| Clients read grant | present | keep | no | none |
| SYN01 SharePoint client | **absent** | labeled QA row | **yes** | new labeled client only |
| Entra `HVCG-Client-SYN01` | **absent** | group + Manny only + Hub map | **yes** | without this, SYN01 Hub writes 403 and operators would hit live ACCG/PDG |
| INTEGRATION_CAPITAL_* App Settings | absent | sharepoint + IDs | **yes, after Hub deploy** | Hub recycle |
| INTEGRATION_PM_BACKEND | sharepoint | keep | no | none |
| INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH | unset | false (true only during QA) | after deploy | QA window |
| Current Hub `/health` | no `capitalBackend` | field present after deploy | **yes, deploy** | PM regression if bundle wrong |

---

## Mappings (Hub → SharePoint)

| Hub | SharePoint |
|-----|------------|
| title | Title |
| clientCode | ClientCode |
| clientId lookup | ClientIdLookupId → HVCG_Clients |
| need.requestedAmount | TargetAmount |
| stage | Stage (+ FundingStatus via `STAGE_TO_LEGACY_FUNDING_STATUS`) |
| nextAction / nextActionOwner | NextAction / NextActionOwner |
| mannyStrategyApproval / mannyShortlistApproval | same names |
| idempotencyKey (opportunity) | HVCG_IdempotencyKey (CORE, already exists) |
| checklist itemKey | TemplateItemKey |
| checklist status | RequestStatus |
| checklist idempotency | HVCG_IdempotencyKey = `cap-chk|{opp}|{itemKey}` |
| lenderId | LenderIdLookupId (existing lookup; numeric SharePoint item id) |
| submission status | SubmissionStatus |
| outreach idempotency | HVCG_IdempotencyKey = `cap-sub|{opp}|{lender}|{version}` |
| submission recorded-only | Notes + `recordedOnly` API; never portal submit |

---

## Changes this package will NOT make

- no new SharePoint lists
- no destructive column/list deletes
- no `Sites.Manage.All` on `id-atlas-prod`
- no site-wide write
- no production client mutation beyond labeled SYN01 / SYNTHETIC QA rows
- no external lender communication
- no Hub deploy from the Enable script (separate, after this code is committed)

---

## Expected interruption

Enable `-Apply`: SharePoint column adds + Graph permission POSTs. No Hub recycle.

Hub deploy: brief App Service restart (PM `/health` must return `ok`).

App Settings `-Apply`: Hub recycle. Capital routes 503 until settings finish; PM should remain.

---

## Rollback

```powershell
pwsh -File ./deployment/scripts/Rollback-HVCGCapitalHub.ps1          # review
pwsh -File ./deployment/scripts/Rollback-HVCGCapitalHub.ps1 -Apply
```

Git rollback SHA for the capital Hub implementation: `277541c`.
