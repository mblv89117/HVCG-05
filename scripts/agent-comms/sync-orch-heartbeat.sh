#!/usr/bin/env bash
# Bridge: publish orchestration heartbeat, then optionally ACK agent-comms status request.
# Does not send Outlook / Teams / Graph messages.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

_find_root() {
  local d="$SCRIPT_DIR"
  while [ "$d" != "/" ]; do
    if [ -d "$d/PROJECT_ATLAS/ORCHESTRATION" ]; then
      echo "$d"
      return 0
    fi
    if [ -d "$d/.agent-comms" ] || [ -d "$d/.git" ] || [ -f "$d/.git" ]; then
      if [ -d "$d/PROJECT_ATLAS/ORCHESTRATION" ]; then
        echo "$d"
        return 0
      fi
    fi
    d="$(dirname "$d")"
  done
  cd "$SCRIPT_DIR/../.." && pwd
}

ROOT="$(_find_root)"
export HVCG_REPO_ROOT="${HVCG_REPO_ROOT:-$ROOT}"
PYTHON="${PYTHON:-python3}"
BRIDGE="$ROOT/scripts/agent-comms/lib/orch_heartbeat_bridge.py"
exec "$PYTHON" "$BRIDGE" "$@"
