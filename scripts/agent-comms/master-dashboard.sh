#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
_find_root() {
  local d="$SCRIPT_DIR"
  while [ "$d" != "/" ]; do
    if [ -d "$d/.agent-comms" ] || [ -d "$d/.git" ] || [ -f "$d/.git" ]; then
      echo "$d"; return 0
    fi
    d="$(dirname "$d")"
  done
  cd "$SCRIPT_DIR/../.." && pwd
}
ROOT="$(_find_root)"
export HVCG_REPO_ROOT="${HVCG_REPO_ROOT:-$ROOT}"
PYTHON="${PYTHON:-python3}"
COMMS="$ROOT/scripts/agent-comms/lib/comms.py"
"$PYTHON" "$COMMS" dashboard
echo
"$PYTHON" "$COMMS" summary
