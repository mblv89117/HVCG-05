#!/usr/bin/env bash
set -euo pipefail
UD=/tmp/chrome-atlas-ss
OUT=/opt/cursor/artifacts/screenshots/elite-experience
REPO_OUT=/workspace/PROJECT_ATLAS/Screenshots/elite-experience
rm -rf "$UD"
mkdir -p "$UD" "$OUT" "$REPO_OUT"

shot() {
  local name="$1" url="$2" w="${3:-1440}" h="${4:-900}"
  google-chrome --headless=new --disable-gpu --no-sandbox \
    --user-data-dir="$UD" --window-size="${w},${h}" \
    --virtual-time-budget=12000 \
    --screenshot="${OUT}/${name}" "$url" >/dev/null 2>&1 || true
  echo "wrote ${name} ($(wc -c < "${OUT}/${name}" 2>/dev/null || echo 0) bytes)"
}

shot 01-executive-home.png http://127.0.0.1:4180/
shot 02-executive-dashboard.png http://127.0.0.1:4180/executive
shot 03-clients.png http://127.0.0.1:4180/clients
shot 04-client-workspace.png http://127.0.0.1:4180/clients/ws-ccb
shot 05-banking.png http://127.0.0.1:4180/banking
shot 06-financials.png http://127.0.0.1:4180/financials
shot 07-executive-home-mobile.png http://127.0.0.1:4180/ 390 844

cp -f "$OUT"/*.png "$REPO_OUT/" 2>/dev/null || true
ls -la "$OUT"
