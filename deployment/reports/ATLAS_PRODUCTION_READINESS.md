# Atlas Production Readiness — Live Status

**Updated:** 2026-07-21 (post SWA Production redeploy + persistence E2E)  
**Release gate report:** [ATLAS_V1_PRODUCTION_RELEASE_GATE.md](./ATLAS_V1_PRODUCTION_RELEASE_GATE.md)

## Production URLs

| Surface | URL | Status |
|---------|-----|--------|
| **Elite SWA** | https://zealous-rock-0090c7e1e.7.azurestaticapps.net | Live — `VITE_ATLAS_ENV=production`, Prod SharePoint + Prod Dataverse |
| **Command Center (SharePoint)** | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter | 82/82 lists · 7 clients |
| **Local Elite / Hub** | http://127.0.0.1:5180 · :8790 | LaunchAgents; live Client 360 ingest |

## Gate rollup

See release gate report gates 1–9. Tag target: `atlas-v1.0.0-production`.
