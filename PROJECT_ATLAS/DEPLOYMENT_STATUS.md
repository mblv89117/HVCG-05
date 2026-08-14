# DEPLOYMENT_STATUS

**As of:** 2026-08-14 21:00 UTC  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)  
**Historical July 16 snapshot:** [Archive/DEPLOYMENT_STATUS_2026-07-16.md](Archive/DEPLOYMENT_STATUS_2026-07-16.md)

| Environment | Status | Notes |
|-------------|--------|-------|
| Atlas Elite (production SWA) | Live — Command Center honesty UI | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` asset `index-CRgf6DAQ.js` @ `3572500`; unimplemented Initialize / Quick Capture / sync / archive labeled |
| Atlas Hub (production App Service) | Live — RuntimeSuccessful | SharePoint PM via `id-atlas-prod`; Graph collection reads without `$filter`; keyed `POST /api/website/leads` → `HVCG_Leads`; BA configured/reachable; anonymous `/api/pm/*` and `/api/ba/health` 401 |
| Atlas BA (dedicated Python service) | Reachable through Hub | Anonymous BA/Hub APIs remain 401 |
| GitHub Environment `production` | Exists | Approval/policy boundary; **no `main` promotion** |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected; not promoted |
| Canonical integration | `integration/atlas-canonical` | CI required on push/PR |

## Freeze / do not

- Do not promote integration to `main`
- Do not enable Local AI on production Hub without a separate decision (currently disabled)
- Do not treat July 2026 Dynamics Track-1 freeze as Atlas V1 SoR
- Controlled Elite/Hub redeploy is allowed only to repair the live owner SharePoint path

## Status authority

Match [CURRENT_STATE.md](CURRENT_STATE.md). Atlas V1 operating data SoR is SharePoint `HVCG_*`.
