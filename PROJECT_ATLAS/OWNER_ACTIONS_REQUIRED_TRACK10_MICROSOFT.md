# OWNER UPDATE — Track 10 / Sprint 11 Microsoft hosting

## Resolved by Sprint 11

The prior blocker (disabled Azure subscription `866189c6-5aa0-4037-8094-05771caceb0d`) is **closed**.

**Permanent production subscription:** HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`

That deprecated subscription must **never** be used again for Atlas.

## Completed Azure foundations

| Item | Value |
|------|-------|
| Resource groups | `rg-atlas-dev/prod/shared/network/security/monitoring` |
| Key Vault | `kv-atlas-hvcg-ebc84d85` |
| Log Analytics | `law-atlas-prod` |
| App Insights | `appi-atlas-prod` |
| Managed Identity | `id-atlas-prod` |
| Budget | `budget-atlas-100` ($100/mo, alerts 50/75/90/100%) |
| Entra SPA (Elite OS Dev) | `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| Static Web App | `swa-atlas-elite-os-dev` |
| **Microsoft play URL** | **https://zealous-rock-0090c7e1e.7.azurestaticapps.net** |

## Remaining platform steps

1. **Dataverse CORS** — allow `http://127.0.0.1:5180`, `http://localhost:5180`, and `https://zealous-rock-0090c7e1e.7.azurestaticapps.net`
2. Optional: store SWA deploy token in GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`

## Local verification

```bash
cd .worktrees/sprint11-azure-production-migration
# or track10-elite-ui
npm run dev   # http://127.0.0.1:5180
```

Model-driven admin:  
https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8
