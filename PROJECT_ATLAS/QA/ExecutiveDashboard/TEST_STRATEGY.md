# Test strategy — Executive Dashboard / Elite OS

## Environments

| Env | URL / path | Use |
|-----|------------|-----|
| SWA Dev | https://zealous-rock-0090c7e1e.7.azurestaticapps.net | Primary live validation |
| Local Vite | http://127.0.0.1:5180 | After green build |
| Dataverse Dev | org1131a2b0 | Signed-in KPI / ACL |
| Staging / Prod SWA | Not published | Blocked until Owner gate |

## Layers

1. **Deploy smoke** — HTTP, assets, headers, SPA rewrites, secret scan  
2. **Unsigned shell** — nav, banners, empty/fallback honesty (no fabricated $)  
3. **Signed-in Owner** — MSAL, Dataverse KPIs, refresh indicator, approvals write  
4. **Role matrix** — six required personas; cross-client / doc denial  
5. **Module CRUD** — tasks, approvals, clients, projects, revenue, capital, EV, docs  
6. **Responsive + a11y** — 390/768/1280; keyboard, labels, contrast  
7. **Regression** — after each SWA deploy, re-run AC table  
8. **Rollback drill** — prior SWA revision restore on Dev  

## Entry criteria for Owner UAT

- Green `npm run build -w @hvcg/atlas-elite-os`
- SWA Dev asset hash matches release commit
- Zero S0; zero fabricated finance in any fallback
- Soon badges removed from shippable nav
- RBAC smoke for Owner + one restricted role
