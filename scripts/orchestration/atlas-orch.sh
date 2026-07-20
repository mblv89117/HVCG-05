#!/usr/bin/env bash
# Atlas Orchestration CLI entrypoint
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export HVCG_REPO_ROOT="${HVCG_REPO_ROOT:-$ROOT}"
exec python3 "$ROOT/scripts/orchestration/lib/atlas_orch.py" "$@"
