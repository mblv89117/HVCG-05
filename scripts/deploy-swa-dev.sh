#!/usr/bin/env bash
# Deploy Atlas Elite OS to Azure Static Web Apps on HVCG Production.
# Subscription: ebc84d85-b5ff-4c4b-add1-b0a8de31b319 (HVCG Production)
# NEVER use deprecated: 866189c6-5aa0-4037-8094-05771caceb0d
set -euo pipefail

export PATH="${HOME}/Library/Python/3.9/bin:${PATH}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUB_ID="ebc84d85-b5ff-4c4b-add1-b0a8de31b319"
RG="rg-atlas-dev"
SWA_NAME="${ATLAS_SWA_NAME:-swa-atlas-elite-os-dev}"
ENV_NAME="${VITE_ATLAS_ENV:-development}"

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
  export VITE_ENTRA_CLIENT_ID="49d20328-fe3c-40ec-9d0e-99f57e4646e4"
fi

SWA_HOST=$(az staticwebapp show -n "$SWA_NAME" -g "$RG" --query defaultHostname -o tsv)
export VITE_ATLAS_ENV="$ENV_NAME"
export VITE_BLOCK_LIVE_CLIENT_COMMS=true
# Pending-safe only — never ship fabricated finance via sample KPI dollars
export VITE_ALLOW_SAMPLE_FALLBACK="${VITE_ALLOW_SAMPLE_FALLBACK:-true}"
export VITE_REDIRECT_URI="${VITE_REDIRECT_URI:-https://${SWA_HOST}}"
export VITE_ATLAS_BUILD_SHA="$(git rev-parse HEAD)"
export VITE_ATLAS_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# QA role sim for Dev SWA retest of role matrix (not production)
export VITE_ALLOW_ROLE_SIM="${VITE_ALLOW_ROLE_SIM:-true}"
export VITE_ATLAS_ROLE_SIM="${VITE_ATLAS_ROLE_SIM:-HVCG Owner}"

echo "Building Elite OS SHA=${VITE_ATLAS_BUILD_SHA} for https://${SWA_HOST} (env=$ENV_NAME)..."
rm -rf apps/atlas-elite-os/dist
npm run build -w @hvcg/atlas-elite-os
node apps/atlas-elite-os/scripts/recovery-tests.mjs

npx --yes --cache "${ROOT}/.npm-cache" @azure/static-web-apps-cli@2.0.9 deploy \
  apps/atlas-elite-os/dist \
  --deployment-token "$AZURE_STATIC_WEB_APPS_API_TOKEN" \
  --env production

echo ""
echo "Deploy submitted: https://${SWA_HOST}"
echo "COMMIT=${VITE_ATLAS_BUILD_SHA}"
echo "BUILT_AT=${VITE_ATLAS_BUILT_AT}"
echo "ENVIRONMENT=${ENV_NAME}"
echo "Verify footer SHA on the live app matches COMMIT."
