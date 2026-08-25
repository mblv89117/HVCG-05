# HVCG Production Cloud Flow Matrix

**Generated:** 2026-07-21T19:25:03.149346Z
**Dataverse:** https://orgee2f7545.crm.dynamics.com
**SharePoint:** https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
**Managed package:** `releases/v1.1.5/artifacts/HVCGCommandCenterDev_1.1.5.0_managed.zip`

## Verdict

- **Atlas fully Production-ready claim:** `False`
- **Reason:** Automation layer is deployed and visible; safe internals tested Succeeded. Not claiming full Production-ready: scaffold child flows still need full business implementations; orphaned ClientId lookups remain in SharePoint schema; Eva/client-email flows intentionally Off.
- **HVCG Production Config cloud flows (component type 29):** **16** (was 0)
- **Managed HVCGCommandCenterDev version:** 1.1.5.0
- **Required minimum present:** 12/12

## Solutions

| Unique name | Friendly | Version | Managed |
|---|---|---|---|
| HVCGProductionConfig | HVCG Production Config | 1.0.0.0 | False |
| HVCGCommandCenterDev | HVCG Command Center DEV | 1.1.5.0 | True |

## Connection references (Prod)

| Logical name | Display | ConnectionId |
|---|---|---|
| hvcg_sharedsharepointonline | HVCG SharePoint | `f2e0400083e44915828d5bf9f6069a2e` |
| hvcg_sharedoffice365 | HVCG Outlook | `ac42d3339d4f4841a21f86dade898123` |
| hvcg_sharedteams | HVCG Teams | `305c5c5e2c80407fac9d5993d54cdae9` |
| hvcg_sharedapprovals | HVCG Approvals | `620037803eda4c06b748ac66e9196c9b` |

## Environment variables (current values)

- `hvcg_ClientsSiteUrl` = `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients`
- `hvcg_CommandCenterSiteUrl` = `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter`
- `hvcg_CrmEnableTeamsNotify` = `false`
- `hvcg_CrmTestRecipient` = `manuel@highvaluecapitalgroup.com`
- `hvcg_EnableClientEmails` = `false`
- `hvcg_ExecutiveEmail` = `manuel@highvaluecapitalgroup.com`
- `hvcg_KnowledgeSiteUrl` = `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge`
- `hvcg_OpsEmail` = `manuel@highvaluecapitalgroup.com`

## Flow matrix

| Flow name | Trigger | Prod connection status | On/Off | Test result | External communication risk | Safe for activation |
|---|---|---|---|---|---|---|
| HVCG_CapitalFundingStatusNotify | Recurrence | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | Medium (Teams notify when flag true) | False |
| HVCG_ClientOnboarding* | Recurrence (15 min poll) | SharePoint/Outlook/Teams/Approvals bound | **On** | Succeeded | Low (reads Active Clients + logs; no client email) | True |
| HVCG_CreateClientWorkspace* | Manual button | SharePoint/Outlook/Teams/Approvals bound | **On** | Activated only (manual trigger; not force-run this pass) | Low (scaffold; no outbound email) | True |
| HVCG_CreateDocumentRequests* | Manual button | SharePoint/Outlook/Teams/Approvals bound | **On** | Activated only (manual trigger; not force-run this pass) | Low (scaffold) | True |
| HVCG_CreateProjectFromTemplate* | Manual button | SharePoint/Outlook/Teams/Approvals bound | **On** | Activated only (manual trigger; not force-run this pass) | Low (scaffold) | True |
| HVCG_DeliverableApproval* | Manual button | SharePoint/Outlook/Teams/Approvals bound | **On** | Activated only (manual trigger; not force-run this pass) | Low (Approvals connector; no client email) | True |
| HVCG_EvaFormCreateLead* | HTTP Request (manual) | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | Low (no prospect email; HTTP endpoint exposure if On) | False |
| HVCG_ExecutiveDecisionEscalation* | Manual button | SharePoint/Outlook/Teams/Approvals bound | **On** | Activated only (manual trigger; not force-run this pass) | Low (scaffold; internal) | True |
| HVCG_LeadQualifiedCreateOpportunity | Recurrence (1 min) | SharePoint/Outlook/Teams/Approvals bound | **On** | Already Activated pre-release; left On | Low (Teams gated by hvcg_CrmEnableTeamsNotify=false) | True |
| HVCG_MissingDocumentReminders* | Recurrence (daily) | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | HIGH if enabled (client-email capable by design) | False |
| HVCG_OpportunityStageChangedNotify | Recurrence | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | Medium (Teams notify when flag true) | False |
| HVCG_OpportunityWonCloseout | Recurrence | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | Medium (Teams notify when flag true) | False |
| HVCG_OverdueTaskEscalation* | Recurrence (daily) | SharePoint/Outlook/Teams/Approvals bound | **On** | Succeeded | None (internal AutomationLogs only) | True |
| HVCG_RenewalReminders* | Recurrence (daily) | SharePoint/Outlook/Teams/Approvals bound | **Off** | Not run (intentionally Off) | HIGH if enabled (client-email capable by design) | False |
| HVCG_UpdateProjectHealth* | Recurrence (daily) | SharePoint/Outlook/Teams/Approvals bound | **On** | Succeeded | None (SharePoint read + AutomationLogs) | True |
| HVCG_WeeklyStatusSummary* | Recurrence (weekly) | SharePoint/Outlook/Teams/Approvals bound | **On** | Succeeded | None (internal AutomationLogs only; EnableClientEmails=false) | True |

\* = required minimum set

## Known limitations

- Orphaned SharePoint lookup columns named ClientId on HVCG_Projects/HVCG_Tasks break default GetItems; fixed flows use SharePoint HttpRequest with $select.
- Several child/manual flows (CreateClientWorkspace, CreateProjectFromTemplate, CreateDocumentRequests, DeliverableApproval, ExecutiveDecisionEscalation) remain scaffold-level (log/compose) but are solution-aware, connection-ref bound, and Activated.
- HVCG_EvaFormCreateLead is deployed Off (HTTP intake; no client email).
- Owner originally inspected HVCG Production Config when it had 0 flows; flows lived in managed HVCGCommandCenterDev. They are now layered into Production Config as well (16 workflow components).

## Owner note

No Maker consent stop was required this pass: Production connection references already had ConnectionIds bound. If a future import clears bindings, the single owner path is:

1. https://make.powerautomate.com → Environment **HVCG Production**
2. Solutions → **HVCG Production Config** (or **HVCG Command Center DEV**) → Connection references
3. Bind SharePoint / Outlook / Teams / Approvals → Save

