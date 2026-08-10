#!/bin/zsh
# Atlas local LaunchAgent helper — Elite OS (127.0.0.1:5180)
# Managed by com.hvcg.atlas-elite. Do not start HVCG website preview here.
set -euo pipefail

ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-local-ai-operations"
PORT=5180
HOST="127.0.0.1"
LOG_DIR="${HOME}/Library/Logs/HVCG-Atlas"
STATE_DIR="${HOME}/Library/Application Support/HVCG-Atlas/launch"
LAUNCH_LOG="${LOG_DIR}/elite-launch.log"
ELITE_DIR="${ROOT}/apps/atlas-elite-os"

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
rotate_if_large "${LOG_DIR}/elite.out.log"
rotate_if_large "${LOG_DIR}/elite.err.log"

if [[ ! -d "$ROOT" ]]; then
  log "ERROR worktree missing: $ROOT"
  exit 1
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export ATLAS_REPO_ROOT="$ROOT"

port_listening() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

health_ok() {
  curl -sf --max-time 2 "http://${HOST}:${PORT}/" >/dev/null 2>&1
}

# Duplicate prevention: if Elite already healthy, monitor until it dies.
if port_listening && health_ok; then
  log "Elite already healthy on ${HOST}:${PORT}; monitoring existing listener (no duplicate spawn)"
  print -r -- $$ >"${STATE_DIR}/elite-monitor.pid"
  while port_listening && health_ok; do
    sleep 8
  done
  log "Existing Elite listener ended; exiting for KeepAlive restart"
  exit 1
fi

if port_listening && ! health_ok; then
  log "WARN port ${PORT} busy but health check failed; waiting before retry"
  sleep 12
  exit 1
fi

cd "$ROOT"
log "Starting Elite from ${ROOT} (package @hvcg/atlas-elite-os) bind ${HOST}:${PORT}"
print -r -- $$ >"${STATE_DIR}/elite-launcher.pid"

# Prefer workspace script so node_modules resolution matches monorepo layout.
# Vite loads apps/atlas-elite-os/.env.local automatically (no secrets in plist).
exec npm run dev -w @hvcg/atlas-elite-os -- --host "$HOST" --port "$PORT"
