# Hub ↔ SWA path

- Generated: `2026-07-22T04:41:34Z`
- **Verdict: GREEN**
- SWA: `https://zealous-rock-0090c7e1e.7.azurestaticapps.net`
- Hub: `https://app-atlas-integration-hub.azurewebsites.net`
- Bundle `VITE_INTEGRATION_API_BASE`: `https://app-atlas-integration-hub.azurewebsites.net`
- CORS SWA origin: OK; `authorization` allowed on preflight
- `/api/client360` anonymous: **401**
- `/api/client360` forged x-atlas-* only: **401**
- Authenticated browser path: **GREEN** (owner UAT; see `signed-in-swa-client360-latest.md`)
- Hosted Integration Hub is the normal Production Client 360 path.
