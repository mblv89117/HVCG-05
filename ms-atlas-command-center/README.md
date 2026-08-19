# Project Atlas Command Center — Microsoft Dev provisioning

Development/UAT only. Target: HVCG Development (`org1131a2b0.crm.dynamics.com`).

## Play link (ready)

https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/get-token.js` | MSAL device-code auth (Dev Dataverse) |
| `scripts/provision-schema.js` | Solution + tables + columns |
| `scripts/seed-data.js` | Development-safe sample rows |
| `scripts/build-app.js` | Add forms/views to app + publish |
| `scripts/update-sitemap.js` | Sitemap SubAreas for all screens |

## Auth

```bash
rm -f .token-cache.json   # only if re-auth needed
node scripts/get-token.js
```

## Constraints

- No Production
- No Track 1
- No live client communications
- No merge / push without QA + owner gates
