# Capital Operations — Release handoff

**As of:** 2026-08-19 (LIVE overlay on the 2026-08-17 handoff)  
**Honesty worktree:** `.worktrees/atlas-phase5-docs`  
**Honesty:** This file is an owner-action package, not a deploy log. **LIVE** Hub `/health` already reports `capitalBackend.mode=sharepoint` on zip `a43803e` (Azure deploy `3d406e37-2d91-4fd6-a20b-8c955c7b5733`). **ACCG01 ACL Apply was not run.** CRM operator is **LIVE DEPLOYED**; signed-in Premium UI **HOLD**. Capital Elite `b9806bc` is in SWA `2a4e115`, not this Hub zip. No new SharePoint lists were created by this docs pass.

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

If those settings are absent, Hub capital routes return **503 `CAPITAL_BACKEND_UNAVAILABLE`**. There is no JSON fallback in production.

**LIVE (2026-08-18):** `/health` already reports `capitalBackend.mode=sharepoint`. That is the Azure App Setting observation. It is **not** ACCG01 ACL Apply and not a claim that every Selected grant in this package was executed.

---

## OWNER ACTION REQUIRED

**Action:** Run `deployment/scripts/Enable-HVCGCapitalMinSlice.ps1` (review) then `-Apply`. That script adds the min-slice columns, grants list-level **write** Selected permissions on the three capital lists to Hub managed identity `id-atlas-prod` (app id `2b9ca61d-2396-4caa-95cd-30200d2ff36a`), creates labeled SYN01, and creates Entra `HVCG-Client-SYN01` (Manny only). Then tell Cursor to deploy Hub.

**Why required:** Hub identity has `Lists.SelectedOperations.Selected` and `Sites.Read.All` — it **cannot** create lists or columns (`Sites.Manage.All` is absent and must stay absent). SYN01 SharePoint row without the Entra group would 403 on Hub QA and push operators onto live ACCG/PDG clients.

**What automation already attempted (2026-08-17 checkpoint):** Tenant list inventory. Column inventory (thin V1 schema). Graph `POST .../columns` for `Stage` as the signed-in owner → **403 accessDenied**. Hub Graph adapter + separate allowlist implemented. Mocked create/read/update/checklist/submission tests. Elite 401/403 fail-closed. No duplicate lists created.

**LIVE overlay (2026-08-19):** Hub zip `a43803e` is deployed; `/health` `capitalBackend.mode=sharepoint`. **ACCG01 ACL Apply was not run.** This docs agent does not re-run Enable/Apply scripts. Capital Elite `b9806bc` is in SWA `2a4e115`, not this Hub zip.

**Exact permission/consent needed:** SharePoint list manage (columns) + list permissions (Selected write) + Entra group create (`HVCG-Client-SYN01`) + App Service configuration for Hub (Cursor after this script).

**Risk/cost:** Additive columns only. No list deletes. No Dataverse. Brief Hub restart when App Settings are saved later.

**What continues in parallel:** Elite Command Center, Hub JSON local mode, core matching/AI drafts, documentation.

**What becomes unblocked afterward:** Hub Graph live write of a labeled SYNTHETIC QA opportunity, read-back into `/capital`, then disable `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH`.
