# DEPLOYMENT_STATUS

**As of:** 2026-08-19  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)  
**Owner guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)  
**Historical July 16 snapshot:** [Archive/DEPLOYMENT_STATUS_2026-07-16.md](Archive/DEPLOYMENT_STATUS_2026-07-16.md)  
**Honesty:** Hub zip is LIVE `a43803e`. Elite SWA is LIVE `2a4e115` (`index-CiVmQVqq.js` = Capital `b9806bc` + Client `0ffb645`). This git HEAD is docs-only. `origin/main` is **not** production. stash0 `773e120` is **not** applied.

| Environment | Status | Notes |
|-------------|--------|-------|
| Atlas Elite (production SWA) | **LIVE** | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` SHA `2a4e115acdd881ef074f4c795fbe1e575f8fb7af` asset `index-CiVmQVqq.js`. Last-Modified 2026-08-19 03:23:27 UTC. Contains Capital `b9806bc` + Client `0ffb645`. Prior: `b9806bc` / `index-DmyugMFV.js`, then `a43803e` / `index-iXOWTfM9.js`. |
| Atlas Hub (production App Service) | **LIVE** | SHA `a43803edb29a3f8dd080033ca579a09532d89fbc`, Azure deploy `3d406e37-2d91-4fd6-a20b-8c955c7b5733`. `/health`: `ok`, `authRequired=true`, `insecureDevAuth=false`, `pmBackend.mode=sharepoint`, `capitalBackend.mode=sharepoint`, overlay durable, `websiteLeads.configured=true`. Prior rollback: `d22b55f` / deploy `501fb29b`. |
| Atlas BA (dedicated Python service) | Reachable through Hub when configured | Anonymous BA/Hub APIs remain 401 |
| Opportunity CRM operator | **LIVE DEPLOYED** `a43803e` — signed-in Premium UI **HOLD** | Hub GET/PATCH `/api/pm/leads` live. Do not mark Premium UI PASS until an Owner browser session reviews `/leads`. |
| Phase 5B Capital Elite | **LIVE DEPLOYED** inside `2a4e115` | Source `b9806bc`. Elite-only. Hub unchanged `a43803e`. Signed-in Premium UI HOLD. |
| Phase 5B Client ops Elite | **LIVE DEPLOYED** inside `2a4e115` | Source `0ffb645`. Elite-only. SYN01 workspace items currently empty. |
| stash0 Hub hardening | **NOT APPLIED** | `773e120` `fix/hub-stash0-hardening`. Wave 2 conflicts with live CRM `a43803e`. Do not apply. |
| Command-K / Hub search | **P2 OPEN** | SYN* queries still **15–24s**. Do not call this fixed. |
| GitHub Environment `production` | Exists | Approval/policy boundary; **no `main` promotion** |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected; **not** what Azure is running |
| Canonical integration | `integration/atlas-canonical` | Git source line; not automatically Azure |

## Freeze / do not

- Do not promote integration to `main`
- Do not treat `origin/main` as production
- Do not enable Local AI on production Hub without a separate decision (currently disabled)
- Do not treat July 2026 Dynamics Track-1 freeze as Atlas V1 SoR
- Do not claim ACCG01 ACL Apply ran
- Do not claim signed-in `/leads` Premium UI PASS (HOLD)
- Do not treat stash0 `773e120` as live. Capital `b9806bc` and Client `0ffb645` are in live Elite `2a4e115`.
- Do not apply stash0 / Wave 2 onto live Hub
- Do not call Command-K SYN search (15–24s) fixed
- Controlled Elite/Hub redeploy is allowed only under a separate deploy agent — this docs branch does not deploy

## Status authority

Match [CURRENT_STATE.md](CURRENT_STATE.md). Atlas V1 operating data SoR is SharePoint `HVCG_*`.
