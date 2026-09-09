#!/usr/bin/env bash
# Deploy Atlas Integration Hub (production) with lease + lineage guard.
#
# Deploy target is DYNAMIC: always resolves origin/production/atlas-core HEAD as
# CURRENT_CANDIDATE. HISTORICAL_FLOOR (Wave 0) is ancestry evidence only.
#
# Owner runbook (requires interactive `az login`; cloud agents cannot run this):
#   az login
#   ./scripts/local-hub-deploy.sh
# Full runbook: docs/hub-production-deploy-runbook.md
# Local Cursor handoff: docs/LOCAL_CURSOR_HUB_DEPLOY_HANDOFF.md
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/deploy-lease.sh
source "$ROOT/scripts/lib/deploy-lease.sh"

HUB_BASE="${HUB_BASE:-https://app-atlas-integration-hub.azurewebsites.net}"
PRODUCTION_BRANCH="${ATLAS_PRODUCTION_BRANCH:-production/atlas-core}"
# Wave 0 historical floor — ancestry evidence, NOT the deploy target.
HISTORICAL_FLOOR="${ATLAS_HISTORICAL_FLOOR_SHA:-2d61fe65603b88d12d08456967c65dae8e5aec52}"
HOLDER_ID="${ATLAS_DEPLOY_HOLDER_ID:-$(hostname)-$$}"
BRANCH="$(git branch --show-current 2>/dev/null || echo detached)"

read_health_commit() {
  curl -sf "${HUB_BASE}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commit||'')}catch{console.log('')}})"
}

echo "Fetching origin/${PRODUCTION_BRANCH} for CURRENT_CANDIDATE..."
git fetch origin "$PRODUCTION_BRANCH"
CURRENT_CANDIDATE="$(git rev-parse "origin/${PRODUCTION_BRANCH}")"

HEAD_SHA="$(git rev-parse HEAD)"
if [[ "$HEAD_SHA" != "$CURRENT_CANDIDATE" ]]; then
  echo "Syncing working tree to CURRENT_CANDIDATE ${CURRENT_CANDIDATE} (HEAD was ${HEAD_SHA})"
  git checkout "$CURRENT_CANDIDATE"
  HEAD_SHA="$CURRENT_CANDIDATE"
fi
CANDIDATE_SHA="$CURRENT_CANDIDATE"

LIVE_SHA="$(read_health_commit)"
ELITE_SHA="${ATLAS_ELITE_SHA:-}"
if [[ -z "$ELITE_SHA" ]]; then
  ELITE_SHA="$(./scripts/read-live-elite-sha.sh)"
  export ATLAS_ELITE_SHA="$ELITE_SHA"
fi

# Refuse cosmetic SHA-equalization deploys and stale default-branch tips.
if [[ "$BRANCH" == "cursor/v1.1.0-intelligence-ai-ops" ]]; then
  echo "BLOCKED: refusing deploy from stale July SharePoint-era default branch tip"
  exit 1
fi
if [[ "${ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY:-}" != "1" && -n "$ELITE_SHA" && "$CANDIDATE_SHA" == "$ELITE_SHA" && "$CANDIDATE_SHA" != "$LIVE_SHA" ]]; then
  echo "BLOCKED: refusing Elite-SHA equalization deploy without ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1"
  exit 1
fi

cleanup() {
  deploy_lease_release || true
}
trap cleanup EXIT

echo "Deploy lineage:"
echo "  LIVE_PRODUCTION=${LIVE_SHA:-unknown}"
echo "  CURRENT_CANDIDATE=${CANDIDATE_SHA}"
echo "  HISTORICAL_FLOOR=${HISTORICAL_FLOOR}"
echo "  LIVE_ELITE=${ELITE_SHA}"

if [[ -z "$LIVE_SHA" ]]; then
  echo "BLOCKED: could not read LIVE_PRODUCTION from ${HUB_BASE}/health"
  exit 1
fi

if ! git merge-base --is-ancestor "$LIVE_SHA" "$CANDIDATE_SHA" 2>/dev/null; then
  echo "BLOCKED: LIVE_PRODUCTION ${LIVE_SHA} is not an ancestor of CURRENT_CANDIDATE ${CANDIDATE_SHA}"
  exit 1
fi

deploy_lease_acquire "$HOLDER_ID" "$CANDIDATE_SHA" "$BRANCH"

candidate_includes_floor=false
candidate_includes_live=false
live_includes_floor=false

if git merge-base --is-ancestor "$HISTORICAL_FLOOR" "$CANDIDATE_SHA" 2>/dev/null; then
  candidate_includes_floor=true
fi
if git merge-base --is-ancestor "$LIVE_SHA" "$CANDIDATE_SHA" 2>/dev/null; then
  candidate_includes_live=true
fi
if git merge-base --is-ancestor "$HISTORICAL_FLOOR" "$LIVE_SHA" 2>/dev/null; then
  live_includes_floor=true
fi

GUARD_RESULT="$(node --import tsx "$ROOT/scripts/deploy-guard-check.mjs" \
  "$CANDIDATE_SHA" "$LIVE_SHA" \
  "$candidate_includes_floor" "$candidate_includes_live" "$live_includes_floor" \
  | tail -1 || true)"

echo "Ancestry guard: $GUARD_RESULT"
if ! node --import tsx "$ROOT/scripts/deploy-guard-check.mjs" \
  "$CANDIDATE_SHA" "$LIVE_SHA" \
  "$candidate_includes_floor" "$candidate_includes_live" "$live_includes_floor" >/dev/null; then
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

VERIFY_SHA="$(read_health_commit)"
if [[ "$VERIFY_SHA" != "$CANDIDATE_SHA" ]]; then
  echo "VERIFY FAILED: expected ${CANDIDATE_SHA} got ${VERIFY_SHA}"
  exit 1
fi

deploy_record_production_state "$HISTORICAL_FLOOR" "$CANDIDATE_SHA" "$BRANCH" "$HOLDER_ID"
echo "Deploy verified: LIVE_PRODUCTION=${VERIFY_SHA} (CURRENT_CANDIDATE=${CANDIDATE_SHA})"
