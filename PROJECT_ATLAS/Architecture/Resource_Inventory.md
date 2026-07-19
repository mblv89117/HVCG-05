# Resource Inventory — Project Atlas (HVCG Production)

**Subscription:** HVCG Production (`ebc84d85-b5ff-4c4b-add1-b0a8de31b319`)  
**Tenant:** `3df46563-86f3-4414-87fd-84ba967741ef`  
**Region:** westus3 (SWA may use supported SWA region)  
**Owner:** Manuel Barela  
**Inventory date:** 2026-07-19 (Sprint 11)

## Deprecated

| ID | Name | Status |
|----|------|--------|
| `866189c6-5aa0-4037-8094-05771caceb0d` | Azure subscription 1 | Permanently deprecated for Atlas |

## Resource groups

| Name | Environment |
|------|-------------|
| rg-atlas-dev | Development |
| rg-atlas-prod | Production |
| rg-atlas-shared | Shared |
| rg-atlas-network | Shared |
| rg-atlas-security | Production |
| rg-atlas-monitoring | Production |

## Resources

| Name | Type | RG |
|------|------|-----|
| law-atlas-prod | Log Analytics workspace | rg-atlas-monitoring |
| appi-atlas-prod | Application Insights | rg-atlas-monitoring |
| ag-atlas-ops | Action group | rg-atlas-monitoring |
| kv-atlas-hvcg-ebc84d85 | Key Vault | rg-atlas-security |
| id-atlas-prod | User-assigned Managed Identity | rg-atlas-shared |
| swa-atlas-elite-os-dev | Static Web App | rg-atlas-dev |
| budget-atlas-100 | Consumption budget ($100/mo) | subscription |

**SWA URL:** https://zealous-rock-0090c7e1e.7.azurestaticapps.net  
**SWA location:** West US 2

## Identity references

| Item | Value |
|------|-------|
| Entra SPA (Elite OS Dev) | `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| Managed Identity clientId | `2b9ca61d-2396-4caa-95cd-30200d2ff36a` |
| Managed Identity principalId | `6fbaf3e8-1baf-4391-b832-973c8964ad7d` |
| Key Vault URI | `https://kv-atlas-hvcg-ebc84d85.vault.azure.net/` |

## Related Microsoft 365 (not Azure sub-scoped)

| Item | Value |
|------|-------|
| Dataverse Dev | `https://org1131a2b0.crm.dynamics.com` |
| Model-driven app | `dea8a490-4b82-f111-ab0e-6045bd0193e8` |

Refresh this file after any provision run of `provision-atlas-foundations.sh`.
