# PRODUCTION VALIDATION REPORT — Track 1 Live - Internal

**Tag:** Track 1 Live - Internal  
**Generated:** 2026-07-16T03:08Z  
**Verdict:** **INTERNALLY PRODUCTION READY**  
**Agent:** deployment-engineer (`cursor/deployment-engineer`)  

---

## 1. Production environment IDs

| Field | Value |
|-------|-------|
| Display name | HVCG Production |
| Environment ID | `f141a2cf-ae13-eb59-84c4-25817d899105` |
| Organization ID | `a34bbff3-b380-f111-8068-6045bd0a1f11` |
| Unique name | `unqa34bbff3b380f11180686045bd0a1` |
| Environment URL | `https://orgee2f7545.crm.dynamics.com/` |
| Type | Production |
| Region | United States |
| PAC profile | `HVCG-Dev-Maker` · `manny@highvaluecapitalgroup.com` |

**Managed solution**

| Field | Value |
|-------|-------|
| Unique name | `HVCGCommandCenterDev` |
| Friendly name | HVCG Command Center DEV |
| Version | `1.1.0.1` |
| Managed | True |
| Solution ID | `f3284fd3-fd4a-44a8-bc3a-b6963b8595d5` |
| Frozen package SHA-256 | `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf` |

**Config solution (unmanaged)**

| Field | Value |
|-------|-------|
| Unique name | `HVCGProductionConfig` |
| Version | `1.0.0.0` |
| Prod export SHA-256 | `1d216ae15cde97afe1bf6133a6ff4e39571d866fade0e0b0b2b0baf10ab1e188` |

---

## 2. Activated flows

| Flow | workflowid | statecode | statuscode |
|------|------------|-----------|------------|
| HVCG_LeadQualifiedCreateOpportunity | `1716e663-153f-5588-af1a-56f3fb9ec2d4` | Activated | Activated |

**Count:** 1 Activated  

**Live site binding (LeadQualified):** parameter `hvcg_CommandCenterSiteUrl` defaultValue =  
`https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter`  
(Prod-layer patch applied 2026-07-16T03:00Z; verified at freeze — no `*-Dev` in clientdata)

---

## 3. Draft flows

| Flow | statecode |
|------|-----------|
| HVCG_OpportunityStageChangedNotify | Draft |
| HVCG_OpportunityWonCloseout | Draft |
| HVCG_CapitalFundingStatusNotify | Draft |
| HVCG_ClientOnboarding | Draft |
| HVCG_CreateClientWorkspace | Draft |
| HVCG_CreateDocumentRequests | Draft |
| HVCG_CreateProjectFromTemplate | Draft |
| HVCG_DeliverableApproval | Draft |
| HVCG_ExecutiveDecisionEscalation | Draft |
| HVCG_MissingDocumentReminders | Draft |
| HVCG_OverdueTaskEscalation | Draft |
| HVCG_RenewalReminders | Draft |
| HVCG_UpdateProjectHealth | Draft |
| HVCG_WeeklyStatusSummary | Draft |

**Count:** 14 Draft  

---

## 4. Connection references

| Logical name | Display | ConnectionId | PAC Status |
|--------------|---------|--------------|------------|
| hvcg_sharedsharepointonline | HVCG SharePoint | `f2e0400083e44915828d5bf9f6069a2e` | Connected |
| hvcg_sharedoffice365 | HVCG Outlook | `ac42d3339d4f4841a21f86dade898123` | Connected |
| hvcg_sharedteams | HVCG Teams | `305c5c5e2c80407fac9d5993d54cdae9` | Connected |
| hvcg_sharedapprovals | HVCG Approvals | `620037803eda4c06b748ac66e9196c9b` | Connected |

**Bound:** 4/4  

Note: Maker UI may show connection reference Status “Off”; Dataverse `connectionid` is authoritative.

---

## 5. Environment variables

| Schema | Current Value | Gate |
|--------|---------------|------|
| hvcg_CommandCenterSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` | Prod |
| hvcg_ClientsSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients` | Prod |
| hvcg_KnowledgeSiteUrl | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge` | Prod |
| hvcg_CrmEnableTeamsNotify | `false` | **Off** |
| hvcg_EnableClientEmails | `false` | **Off** |
| hvcg_ExecutiveEmail | `manny@highvaluecapitalgroup.com` | |
| hvcg_OpsEmail | `manny@highvaluecapitalgroup.com` | |
| hvcg_CrmTestRecipient | `manny@highvaluecapitalgroup.com` | |

**INFO:** Definition DefaultValues may still contain `*-Dev` URLs; Current **Values** are Prod / gates Off.  
LeadQualified flow uses a plain parameter (Prod) in addition to env Values — see diagnosis in `smoke/PROD_LEADQUALIFIED_DIAGNOSIS.md`.

---

## 6. Smoke test results

| Suite | Result | When | Evidence |
|-------|--------|------|----------|
| Prod readonly smoke | **PASS** (8 PASS · 0 FAIL · 1 INFO) | 2026-07-16T02:33Z | `smoke/PROD_SMOKE_READONLY_REPORT.md` |
| Prod LeadQualified functional | **PASS** (0 fails) | 2026-07-16T03:02Z | `smoke/PROD_LEADQUALIFIED_FUNCTIONAL_SMOKE_PASS.md` |

Functional detail: lead Id=2 → opportunity 2 · activity 2 · Succeeded log 4 (`Created opportunity 2 for lead 2`). Prior lead Id=1 also converted after site-URL fix.

---

## 7. Rollback procedure

See also `guides/ROLLBACK.md`.

### Immediate (incident)

1. Set `HVCG_LeadQualifiedCreateOpportunity` to **Draft/Off** (Dataverse SetState state=0/status=1, or Maker Turn off).  
2. Confirm Teams notify and client emails remain **false**.  
3. Stop further Prod SharePoint CRM writes / smoke harness runs.

### Solution / package

1. Prefer restoring from this freeze: managed import-anchor  
   `solution/HVCGCommandCenterDev_managed_1.1.0.1_IMPORT_ANCHOR.zip`  
   SHA-256 `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf`  
2. Re-apply LeadQualified Prod site URL layer from  
   `solution/HVCG_LeadQualifiedCreateOpportunity.clientdata.PROD_LAYER.json` if re-import resets Dev default.  
3. Re-import / repair `HVCGProductionConfig` from  
   `backup/HVCGProductionConfig_unmanaged_1.0.0.0_PROD_EXPORT.zip` if connection refs unbound.  
4. Uninstall managed `HVCGCommandCenterDev` **only** with explicit owner approval (first Prod import — no prior managed version to roll to).

### SharePoint

- Smoke rows (leads 1–2 and related opp/act/logs) may remain; delete only with owner acknowledgment.  
- Do **not** delete HVCG Production environment or Prod SharePoint sites without separate approval.

### Note on managed export

Prod cannot re-export managed solutions. This freeze uses the **import-anchor zip** + live snapshots + Prod config export as the backup set.

---

## 8. Explicit non-actions at this tag

| Action | Status |
|--------|--------|
| Activate additional flows | **Not done** |
| Publish Canvas | **Not done** |
| Enable Teams notifications | **Not done** (false) |
| Enable client emails | **Not done** (false) |
| Import client / pilot data | **Not done** |
| DNS / website publish | **Not done** |

---

## 9. Declaration

**Track 1 is marked internally production ready** under deployment tag **Track 1 Live - Internal**.
