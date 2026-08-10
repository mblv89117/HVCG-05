#!/bin/zsh
# Install/sync LaunchAgent wrappers + plists for atlas-local-ai-operations.
# Machine-local only. Does not reboot, deploy, or merge.
set -euo pipefail

ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-local-ai-operations"
APP_SUPPORT="${HOME}/Library/Application Support/HVCG-Atlas"
BIN="${APP_SUPPORT}/bin"
LOG_DIR="${HOME}/Library/Logs/HVCG-Atlas"
LA="${HOME}/Library/LaunchAgents"

mkdir -p "$BIN" "$LOG_DIR"

cp -f "$ROOT/scripts/local-ops/atlas-hub-launch.sh" "$BIN/atlas-hub-launch.sh"
cp -f "$ROOT/scripts/local-ops/atlas-elite-launch.sh" "$BIN/atlas-elite-launch.sh"
cp -f "$ROOT/scripts/local-ops/atlas-health-check.sh" "$BIN/atlas-health-check.sh"
chmod +x "$BIN"/*.sh

cat > "$LA/com.hvcg.atlas-hub.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.hvcg.atlas-hub</string>
  <key>WorkingDirectory</key><string>${APP_SUPPORT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${BIN}/atlas-hub-launch.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
  </dict>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${LOG_DIR}/hub.out.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/hub.err.log</string>
</dict>
</plist>
PLIST

cat > "$LA/com.hvcg.atlas-elite.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.hvcg.atlas-elite</string>
  <key>WorkingDirectory</key><string>${APP_SUPPORT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${BIN}/atlas-elite-launch.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
  </dict>
  <key>ThrottleInterval</key><integer>20</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${LOG_DIR}/elite.out.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/elite.err.log</string>
</dict>
</plist>
PLIST

plutil -lint "$LA/com.hvcg.atlas-hub.plist"
plutil -lint "$LA/com.hvcg.atlas-elite.plist"

uid=$(id -u)
launchctl bootout "gui/${uid}/com.hvcg.atlas-hub" 2>/dev/null || true
launchctl bootout "gui/${uid}/com.hvcg.atlas-elite" 2>/dev/null || true
launchctl bootstrap "gui/${uid}" "$LA/com.hvcg.atlas-hub.plist"
launchctl bootstrap "gui/${uid}" "$LA/com.hvcg.atlas-elite.plist"
launchctl kickstart -k "gui/${uid}/com.hvcg.atlas-hub"
sleep 3
launchctl kickstart -k "gui/${uid}/com.hvcg.atlas-elite"

echo "Installed wrappers → ${BIN}"
echo "Installed plists → ${LA}"
echo "Run health: ${BIN}/atlas-health-check.sh"
