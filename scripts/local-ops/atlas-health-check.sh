#!/bin/zsh
# Atlas local health verification (loopback only). No secrets printed.
set -euo pipefail

HOST_ELITE="127.0.0.1"
HOST_HUB="127.0.0.1"
ELITE_PORT=5180
HUB_PORT=8790
PREVIEW_PORT=8765
OLLAMA_PORT=11434

ok() { print -r -- "OK  $*"; }
bad() { print -r -- "FAIL $*"; }

elite_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://${HOST_ELITE}:${ELITE_PORT}/" || true)
ws_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://${HOST_ELITE}:${ELITE_PORT}/website-studio" || true)
hub_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://${HOST_HUB}:${HUB_PORT}/health" || true)
preview_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:${PREVIEW_PORT}/" || true)
ollama_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://127.0.0.1:${OLLAMA_PORT}/api/tags" || true)

[[ "$elite_code" == "200" ]] && ok "Elite ${HOST_ELITE}:${ELITE_PORT} ($elite_code)" || bad "Elite ${HOST_ELITE}:${ELITE_PORT} ($elite_code)"
[[ "$ws_code" == "200" ]] && ok "Website Studio route ($ws_code)" || bad "Website Studio route ($ws_code)"
[[ "$hub_code" == "200" ]] && ok "Hub health ${HOST_HUB}:${HUB_PORT} ($hub_code)" || bad "Hub health ${HOST_HUB}:${HUB_PORT} ($hub_code)"

# Preview is on-demand — Offline is acceptable
if [[ "$preview_code" == "200" ]]; then
  ok "HVCG Preview ${PREVIEW_PORT} running (on-demand)"
else
  ok "HVCG Preview ${PREVIEW_PORT} offline (expected unless Start Preview)"
fi

[[ "$ollama_code" == "200" ]] && ok "Ollama ${OLLAMA_PORT}" || bad "Ollama ${OLLAMA_PORT} ($ollama_code)"

if command -v clamscan >/dev/null 2>&1; then
  ok "clamscan available"
else
  bad "clamscan missing"
fi

# Bind checks: Elite/Hub must not be *:port for local LaunchAgent policy
elite_bind=$(lsof -nP -iTCP:${ELITE_PORT} -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $9}' | head -1)
hub_bind=$(lsof -nP -iTCP:${HUB_PORT} -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $9}' | head -1)
print -r -- "BIND Elite=${elite_bind:-none} Hub=${hub_bind:-none}"

# Worktree path check for listeners
for port in $ELITE_PORT $HUB_PORT; do
  pid=$(lsof -nP -iTCP:$port -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  if [[ -n "${pid:-}" ]]; then
    cwd=$(lsof -a -p "$pid" -d cwd 2>/dev/null | awk 'NR==2{print $NF}')
    print -r -- "CWD port=$port pid=$pid cwd=$cwd"
  fi
done
