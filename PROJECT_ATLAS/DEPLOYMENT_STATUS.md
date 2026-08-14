# DEPLOYMENT_STATUS

**As of:** 2026-08-14 20:25 UTC  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)  
**Historical July 16 snapshot:** [Archive/DEPLOYMENT_STATUS_2026-07-16.md](Archive/DEPLOYMENT_STATUS_2026-07-16.md)

| Environment | Status | Notes |
|-------------|--------|-------|
| Atlas Elite (production SWA) | Live | Untouched by Gate 11 final closure |
| Atlas Hub (production App Service) | Live | SharePoint PM via managed identity; auth required; BA configured/reachable |
| Atlas BA (dedicated Python service) | Reachable through Hub | Anonymous BA/Hub APIs remain 401 |
| GitHub Environment `production` | Exists | Approval/policy boundary; dry-validation workflow only; **no production deploy from this gate** |
| GitHub Environment `development` | Exists | Unprotected historical env |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected; not promoted |
| Canonical integration | `integration/atlas-canonical` | CI required on push/PR |

## Freeze / do not

- Do not deploy production to validate governance
- Do not promote integration to `main`
- Do not enable Local AI on production Hub without a separate decision (currently disabled)
- Do not treat July 2026 Dynamics Track-1 freeze as Atlas V1 SoR

## Status authority

Match [CURRENT_STATE.md](CURRENT_STATE.md). Atlas V1 operating data SoR is SharePoint `HVCG_*`.
