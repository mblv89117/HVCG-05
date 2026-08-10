# Phase 6B-OPS — Atlas Local Startup Reliability

## Root cause

`~/Library/LaunchAgents/com.hvcg.atlas-elite.plist` and `com.hvcg.atlas-hub.plist`
previously pointed at the **old** worktree:

`…/.worktrees/atlas-integration-release`

Active Website Studio / Local AI work lives in:

`…/.worktrees/atlas-local-ai-operations`

Those LaunchAgents were unloaded during UAT, so after reboots or process death Manny
had to restart Elite/Hub manually from Terminal/Cursor.

## Machine LaunchAgents (not committed)

| Label | Path |
|---|---|
| Elite | `~/Library/LaunchAgents/com.hvcg.atlas-elite.plist` |
| Hub | `~/Library/LaunchAgents/com.hvcg.atlas-hub.plist` |

**Important:** plists invoke wrappers under:

`~/Library/Application Support/HVCG-Atlas/bin/`

LaunchAgents cannot reliably execute scripts directly from the external
`/Volumes/MacMiniPro2TB/...` path (TCC / exit 127). Wrappers still `cd` into the
`atlas-local-ai-operations` worktree.

| Service | Port | Auto-start |
|---|---|---|
| Integration Hub | 127.0.0.1:8790 | Yes (LaunchAgent) |
| Elite OS | 127.0.0.1:5180 | Yes (LaunchAgent) |
| HVCG Preview | 127.0.0.1:8765 | **No** — Website Studio on-demand |
| Ollama | 127.0.0.1:11434 | Independent |

## Repo scripts (committed)

- `scripts/local-ops/atlas-hub-launch.sh`
- `scripts/local-ops/atlas-elite-launch.sh`
- `scripts/local-ops/atlas-health-check.sh`
- `scripts/local-ops/install-launchagents-local.sh`
- `scripts/local-ops/templates/*.plist.template`

## Backups

`~/Library/Application Support/HVCG-Atlas/launchagent-backups/<timestamp>/`

## Logs

`~/Library/Logs/HVCG-Atlas/`

## Owner UI

Website Studio → **Website Settings** → **Local System**

## Safety

- Bind 127.0.0.1 only
- Preview not LaunchAgent-managed
- `LOCAL_AI_WRITES_ENABLED=false`
- `LOCAL_AI_EXTERNAL_MESSAGES_ENABLED=false`
- `EVA_INTAKE_ENABLED=false`
- `CLIENT_EMAILS_ENABLED=false`
- Do not `source` `.secrets/*` from LaunchAgent (TCC)

## Install / reload

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-local-ai-operations"
./scripts/local-ops/install-launchagents-local.sh
./scripts/local-ops/atlas-health-check.sh
open http://127.0.0.1:5180/website-studio
```

## Rollback

```bash
uid=$(id -u)
BACKUP="$HOME/Library/Application Support/HVCG-Atlas/launchagent-backups/<timestamp>"
launchctl bootout "gui/$uid/com.hvcg.atlas-hub" 2>/dev/null || true
launchctl bootout "gui/$uid/com.hvcg.atlas-elite" 2>/dev/null || true
cp "$BACKUP/com.hvcg.atlas-hub.plist" ~/Library/LaunchAgents/
cp "$BACKUP/com.hvcg.atlas-elite.plist" ~/Library/LaunchAgents/
# leave unloaded, or bootstrap if you intentionally want the old release worktree
```

## Reboot UAT (Manny authorization required)

Do **not** reboot automatically.

1. Restart Mac Mini when convenient.
2. Log in; wait ~30–60s.
3. Open http://127.0.0.1:5180/website-studio
4. Confirm no Terminal/Cursor needed.
5. Confirm HVCG Preview Offline until Start Preview.
6. Website Studio → Settings → Local System → Refresh.
