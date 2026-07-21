#!/usr/bin/env bash
# Deploy Atlas Elite OS to Azure Static Web Apps on HVCG Production subscription.
# Subscription: ebc84d85-b5ff-4c4b-add1-b0a8de31b319 (HVCG Production)
# NEVER use deprecated: 866189c6-5aa0-4037-8094-05771caceb0d
set -euo pipefail

export PATH="${HOME}/Library/Python/3.9/bin:/opt/homebrew/bin:${PATH}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUB_ID="ebc84d85-b5ff-4c4b-add1-b0a8de31b319"
RG="rg-atlas-dev"
SWA_NAME="${ATLAS_SWA_NAME:-swa-atlas-elite-os-dev}"
# Hosted SWA serves Production SharePoint; Client 360 still uses Mac-local hub by default.
ENV_NAME="${VITE_ATLAS_ENV:-production}"

az account set --subscription "$SUB_ID"

if [[ -z "${AZURE_STATIC_WEB_APPS_API_TOKEN:-}" ]]; then
  echo "Fetching deployment token for $SWA_NAME ..."
  AZURE_STATIC_WEB_APPS_API_TOKEN=$(az staticwebapp secrets list \
    -n "$SWA_NAME" -g "$RG" --query "properties.apiKey" -o tsv)
fi

if [[ -z "${AZURE_STATIC_WEB_APPS_API_TOKEN:-}" ]]; then
  echo "Missing AZURE_STATIC_WEB_APPS_API_TOKEN and could not fetch from $SWA_NAME."
  exit 1
fi

if [[ -z "${VITE_ENTRA_CLIENT_ID:-}" ]]; then
  # Dev SPA registration (Track 10) — also hosts Production SWA URL redirect
  export VITE_ENTRA_CLIENT_ID="49d20328-fe3c-40ec-9d0e-99f57e4646e4"
fi

SWA_HOST=$(az staticwebapp show -n "$SWA_NAME" -g "$RG" --query defaultHostname -o tsv)
export VITE_ATLAS_ENV="$ENV_NAME"
export VITE_ENTRA_TENANT_ID="${VITE_ENTRA_TENANT_ID:-3df46563-86f3-4414-87fd-84ba967741ef}"
export VITE_BLOCK_LIVE_CLIENT_COMMS=true
export VITE_ALLOW_SAMPLE_FALLBACK="${VITE_ALLOW_SAMPLE_FALLBACK:-false}"
export VITE_ALLOW_DEV_OWNER_LOGIN="${VITE_ALLOW_DEV_OWNER_LOGIN:-false}"
export VITE_REDIRECT_URI="${VITE_REDIRECT_URI:-https://${SWA_HOST}}"
export VITE_POST_LOGOUT_REDIRECT_URI="${VITE_POST_LOGOUT_REDIRECT_URI:-https://${SWA_HOST}}"
export VITE_HOSTED_APP_URL="${VITE_HOSTED_APP_URL:-https://${SWA_HOST}}"
export VITE_SHAREPOINT_SITE_URL="${VITE_SHAREPOINT_SITE_URL:-https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter}"
# Production Dataverse (Track 1). Override only for intentional Dev UAT builds.
if [[ "$ENV_NAME" == "production" ]]; then
  export VITE_DATAVERSE_URL="${VITE_DATAVERSE_URL:-https://orgee2f7545.crm.dynamics.com}"
else
  export VITE_DATAVERSE_URL="${VITE_DATAVERSE_URL:-https://org1131a2b0.crm.dynamics.com}"
fi
# Client 360 / PM API: Mac-local LaunchAgent hub (browser on this Mac). Remote browsers need a hosted hub.
export VITE_INTEGRATION_API_BASE="${VITE_INTEGRATION_API_BASE:-http://127.0.0.1:8790}"
export VITE_ATLAS_BUILD_SHA="${VITE_ATLAS_BUILD_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
export VITE_ATLAS_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Building Elite OS for SWA https://${SWA_HOST} (env=$ENV_NAME, SharePoint=$VITE_SHAREPOINT_SITE_URL)..."

# Refresh Client 360 snapshot from local hub when available (HTTPS SWA cannot call http://127.0.0.1 hub).
if curl -sf "http://127.0.0.1:8790/health" >/dev/null 2>&1; then
  echo "Refreshing public/client360-snapshot.json from local hub…"
  node <<'SNAP' || true
const KEEP = new Set(['client-accg01','client-pdg01','client-ccb01','client-kava01','client-cpl01','client-hfd01','client-lien01']);
const hdr = {
  'x-atlas-user-id': 'swa-snap',
  'x-atlas-organization-id': 'org-hvcg',
  'x-atlas-client-ids': '*',
  'x-atlas-roles': 'Admin',
};
const full = await fetch('http://127.0.0.1:8790/api/client360', { headers: hdr }).then((r) => r.json());
const all = full.candidates || full.clients || [];
const clients = [];
for (const c of all.filter((x) => KEEP.has(x.id))) {
  const d = await fetch(`http://127.0.0.1:8790/api/client360/${encodeURIComponent(c.id)}/documents`, {
    headers: { ...hdr, 'x-atlas-client-ids': c.id },
  }).then((r) => (r.ok ? r.json() : { documents: [], count: 0 }));
  const documents = d.documents || [];
  clients.push({
    id: c.id,
    displayName: c.displayName,
    legalName: c.legalName,
    lifecycle: c.lifecycle || 'active',
    emails: c.emails || [],
    domains: c.domains || [],
    completenessScore: c.completenessScore,
    recommendedNextActions: c.recommendedNextActions || [],
    businessEntities: c.businessEntities || ['HVCG'],
    sourceRefs: (c.sourceRefs || []).slice(0, 50),
    timeline: (c.timeline || []).slice(0, 50),
    associations: c.associations,
    documentCount: d.count || documents.length,
    documents: documents.map((x) => ({
      id: x.id,
      title: x.title,
      kind: x.kind,
      webUrl: x.webUrl || x.url,
      path: x.path,
      classification: x.classification,
      sensitivityRestricted: x.sensitivityRestricted,
      migrationStatus: x.migrationStatus,
      modifiedAt: x.modifiedAt,
      searchVisible: x.searchVisible,
    })),
  });
}
const { writeFileSync, mkdirSync } = await import('node:fs');
mkdirSync('apps/atlas-elite-os/public', { recursive: true });
writeFileSync(
  'apps/atlas-elite-os/public/client360-snapshot.json',
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'production-sharepoint-aligned-hub-snapshot',
    sharePointSite: process.env.VITE_SHAREPOINT_SITE_URL,
    clients,
  }),
);
console.log('snapshot clients', clients.length, clients.map((c) => c.id).join(','));
SNAP
else
  echo "WARN: local hub not reachable — reusing existing client360-snapshot.json if present"
fi

npm run build -w @hvcg/atlas-elite-os

npx --yes --cache "${ROOT}/.npm-cache" @azure/static-web-apps-cli@2.0.9 deploy \
  apps/atlas-elite-os/dist \
  --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
  --env production

echo ""
echo "Deploy submitted: https://${SWA_HOST}"
echo "Confirm Entra SPA redirect URIs + hub INTEGRATION_ALLOWED_ORIGINS include https://${SWA_HOST}"
echo "Dataverse CORS (Power Platform Admin → environment → CORS): add https://${SWA_HOST}"
