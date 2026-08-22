# Capital Operations — Release provenance

**Recorded:** 2026-08-20 (Hub+Elite cutover). Prior 2026-08-18 rows are historical.  
**Branch:** `cursor/atlas-hv-completion-52d1`  
**Honesty rule:** Repo HEAD is **not** automatically production. Do not report “deployed latest.” Cite the running Hub SHA and Azure deployment ID below.  
**Current-reality companion:** [ATLAS_LIVE_RELEASE_2026-08-20.md](ATLAS_LIVE_RELEASE_2026-08-20.md)

This file is the operator record of **what is live** versus **what is in git**. It does not deploy, mutate App Settings, or delete artifacts.

---

## What is running in production

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| **Running Hub SHA** | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |
| **Azure deployment ID** | `9b406df7-984c-43c0-a4e1-52a291eb79b3` |
| Commit message (that SHA) | `chore(atlas): add live Capital attestation and search cert scripts` (runtime ancestor `ec71350` Lead→Prospect) |
| Runtime-critical ancestor | `3f794f7a8b51c094dba7e4cd5febd0c6bc81c6a6` (governed activation; deployed earlier this window as `828e426b`) |
| Prior running zip before this window | `5b50ca2c338b34afffa5796d6fa79298a7b27d4c` (deployment `7795bc89-daaa-43a8-8213-581e01c0f460`) |
| Stale cited ID | `dd965bc2` is an older **inactive** 2026-08-18 deploy, not current |

That SHA is the zip that was deployed. Overlay facts persist under `INTEGRATION_DATA_DIR=/home/webapp_data/integrations/capital-overlay` (App Service `/home`, survives recycle and zip `--clean` of wwwroot). Health now observes that path: `recycleSurvivable=true`, `redeploySurvivable=true`, `multiInstanceSafe=false`. Built-in Linux `NODE\|22-lts`, plan B1 capacity 1, autoscale none, `WEBSITE_RUN_FROM_PACKAGE=0`. `WEBSITES_ENABLE_APP_SERVICE_STORAGE` is unset (default persistent `/home`).

GitHub workflows do **not** deploy Hub.

---

## Repo HEAD is independent of production

`git rev-parse HEAD` in this worktree answers “what is checked out,” not “what Azure is running.”

Treat them as two facts:

1. **Worktree HEAD** — local / branch tip. Changes here do nothing to production until an explicit Hub deploy.
2. **Running Hub SHA** — `940a4849577ad5356da86850e2eccdbf3fe4e86b` until the next successful `az webapp deploy`. A later docs-only commit on this branch is not production.

Do not infer production from:

- uncommitted files
- a newer local commit
- `deployment/reports/HVCG-Dev-Deploy-latest.md` (that file is a local PnP/dev report, not Hub provenance)
- Elite or other app deploys

Update **this file** when a new Hub zip is actually live.

---

## Rollback zip (gitignored)

`Deploy-HVCGCapitalHub.ps1 -Apply` archives the previous Kudu `server.js` under:

```
deployment/artifacts/hub-rollback/
```

That directory is **gitignored** (with `deployment/artifacts/hub-build/` and `deployment/artifacts/hub-*.zip`). Do not commit rollback binaries, Kudu copies, or publish credentials.

Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1` (defaults to the newest `pre-*.zip` in that folder). Current rollback zip from this window: `deployment/artifacts/hub-rollback/pre-3f794f7a8b51c094dba7e4cd5febd0c6bc81c6a6-20260820-014626.zip`. That archive is the pre-window production zip (`5b50ca2`). Rollback restores the archived zip and does not delete SharePoint lists/columns. Overlay JSON under `/home/webapp_data` is not in the zip; rolling back code does not wipe that overlay.

---

## `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH` requires stop/start

Changing this App Setting is **not** a code deploy, but the worker does not reliably pick up the new value from a settings write alone.

Use `deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1`:

```powershell
# labeled QA window
pwsh -File ./deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1 -Apply -AllowSyntheticGraph

# production default after QA
pwsh -File ./deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1 -Apply
```

That script writes settings, then **stops and starts** `app-atlas-integration-hub` so `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH` loads. Verify `GET /health` (`capitalBackend.mode=sharepoint`) after restart.

Do not leave the synthetic flag `true` outside a labeled SYN* QA window.

---

## Worktree hygiene — dated deploy reports

Do **not** commit dated copies:

```
deployment/reports/HVCG-Dev-Deploy-20*.md
deployment/reports/HVCG-Dev-Deploy-20*.json
```

`.gitignore` already covers those globs. `HVCG-Dev-Deploy-latest.md` / `.json` remain tracked as the rolling latest pointer. Leave existing dated files on disk; do not delete them to “clean” the tree, and do not revert the gitignore entries.

Also never commit:

- `.env*` / `config/environments/*.json` secrets
- Hub rollback zips or `server.js` snapshots
- Kudu / publishing credentials
- entitlement maps, tokens, or Key Vault values

---

## Related

- [CAPITAL_RELEASE_HANDOFF.md](CAPITAL_RELEASE_HANDOFF.md) — Hub App Settings and owner actions
- [CAPITAL_PRODUCTION_ENABLEMENT.md](CAPITAL_PRODUCTION_ENABLEMENT.md) — deploy / settings / rollback sequence
- [CAPITAL_PHASE2_CONTRACTS.md](CAPITAL_PHASE2_CONTRACTS.md) — runtime SHA reminder for parallel agents
- `deployment/scripts/Deploy-HVCGCapitalHub.ps1`
- `deployment/scripts/Set-HVCGCapitalHubAppSettings.ps1`
- `deployment/scripts/Rollback-HVCGCapitalHub.ps1`
