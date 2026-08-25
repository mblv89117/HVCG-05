# Safety controls
- Generated: 2026-07-22T04:40:55Z
- Live Dataverse check: **yes** (`https://orgee2f7545.crm.dynamics.com`)
- hvcg_EnableClientEmails: `false`
- hvcg_CrmEnableTeamsNotify: `false`
- External client email / MissingDocumentReminders / RenewalReminders / Eva: **Off**
- Legacy ClientId fields preserved
- HVS files untouched
- Verdict: **GREEN**

## Live flow On/Off (statecode 1 = On)

| Flow | On | statecode | statuscode |
|------|----|-----------|------------|
| HVCG_MissingDocumentReminders | Off | 0 | 1 |
| HVCG_RenewalReminders | Off | 0 | 1 |
| HVCG_EvaFormCreateLead | Off | 0 | 1 |
| HVCG_CapitalFundingStatusNotify | Off | 0 | 1 |
| HVCG_CreateClientWorkspace | On | 1 | 2 |
| HVCG_DeliverableApproval | On | 1 | 2 |
| HVCG_CreateProjectFromTemplate | On | 1 | 2 |
| HVCG_CreateDocumentRequests | On | 1 | 2 |
| HVCG_ExecutiveDecisionEscalation | On | 1 | 2 |

