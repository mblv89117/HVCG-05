#!/usr/bin/env bash
# Read git SHA embedded in the live Elite SWA bundle (do not redeploy Elite to match Hub).
set -euo pipefail
ELITE_BASE="${ELITE_BASE:-https://zealous-rock-0090c7e1e.7.azurestaticapps.net}"
ASSET="$(curl -sf "${ELITE_BASE}/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)"
if [[ -z "$ASSET" ]]; then
  echo "ERROR: could not resolve Elite asset from ${ELITE_BASE}" >&2
  exit 1
fi
SHA="$(curl -sf "${ELITE_BASE}/${ASSET}" | grep -oE '[0-9a-f]{40}' | head -1)"
if [[ -z "$SHA" ]]; then
  echo "ERROR: could not extract Elite SHA from ${ELITE_BASE}/${ASSET}" >&2
  exit 1
fi
echo "$SHA"
