# Capital Operations — Release provenance

**Recorded:** 2026-08-18  
**Honesty worktree:** `.worktrees/atlas-phase5-docs`  
**Honesty branch:** `feature/atlas-phase5-docs` (docs only; HEAD is CRM candidate `a43803e`, **not** Azure)  
**Honesty rule:** Repo HEAD is **not** automatically production. Do not report “deployed latest.” Cite the running Hub SHA and Azure deployment ID below. `origin/main` (`b641fdd`) is **not** production.

This file is the operator record of **what is live** versus **what is in git**. It does not deploy, mutate App Settings, delete artifacts, merge `main`, or block a CRM Hub deploy.

---

## What is running in production (LIVE)

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| **Running Hub SHA** | `a43803edb29a3f8dd080033ca579a09532d89fbc` |
| **Azure deployment ID** | `3d406e37-2d91-4fd6-a20b-8c955c7b5733` |
| Commit message (that SHA) | `feat(atlas): add CRM operator workflow` |
| Kudu `ATLAS_HUB_COMMIT.txt` | `a43803edb29a3f8dd080033ca579a09532d89fbc` |
| LIVE `/health` | `ok`; `authRequired=true`; `insecureDevAuth=false`; `pmBackend.mode=sharepoint`; `capitalBackend.mode=sharepoint`; overlay durable; `websiteLeads.configured=true` |
| LIVE Elite (separate app) | `a43803edb29a3f8dd080033ca579a09532d89fbc` at `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` asset `index-iXOWTfM9.js` (Last-Modified 2026-08-19 03:11:17 UTC) |
| Immediate prior Hub zip | `d22b55f870efc0c105ed328a20a4ba4df077e6aa` (deployment `501fb29b-80f6-427d-8c65-3f1a88da52d9`) — rollback archive `server.js.pre-d22b55f-20260819-030627` |
| Immediate prior Elite | `e5740379ff16b68f329b7e2388867d7a43233a5b` asset `index-DvEHjcS6.js` |
| Older Hub zip | `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` (deployment `dd965bc2-6d56-4f80-b126-67fcecfc33db`) — superseded |
| Ancestor noted on the prior record | `0b2305cf40bf35871256e923344216b21d6f1baa` (Phase 4 transaction execution OS); earlier zip `e49be659e8d7d0c7f6079cd505b73469398f2d4c` |

That SHA is the zip that was deployed. Overlay facts persist under `INTEGRATION_DATA_DIR=/home/webapp_data/integrations/capital-overlay` (App Service `/home`, survives recycle and zip `--clean` of wwwroot). Health observes that overlay as **durable**. Built-in Linux `NODE|22-lts`, plan B1 capacity 1, autoscale none, `WEBSITE_RUN_FROM_PACKAGE=0` were true on the prior recorded host; this honesty pass did not re-inventory SKU.

**ACCG01 ACL Apply was not run.** `capitalBackend.mode=sharepoint` is a Hub App Setting / health observation. It is not proof that Selected grants were applied on ACCG01.

GitHub workflows do **not** deploy Hub.

---

## CRM operator (LIVE deployed 2026-08-19 — signed-in Premium UI HOLD)

Hub zip and Elite dist of `a43803e` are **running**. Anonymous `/api/pm/projects` and `/api/pm/leads` are **401**. Authenticated Microsoft Hub session (Azure CLI Hub audience, not Local Owner) returned 12 `HVCG_Leads`, required If-Match, rejected Converted PATCH, and returned 10 Home `myDay.waitingFollowUps` with `/leads/:id` hrefs.

Signed-in **rendered** `/leads` Premium UI was not certified in a browser Owner session this pass (unsigned production screenshots show Microsoft sign-in gate; Local Owner is not a certification session). Do not equate Hub API proof with a completed Premium UI gate.

---

## Repo HEAD is independent of production

`git rev-parse HEAD` in this worktree answers “what is checked out,” not “what Azure is running.”

Treat them as two facts:

1. **Worktree HEAD** — local / branch tip. On this honesty branch that tip is CRM candidate `a43803e`. Changes here do nothing to production until an explicit Hub/Elite deploy.
2. **Running Hub SHA** — `a43803edb29a3f8dd080033ca579a09532d89fbc` until the next successful `az webapp deploy`. A later docs-only commit on this branch is not production.

Do not infer production from:

- uncommitted files
- a newer local commit (including `a43803e`)
- `origin/main` (`b641fdd`)
- `deployment/reports/HVCG-Dev-Deploy-latest.md` (that file is a local PnP/dev report, not Hub provenance)
- Elite or other app deploys (Elite LIVE is now `a43803e` / `index-iXOWTfM9.js`, independently rollbackable to `e574037`)

Update **this file** when a new Hub zip is actually live.

---

## Rollback zip (gitignored)

`Deploy-HVCGCapitalHub.ps1 -Apply` archives the previous Kudu `server.js` under:

```
deployment/artifacts/hub-rollback/
```

That directory is **gitignored** (with `deployment/artifacts/hub-build/` and `deployment/artifacts/hub-*.zip`). Do not commit rollback binaries, Kudu copies, or publish credentials.

Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1` (defaults to the newest `pre-*.zip` in that folder). This honesty pass did **not** inventory the current on-disk rollback zip. The previously recorded archive name (`pre-8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f-20260818-115231.zip`) belonged to the **superseded** `8ff4220` deploy. Rollback restores an archived zip and does not delete SharePoint lists/columns. Overlay JSON under `/home/webapp_data` is not in the zip; rolling back code does not wipe that overlay. Do not run rollback from this docs branch.

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

Do not leave the synthetic flag `true` outside a labeled SYN* QA window. This docs agent does not run that script.

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
