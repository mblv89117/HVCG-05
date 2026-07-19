# Track 10 — Azure hosting + Teams embedding plan

## Preferred: Azure Static Web Apps (HVCG Production subscription)

**Subscription:** HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319` (never use deprecated `866189c6-…`)

| Item | Value |
|------|-------|
| Resource | `swa-atlas-elite-os-dev` |
| Resource group | `rg-atlas-dev` |
| Region | West US 2 |
| Hostname | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |

```bash
cd .worktrees/sprint11-azure-production-migration
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
bash scripts/deploy-swa-dev.sh
```

Entra SPA redirect URIs already include localhost + SWA hostname.  
Add SWA origin to Dataverse CORS when enabling live Dataverse from the hosted SPA.

## Fallback: Azure App Service

Static site or Node static server serving the same `dist/` with SPA rewrite rules.

## Teams embedding

1. Create Teams app manifest with personal tab URL = SWA HTTPS URL
2. `staticwebapp.config.json` already allows Teams frame-ancestors
3. Tab SSO can be phase-2; initial ship = tab opens MSAL popup/redirect in Teams web/desktop
4. Pin in Project Atlas / Command Center team channel when Dev URL is live

## Dynamics / Power Apps navigation

- Add a sitemap / app module link (or dashboard iframe/web resource) pointing to the hosted Elite OS URL
- Keep model-driven app for administration (`dea8a490-…`)

## Rollback

1. Remove Teams tab / sitemap link
2. Unpublish or delete SWA deployment / revert to prior SWA revision
3. Elite UI rollback does **not** remove Dataverse tables or model-driven admin app
4. No Production rollback required (nothing Prod deployed)
