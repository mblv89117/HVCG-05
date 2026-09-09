#!/usr/bin/env bash
# Local Owner deploy wrapper — assumes `az login` already succeeded.
# Resolves dynamic CURRENT_CANDIDATE from origin/production/atlas-core, then deploys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v az >/dev/null 2>&1; then
  echo "ERROR: Azure CLI (az) not found. Install and run: az login" >&2
  exit 1
fi
if ! az account show >/dev/null 2>&1; then
  echo "ERROR: az not logged in. Run: az login" >&2
  exit 1
fi

PRODUCTION_BRANCH="${ATLAS_PRODUCTION_BRANCH:-production/atlas-core}"
git fetch origin "$PRODUCTION_BRANCH"
git checkout "$PRODUCTION_BRANCH"
git pull origin "$PRODUCTION_BRANCH"

npm ci
export ATLAS_ELITE_SHA="$(./scripts/read-live-elite-sha.sh)"
./scripts/deploy-hub-guarded.sh

HEALTH_SHA="$(curl -sf "${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})")"
CANDIDATE_SHA="$(git rev-parse HEAD)"
if [[ "$HEALTH_SHA" != "$CANDIDATE_SHA" ]]; then
  echo "VERIFY FAILED: /health=${HEALTH_SHA} != CURRENT_CANDIDATE=${CANDIDATE_SHA}" >&2
  exit 1
fi
echo "Hub deploy verified: /health.commit=${HEALTH_SHA}"
