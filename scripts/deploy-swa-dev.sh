#!/usr/bin/env bash
# Deploy Atlas Elite OS dist to Azure Static Web Apps (HVCG Development).
# Requires: AZURE_STATIC_WEB_APPS_API_TOKEN and Entra SPA client ID baked into build env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${AZURE_STATIC_WEB_APPS_API_TOKEN:-}" ]]; then
  echo "Missing AZURE_STATIC_WEB_APPS_API_TOKEN. Create SWA in HVCG Dev and export the token."
  exit 1
fi

if [[ -z "${VITE_ENTRA_CLIENT_ID:-}" ]]; then
  echo "Missing VITE_ENTRA_CLIENT_ID. Complete Entra SPA registration first."
  exit 1
fi

export VITE_ATLAS_ENV="${VITE_ATLAS_ENV:-development}"
export VITE_BLOCK_LIVE_CLIENT_COMMS=true
export VITE_ALLOW_SAMPLE_FALLBACK="${VITE_ALLOW_SAMPLE_FALLBACK:-true}"

npm run build -w @hvcg/atlas-elite-os
npx --yes @azure/static-web-apps-cli@2.0.9 deploy \
  apps/atlas-elite-os/dist \
  --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
  --env production

echo "Deploy submitted. Add the SWA URL to Entra redirect URIs and Dataverse CORS."
