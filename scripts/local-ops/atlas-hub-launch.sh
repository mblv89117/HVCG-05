#!/bin/zsh
# Atlas local LaunchAgent helper — Integration Hub (127.0.0.1:8790)
# Managed by com.hvcg.atlas-hub. Does NOT start HVCG preview (8765).
set -euo pipefail

ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-local-ai-operations"
PORT=8790
HOST="127.0.0.1"
LOG_DIR="${HOME}/Library/Logs/HVCG-Atlas"
STATE_DIR="${HOME}/Library/Application Support/HVCG-Atlas/launch"
LAUNCH_LOG="${LOG_DIR}/hub-launch.log"
HUB_DIR="${ROOT}/apps/atlas-integration-api"
WS_DB="${ROOT}/.data/website-studio/website-studio.sqlite"

mkdir -p "$LOG_DIR" "$STATE_DIR"

log() {
  print -r -- "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"$LAUNCH_LOG"
}

rotate_if_large() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local sz
    sz=$(stat -f%z "$f" 2>/dev/null || echo 0)
    if (( sz > 10485760 )); then
      mv -f "$f" "${f}.1" 2>/dev/null || true
    fi
  fi
}

rotate_if_large "$LAUNCH_LOG"
rotate_if_large "${LOG_DIR}/hub.out.log"
rotate_if_large "${LOG_DIR}/hub.err.log"

if [[ ! -d "$ROOT" ]]; then
  log "ERROR worktree missing: $ROOT"
  exit 1
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export ATLAS_REPO_ROOT="$ROOT"
export INTEGRATION_API_HOST="$HOST"
export INTEGRATION_API_PORT="$PORT"
export PUBLIC_BASE_URL="http://${HOST}:${PORT}"
export INTEGRATION_REQUIRE_AUTH=false
export INTEGRATION_ALLOWED_ORIGINS="http://127.0.0.1:5180,http://localhost:5180,http://127.0.0.1:5173,http://localhost:5173"
export INTEGRATION_ALLOW_EPHEMERAL_KEY="${INTEGRATION_ALLOW_EPHEMERAL_KEY:-1}"
export WEBSITE_STUDIO_DB="$WS_DB"

# Hard safety defaults for local LaunchAgent (never enable Production features here)
export LOCAL_AI_WRITES_ENABLED=false
export LOCAL_AI_EXTERNAL_MESSAGES_ENABLED=false
export EVA_INTAKE_ENABLED=false
export CLIENT_EMAILS_ENABLED=false

# Do NOT source .secrets/local-ai.env from LaunchAgent (macOS TCC can block launchd
# from reading .secrets on external volumes). The Hub process loads Local AI config itself.

port_listening() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

health_ok() {
  curl -sf --max-time 2 "http://${HOST}:${PORT}/health" >/dev/null 2>&1
}

if port_listening && health_ok; then
  log "Hub already healthy on ${HOST}:${PORT}; monitoring existing listener (no duplicate spawn)"
  print -r -- $$ >"${STATE_DIR}/hub-monitor.pid"
  while port_listening && health_ok; do
    sleep 8
  done
  log "Existing Hub listener ended; exiting for KeepAlive restart"
  exit 1
fi

if port_listening && ! health_ok; then
  log "WARN port ${PORT} busy but /health failed; waiting before retry"
  sleep 12
  exit 1
fi

cd "$HUB_DIR"
log "Starting Hub from ${HUB_DIR} bind ${HOST}:${PORT} WEBSITE_STUDIO_DB=${WS_DB}"
print -r -- $$ >"${STATE_DIR}/hub-launcher.pid"

exec npm run start
