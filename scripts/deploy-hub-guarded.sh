#!/usr/bin/env bash
# Deploy Hub with lineage guard — refuses stale candidates that would overwrite newer production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
HUB_BASE="${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}"
CANDIDATE_SHA="$(git rev-parse HEAD)"
LIVE_SHA="$(curl -sf "${HUB_BASE}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})")"

echo "Deploy lineage check: candidate=${CANDIDATE_SHA} live=${LIVE_SHA}"

if [[ -n "$LIVE_SHA" && "$CANDIDATE_SHA" != "$LIVE_SHA" ]]; then
  if git merge-base --is-ancestor "$LIVE_SHA" "$CANDIDATE_SHA" 2>/dev/null; then
    echo "OK: candidate includes live ancestry"
  else
    echo "BLOCKED: candidate ${CANDIDATE_SHA} does not include live ${LIVE_SHA} — refusing deploy"
    exit 1
  fi
fi

BUILD_DIR="deployment/artifacts/hub-build"
mkdir -p "$BUILD_DIR"
./node_modules/esbuild/bin/esbuild apps/atlas-integration-api/src/index.ts \
  --bundle --platform=node --format=esm --outfile="$BUILD_DIR/server.js" --legal-comments=none

BRANCH="$(git branch --show-current)"
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
echo "Deploy verified: ${VERIFY_SHA}"
