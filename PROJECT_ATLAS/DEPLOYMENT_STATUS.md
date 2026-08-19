# DEPLOYMENT_STATUS

**As of:** 2026-08-18  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)  
**Owner guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)  
**Historical July 16 snapshot:** [Archive/DEPLOYMENT_STATUS_2026-07-16.md](Archive/DEPLOYMENT_STATUS_2026-07-16.md)  
**Honesty:** Azure SHAs below are LIVE. This git HEAD (`a43803e` CRM candidate) is **not** LIVE. `origin/main` is **not** production.

| Environment | Status | Notes |
|-------------|--------|-------|
| Atlas Elite (production SWA) | **LIVE** | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` SHA `e5740379ff16b68f329b7e2388867d7a43233a5b` asset `index-DvEHjcS6.js`. Prior recorded asset `index-CRgf6DAQ.js` @ `3572500` is **stale**. |
| Atlas Hub (production App Service) | **LIVE** | SHA `d22b55f870efc0c105ed328a20a4ba4df077e6aa`, Azure deploy `501fb29b-80f6-427d-8c65-3f1a88da52d9`. `/health`: `ok`, `authRequired=true`, `insecureDevAuth=false`, `pmBackend.mode=sharepoint`, `capitalBackend.mode=sharepoint`, overlay durable, `websiteLeads.configured=true`. Prior recorded Hub SHA `8ff4220` is **stale**. |
| Atlas BA (dedicated Python service) | Reachable through Hub when configured | Anonymous BA/Hub APIs remain 401 |
| Opportunity CRM operator | **CANDIDATE — not live-certified** | `a43803edb29a3f8dd080033ca579a09532d89fbc` on `feature/atlas-crm-operator`. Docs must not block its deploy. |
| GitHub Environment `production` | Exists | Approval/policy boundary; **no `main` promotion** |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected; **not** what Azure is running |
| Canonical integration | `integration/atlas-canonical` | Git source line; not automatically Azure |

## Freeze / do not

- Do not promote integration to `main`
- Do not treat `origin/main` as production
- Do not enable Local AI on production Hub without a separate decision (currently disabled)
- Do not treat July 2026 Dynamics Track-1 freeze as Atlas V1 SoR
- Do not claim ACCG01 ACL Apply ran
- Do not claim CRM operator is live-certified
- Controlled Elite/Hub redeploy is allowed only under a separate deploy agent — this docs branch does not deploy

## Status authority

Match [CURRENT_STATE.md](CURRENT_STATE.md). Atlas V1 operating data SoR is SharePoint `HVCG_*`.
