#!/usr/bin/env bash
# Atlas Hub deployment lease — Azure Blob lease with flock fallback.
set -euo pipefail

DEPLOY_STORAGE_ACCOUNT="${ATLAS_DEPLOY_STORAGE_ACCOUNT:-sthvcgwebintake}"
DEPLOY_CONTAINER="${ATLAS_DEPLOY_CONTAINER:-atlas-deploy-control}"
DEPLOY_LOCK_BLOB="${ATLAS_DEPLOY_LOCK_BLOB:-hub-production.lock}"
DEPLOY_STATE_BLOB="${ATLAS_DEPLOY_STATE_BLOB:-hub-production-state.json}"
DEPLOY_LEASE_DURATION="${ATLAS_DEPLOY_LEASE_DURATION:-90}"
DEPLOY_FLOCK_FILE="${ATLAS_DEPLOY_FLOCK_FILE:-deployment/artifacts/hub-deploy.flock}"

ATLAS_DEPLOY_LEASE_ID=""
ATLAS_DEPLOY_LEASE_MODE=""

deploy_lease_acquire() {
  local holder_id="${1:-unknown}"
  local candidate_sha="${2:-unknown}"
  local branch="${3:-unknown}"

  if command -v az >/dev/null 2>&1; then
    if az storage container create \
      --account-name "$DEPLOY_STORAGE_ACCOUNT" \
      --name "$DEPLOY_CONTAINER" \
      --auth-mode login \
      -o none 2>/dev/null; then
      local lease_id
      lease_id="$(az storage blob lease acquire \
        --account-name "$DEPLOY_STORAGE_ACCOUNT" \
        --container-name "$DEPLOY_CONTAINER" \
        --name "$DEPLOY_LOCK_BLOB" \
        --lease-duration "$DEPLOY_LEASE_DURATION" \
        --auth-mode login \
        -o tsv 2>/dev/null || true)"
      if [[ -n "$lease_id" ]]; then
        ATLAS_DEPLOY_LEASE_ID="$lease_id"
        ATLAS_DEPLOY_LEASE_MODE="azure_blob"
        local state_json
        state_json="$(node -e "
          const now = Date.now();
          const d = ${DEPLOY_LEASE_DURATION};
          console.log(JSON.stringify({
            contractVersion: 'atlas-hub-deploy-lease.v1',
            leaseId: '${lease_id}',
            holderId: '${holder_id}',
            candidateSha: '${candidate_sha}',
            branch: '${branch}',
            acquiredAt: new Date(now).toISOString(),
            expiresAt: new Date(now + d * 1000).toISOString(),
          }));
        ")"
        az storage blob upload \
          --account-name "$DEPLOY_STORAGE_ACCOUNT" \
          --container-name "$DEPLOY_CONTAINER" \
          --name "$DEPLOY_LOCK_BLOB" \
          --data "$state_json" \
          --overwrite \
          --auth-mode login \
          -o none 2>/dev/null || true
        echo "Deploy lease acquired (azure_blob) holder=${holder_id}"
        return 0
      fi
      echo "WARN: Azure blob lease unavailable; falling back to flock"
    fi
  fi

  mkdir -p "$(dirname "$DEPLOY_FLOCK_FILE")"
  exec 9>"$DEPLOY_FLOCK_FILE"
  if flock -n 9; then
    ATLAS_DEPLOY_LEASE_MODE="flock"
    echo "Deploy lease acquired (flock) holder=${holder_id}"
    return 0
  fi
  echo "BLOCKED: another deploy holds the flock lock"
  return 1
}

deploy_lease_release() {
  if [[ "$ATLAS_DEPLOY_LEASE_MODE" == "azure_blob" && -n "${ATLAS_DEPLOY_LEASE_ID:-}" ]]; then
    az storage blob lease release \
      --account-name "$DEPLOY_STORAGE_ACCOUNT" \
      --container-name "$DEPLOY_CONTAINER" \
      --blob-name "$DEPLOY_LOCK_BLOB" \
      --lease-id "$ATLAS_DEPLOY_LEASE_ID" \
      --auth-mode login \
      -o none 2>/dev/null || true
    echo "Deploy lease released (azure_blob)"
  fi
  if [[ "$ATLAS_DEPLOY_LEASE_MODE" == "flock" ]]; then
    flock -u 9 2>/dev/null || true
    echo "Deploy lease released (flock)"
  fi
}

deploy_record_production_state() {
  local canonical_sha="$1"
  local deployed_sha="$2"
  local branch="$3"
  local holder_id="${4:-}"

  if [[ "$ATLAS_DEPLOY_LEASE_MODE" != "azure_blob" ]]; then
    return 0
  fi

  local state_json
  state_json="$(node -e "
    console.log(JSON.stringify({
      contractVersion: 'atlas-hub-deploy-lease.v1',
      canonicalSha: '${canonical_sha}',
      deployedSha: '${deployed_sha}',
      branch: '${branch}',
      deployedAt: new Date().toISOString(),
      holderId: '${holder_id}',
    }));
  ")"

  az storage blob upload \
    --account-name "$DEPLOY_STORAGE_ACCOUNT" \
    --container-name "$DEPLOY_CONTAINER" \
    --name "$DEPLOY_STATE_BLOB" \
    --data "$state_json" \
    --overwrite \
    --auth-mode login \
    -o none 2>/dev/null || true
}
