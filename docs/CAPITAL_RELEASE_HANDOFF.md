# Capital Operations — Release handoff

**As of:** 2026-08-17  
**Branch:** `feature/atlas-capital-operations`  
**Worktree:** `.worktrees/atlas-capital-operations`  
**Honesty:** This branch implements Hub Graph capital I/O. Production Hub App Settings are **not** switched to `sharepoint` in this checkpoint. No new SharePoint lists were created.

Capital Operations is an **internal Atlas module**, not an eighth platform.

---

## Min-slice SharePoint (reuse existing lists)

Inspected on Command Center site `highvaluecapitalgroup.sharepoint.com,92b2d35f-6f09-4ec2-8cba-28469e3588d9,ddc8e675-aa6a-46f8-9fd6-86f91dce728e` as the signed-in owner. **Do not create duplicates.**

| List | Exists | List ID | Min-slice role |
|------|--------|---------|----------------|
| HVCG_Clients | Yes | `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` | Read — resolve `ClientId` |
| HVCG_CapitalOpportunities | Yes | `255763b8-7c44-446b-8290-adde5c3c6f66` | Write — opportunity |
| HVCG_DocumentRequests | Yes | `89a421e9-3086-47ef-80c3-214500d3d92c` | Write — checklist |
| HVCG_LenderOutreach | Yes | `c49d02bb-eab5-44b5-8232-714e30867887` | Write — shortlist + submission tracking |
| HVCG_Lenders | Yes | `6b759f97-d074-4cc0-b3c7-c62c947fb74e` | Read — matching catalog |

**Not created (deferred):** HVCG_CapitalStrategies, LenderProducts, CapitalProfiles, CapitalOffers, ClosingConditions, FeeRecords, CapitalDocumentReviews.

**Live columns are still thin.** See [docs/CAPITAL_PRODUCTION_ENABLEMENT.md](CAPITAL_PRODUCTION_ENABLEMENT.md) for the owner-runnable package. Do **not** add `ChecklistItemKey`. Reuse `TemplateItemKey` / `RequestStatus`.

---

## Hub configuration (do not hard-code in application defaults)

Set on `app-atlas-integration-hub` **after** this branch is deployed, using `deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1`:

```
INTEGRATION_CAPITAL_BACKEND=sharepoint
INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID=255763b8-7c44-446b-8290-adde5c3c6f66
INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID=89a421e9-3086-47ef-80c3-214500d3d92c
INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID=c49d02bb-eab5-44b5-8232-714e30867887
INTEGRATION_CAPITAL_LENDERS_LIST_ID=6b759f97-d074-4cc0-b3c7-c62c947fb74e
INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=false
INTEGRATION_CAPITAL_OPTIONAL_COLUMNS=Stage,StageEnteredAt,NextAction,NextActionOwner,MannyStrategyApproval,MannyShortlistApproval,SubmissionStatus
```

Site ID and clients list ID reuse `INTEGRATION_PM_SHAREPOINT_SITE_ID` and `INTEGRATION_PM_CLIENTS_LIST_ID`. Identity remains `AZURE_CLIENT_ID` (`id-atlas-prod`).

Until those settings exist, Hub capital routes return **503 `CAPITAL_BACKEND_UNAVAILABLE`**. There is no JSON fallback in production.

---

## OWNER ACTION REQUIRED

**Action:** Run `deployment/scripts/Enable-HVCGCapitalMinSlice.ps1` (review) then `-Apply`. That script adds the min-slice columns, grants list-level **write** Selected permissions on the three capital lists to Hub managed identity `id-atlas-prod` (app id `2b9ca61d-2396-4caa-95cd-30200d2ff36a`), creates labeled SYN01, and creates Entra `HVCG-Client-SYN01` (Manny only). Then tell Cursor to deploy Hub.

**Why required:** Hub identity has `Lists.SelectedOperations.Selected` and `Sites.Read.All` — it **cannot** create lists or columns (`Sites.Manage.All` is absent and must stay absent). SYN01 SharePoint row without the Entra group would 403 on Hub QA and push operators onto live ACCG/PDG clients.

**What automation already attempted:** Tenant list inventory. Column inventory (thin V1 schema). Graph `POST .../columns` for `Stage` as the signed-in owner → **403 accessDenied**. Hub Graph adapter + separate allowlist implemented. Mocked create/read/update/checklist/submission tests. Elite 401/403 fail-closed. No duplicate lists created. Production App Settings **not** switched. Hub **not** deployed in this checkpoint.

**Exact permission/consent needed:** SharePoint list manage (columns) + list permissions (Selected write) + Entra group create (`HVCG-Client-SYN01`) + App Service configuration for Hub (Cursor after this script).

**Risk/cost:** Additive columns only. No list deletes. No Dataverse. Brief Hub restart when App Settings are saved later.

**What continues in parallel:** Elite Command Center, Hub JSON local mode, core matching/AI drafts, documentation.

**What becomes unblocked afterward:** Hub Graph live write of a labeled SYNTHETIC QA opportunity, read-back into `/capital`, then disable `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH`.
