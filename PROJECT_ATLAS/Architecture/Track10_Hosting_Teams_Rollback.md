# Track 10 — Azure hosting + Teams embedding plan

## Preferred: Azure Static Web Apps (HVCG Development subscription)

1. Create SWA resource e.g. `hvcg-atlas-elite-os-dev`
2. Build app:

```bash
cd .worktrees/track10-elite-ui
npm ci --cache .npm-cache
npm run build -w @hvcg/atlas-elite-os
```

3. Deploy `apps/atlas-elite-os/dist` (+ `staticwebapp.config.json` from `public/`)
4. Set SWA app settings / build env for all `VITE_*` values
5. Add SWA URL to Entra SPA redirect URIs + Dataverse CORS

### Deploy script (after `az` login + SWA token)

```bash
npx @azure/static-web-apps-cli deploy \
  apps/atlas-elite-os/dist \
  --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
  --env production
```

(`production` here means SWA slot naming — still HVCG **Development** business environment.)

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
