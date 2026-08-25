#!/usr/bin/env bash
# Deploy Hub with lease + lineage guard — refuses stale candidates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/deploy-lease.sh
source "$ROOT/scripts/lib/deploy-lease.sh"

HUB_BASE="${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}"
CANDIDATE_SHA="$(git rev-parse HEAD)"
BRANCH="$(git branch --show-current)"
CANONICAL_SHA="ecc357159277bccd76900961fd8e35ed1e7a4df0"
HOLDER_ID="${ATLAS_DEPLOY_HOLDER_ID:-$(hostname)-$$}"

cleanup() {
  deploy_lease_release || true
}
trap cleanup EXIT

LIVE_SHA="$(curl -sf "${HUB_BASE}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})")"

echo "Deploy lineage check: candidate=${CANDIDATE_SHA} live=${LIVE_SHA} canonical=${CANONICAL_SHA}"

deploy_lease_acquire "$HOLDER_ID" "$CANDIDATE_SHA" "$BRANCH"

candidate_includes_canonical=false
candidate_includes_live=false
live_includes_canonical=false

if git merge-base --is-ancestor "$CANONICAL_SHA" "$CANDIDATE_SHA" 2>/dev/null; then
  candidate_includes_canonical=true
fi
if [[ -n "$LIVE_SHA" ]] && git merge-base --is-ancestor "$LIVE_SHA" "$CANDIDATE_SHA" 2>/dev/null; then
  candidate_includes_live=true
fi
if [[ -n "$LIVE_SHA" ]] && git merge-base --is-ancestor "$CANONICAL_SHA" "$LIVE_SHA" 2>/dev/null; then
  live_includes_canonical=true
fi

GUARD_RESULT="$(node --import tsx "$ROOT/scripts/deploy-guard-check.mjs" \
  "$CANDIDATE_SHA" "$LIVE_SHA" \
  "$candidate_includes_canonical" "$candidate_includes_live" "$live_includes_canonical" \
  | tail -1 || true)"

echo "Ancestry guard: $GUARD_RESULT"
if ! node --import tsx "$ROOT/scripts/deploy-guard-check.mjs" \
  "$CANDIDATE_SHA" "$LIVE_SHA" \
  "$candidate_includes_canonical" "$candidate_includes_live" "$live_includes_canonical" >/dev/null; then
  echo "BLOCKED: deploy ancestry guard failed"
  exit 1
fi

BUILD_DIR="deployment/artifacts/hub-build"
mkdir -p "$BUILD_DIR"
# Node 22 ESM App Service crashes if jose resolves to dist/node/cjs
# ("Dynamic require of node:buffer"). Alias jose to ESM only.
JOSE_ESM="${JOSE_ESM:-}"
if [[ -z "$JOSE_ESM" ]]; then
  if [[ -f "$ROOT/node_modules/jose/dist/node/esm/index.js" ]]; then
    JOSE_ESM="$ROOT/node_modules/jose/dist/node/esm/index.js"
  else
    echo "BLOCKED: jose ESM entry not found; set JOSE_ESM to dist/node/esm/index.js"
    exit 1
  fi
fi
INTEGRATION_CORE="${INTEGRATION_CORE:-$ROOT/packages/atlas-integration-core/src/index.ts}"
CAPITAL_CORE="${CAPITAL_CORE:-$ROOT/packages/atlas-capital-core/src/index.ts}"
ESBUILD_BIN="${ESBUILD_BIN:-$ROOT/node_modules/esbuild/bin/esbuild}"

"$ESBUILD_BIN" apps/atlas-integration-api/src/index.ts \
  --bundle --platform=node --format=esm --outfile="$BUILD_DIR/server.js" --legal-comments=none \
  --alias:@hvcg/atlas-integration-core="$INTEGRATION_CORE" \
  --alias:@hvcg/atlas-capital-core="$CAPITAL_CORE" \
  --alias:jose="$JOSE_ESM"

if grep -q 'dist/node/cjs' "$BUILD_DIR/server.js" || grep -q 'Dynamic require of "node:buffer"' "$BUILD_DIR/server.js"; then
  echo "BLOCKED: bundle contains CJS jose / dynamic node:buffer require"
  exit 1
fi

echo "{\"gitSha\":\"$CANDIDATE_SHA\",\"branch\":\"$BRANCH\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$BUILD_DIR/hub-build.json"
echo "$CANDIDATE_SHA" > "$BUILD_DIR/ATLAS_HUB_COMMIT.txt"
echo '{"name":"atlas-integration-hub","private":true,"type":"module","main":"server.js"}' > "$BUILD_DIR/package.json"

ZIP="deployment/artifacts/hub-${CANDIDATE_SHA}.zip"
rm -f "$ZIP"
(cd "$BUILD_DIR" && zip -q "../hub-${CANDIDATE_SHA}.zip" server.js package.json hub-build.json ATLAS_HUB_COMMIT.txt)

az webapp deploy --resource-group rg-atlas-prod --name app-atlas-integration-hub \
  --src-path "$ZIP" --type zip --async false

VERIFY_SHA="$(curl -sf "${HUB_BASE}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})")"
if [[ "$VERIFY_SHA" != "$CANDIDATE_SHA" ]]; then
  echo "VERIFY FAILED: expected ${CANDIDATE_SHA} got ${VERIFY_SHA}"
  exit 1
fi

deploy_record_production_state "$CANONICAL_SHA" "$CANDIDATE_SHA" "$BRANCH" "$HOLDER_ID"
echo "Deploy verified: ${VERIFY_SHA}"
