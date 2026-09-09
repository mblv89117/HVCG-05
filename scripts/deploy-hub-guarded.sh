#!/usr/bin/env bash
# Deploy Atlas Integration Hub (production) with lease + lineage guard.
#
# ── Owner / CI runbook (requires interactive `az login`; cloud agents cannot run this) ──
#
#   az login   # HVCG tenant 3df46563-86f3-4414-87fd-84ba967741ef, subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
#   cd /path/to/hvcg-05
#   git fetch origin production/atlas-core
#   git checkout production/atlas-core
#   git pull origin production/atlas-core          # expect tip 0e95388d (Waves 0–10 + HMAC key-id hardening)
#   npm ci                                         # esbuild bundle prerequisite
#   export ATLAS_ELITE_SHA="$(./scripts/read-live-elite-sha.sh)"   # live Elite only — do NOT redeploy Elite to match Hub
#   ./scripts/deploy-hub-guarded.sh
#   curl -sf "${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}/health" | jq -r .commit
#   # must equal: git rev-parse HEAD  (currently 0e95388dc46eb40884f9d0c461678e66c533db4c)
#
# Live Hub before deploy: 2d61fe65603b88d12d08456967c65dae8e5aec52 (ancestor of tip — forward deploy is safe/required for LIVE HMAC).
# Live Elite SWA: https://zealous-rock-0090c7e1e.7.azurestaticapps.net — SHA differs from Hub by design; never equalize.
# Full runbook: docs/hub-production-deploy-runbook.md
#
# GitHub Actions does NOT deploy Hub (no azure/login OIDC in repo). Use this script from an Owner workstation.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/deploy-lease.sh
source "$ROOT/scripts/lib/deploy-lease.sh"

HUB_BASE="${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}"
CANDIDATE_SHA="$(git rev-parse HEAD)"
BRANCH="$(git branch --show-current)"
# Production floor = production/atlas-core tip (not Elite). Override with ATLAS_CANONICAL_PRODUCTION_SHA if needed.
CANONICAL_SHA="${ATLAS_CANONICAL_PRODUCTION_SHA:-0e95388dc46eb40884f9d0c461678e66c533db4c}"
HOLDER_ID="${ATLAS_DEPLOY_HOLDER_ID:-$(hostname)-$$}"

# Refuse cosmetic SHA-equalization deploys and stale default-branch tips.
if [[ "$BRANCH" == "cursor/v1.1.0-intelligence-ai-ops" ]]; then
  echo "BLOCKED: refusing deploy from stale July SharePoint-era default branch tip"
  exit 1
fi
if [[ "${ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY:-}" != "1" && -n "${ATLAS_ELITE_SHA:-}" && "$CANDIDATE_SHA" == "$ATLAS_ELITE_SHA" && "$CANDIDATE_SHA" != "$(curl -sf "${HUB_BASE}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})")" ]]; then
  echo "BLOCKED: refusing Elite-SHA equalization deploy without ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1"
  exit 1
fi

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
./node_modules/esbuild/bin/esbuild apps/atlas-integration-api/src/index.ts \
  --bundle --platform=node --format=esm --outfile="$BUILD_DIR/server.js" --legal-comments=none

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
