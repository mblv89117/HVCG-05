# Architecture Guide — Project Atlas (Sprint 11 Azure production)

## Verdict

Production remains **Microsoft-native**. Sprint 11 migrates Azure hosting/cost/identity foundations to **HVCG Production** without changing the Power Platform / Entra / Graph architecture.

## Microsoft platform stack (unchanged)

| Capability | Platform |
|------------|----------|
| Identity | Microsoft Entra ID |
| System of record (ops) | Dataverse |
| Documents | SharePoint / OneDrive |
| Low-code apps | Power Apps (model-driven Command Center) |
| Automation | Power Automate |
| Collaboration | Teams / Outlook |
| Graph APIs | Microsoft Graph |
| Executive React experience | Azure Static Web Apps + MSAL |
| Secrets | Azure Key Vault (RBAC) |
| Telemetry | Application Insights + Log Analytics |

## Azure production subscription

- **HVCG Production** — `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`
- Region: `westus3`
- Deprecated forever: `866189c6-5aa0-4037-8094-05771caceb0d`

## Scalability notes (years ahead)

1. Keep Dataverse as SoR; SWA remains presentation + Graph/Dataverse client.
2. Use `id-atlas-prod` managed identity for Azure-to-Azure secret access; never embed secrets in SWA.
3. Reserve `rg-atlas-network` for Private Endpoints when Dataverse/SharePoint hybrid private access is required.
4. Split Dev (`rg-atlas-dev`) from Prod (`rg-atlas-prod`) for SWA and future App Service slots.
5. Budget $100/mo with staged alerts before scaling paid SKUs.

## Non-goals (Sprint 11)

- No Production Power Platform environment cutover without separate owner gate.
- No live client communications.
- No architecture departure to non-Microsoft hosting.
