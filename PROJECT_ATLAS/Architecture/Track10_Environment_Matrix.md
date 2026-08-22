# Track 10 — Environment variable matrix

| Variable | Local | HVCG Development | Staging | Production |
|----------|-------|------------------|---------|------------|
| `VITE_ATLAS_ENV` | `local` | `development` | `staging` | `production` |
| `VITE_ENTRA_TENANT_ID` | HVCG tenant | HVCG tenant | HVCG tenant | HVCG tenant |
| `VITE_ENTRA_CLIENT_ID` | SPA Dev app | SPA Dev app | SPA Staging app | SPA Prod app (future gate) |
| `VITE_REDIRECT_URI` | `http://127.0.0.1:5180` | SWA URL | Staging URL | Prod URL |
| `VITE_DATAVERSE_URL` | `org1131a2b0` | `org1131a2b0` | Staging org | Prod org (gated) |
| `VITE_SHAREPOINT_SITE_URL` | Dev site | Dev site | Staging site | Prod site (gated) |
| `VITE_POWER_AUTOMATE_BASE_URL` | Dev HTTP | Dev HTTP | Staging | Prod (gated) |
| `VITE_HOSTED_APP_URL` | empty | SWA URL | Staging URL | Prod URL |
| `VITE_ALLOW_SAMPLE_FALLBACK` | `true` | `true` | `false` preferred | `false` |
| `VITE_BLOCK_LIVE_CLIENT_COMMS` | `true` | `true` | `true` | `true` until owner gate |

No client secrets in SPA env files.
