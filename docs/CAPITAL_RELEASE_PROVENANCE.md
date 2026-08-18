# Capital Operations — Release provenance

**Recorded:** 2026-08-18  
**Worktree:** `.worktrees/atlas-capital-operations`  
**Branch:** `feature/atlas-capital-operations`  
**Honesty rule:** Repo HEAD is **not** automatically production. Do not report “deployed latest.” Cite the running Hub SHA and Azure deployment ID below.

This file is the operator record of **what is live** versus **what is in git**. It does not deploy, mutate App Settings, or delete artifacts.

---

## What is running in production

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| **Running Hub SHA** | `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` |
| **Azure deployment ID** | `dd965bc2-6d56-4f80-b126-67fcecfc33db` |
| Commit message (that SHA) | `Persist overlay-only SYN submissions so recorded-only outreach survives Hub reload.` |
| Runtime-critical ancestor | `0b2305cf40bf35871256e923344216b21d6f1baa` (Phase 4 transaction execution OS) |
| Prior running zip | `e49be659e8d7d0c7f6079cd505b73469398f2d4c` (deployment `6fc7a842-1ab5-4750-9d43-1b498b099d5c`) |

That SHA is the zip that was deployed. Overlay facts persist under `INTEGRATION_DATA_DIR=/home/webapp_data/integrations/capital-overlay` (App Service `/home`, survives recycle and zip `--clean` of wwwroot). Health now observes that path: `recycleSurvivable=true`, `redeploySurvivable=true`, `multiInstanceSafe=false`. Built-in Linux `NODE\|22-lts`, plan B1 capacity 1, autoscale none, `WEBSITE_RUN_FROM_PACKAGE=0`. `WEBSITES_ENABLE_APP_SERVICE_STORAGE` is unset (default persistent `/home`).

GitHub workflows do **not** deploy Hub.

---

## Repo HEAD is independent of production

`git rev-parse HEAD` in this worktree answers “what is checked out,” not “what Azure is running.”

Treat them as two facts:

1. **Worktree HEAD** — local / branch tip. Changes here do nothing to production until an explicit Hub deploy.
2. **Running Hub SHA** — `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` until the next successful `az webapp deploy`. A later docs-only commit on this branch is not production.

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

Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1` (defaults to the newest `pre-*.zip` in that folder). Current rollback zip from this deploy: `deployment/artifacts/hub-rollback/pre-8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f-20260818-115231.zip`. That archive is the previous production zip (`0b2305c`, which itself replaced `e49be65`). Rollback restores the archived zip and does not delete SharePoint lists/columns. Overlay JSON under `/home/webapp_data` is not in the zip; rolling back code does not wipe that overlay.

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
