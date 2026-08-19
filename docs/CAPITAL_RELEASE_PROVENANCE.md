# Capital Operations — Release provenance

**Recorded:** 2026-08-19  
**Honesty worktree:** `.worktrees/atlas-phase5-docs`  
**Honesty branch:** `feature/atlas-phase5-docs` (docs only; HEAD is **not** Azure)  
**Honesty rule:** Repo HEAD is **not** automatically production. Do not report “deployed latest.” Hub zip is `b333fb4`. Elite SWA is `2a4e115`. stash0 `773e120` is **not** applied. `origin/main` (`b641fdd`) is **not** production.

This file is the operator record of **what is live** versus **what is in git**. It does not deploy, mutate App Settings, delete artifacts, merge `main`, or block a CRM Hub deploy.

---

## What is running in production (LIVE)

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| **Running Hub SHA** | `b333fb4b833668ab5d2689446a10268868c75a4b` |
| **Azure deployment ID** | `5d3826c0-f784-41da-9043-6912e63e122e` |
| Commit message (that SHA) | `fix(hub): require matching attested package for recorded submission` |
| Kudu `ATLAS_HUB_COMMIT.txt` | `b333fb4b833668ab5d2689446a10268868c75a4b` |
| LIVE `/health` | `ok`; `authRequired=true`; `insecureDevAuth=false`; `pmBackend.mode=sharepoint`; `capitalBackend.mode=sharepoint`; overlay durable; `websiteLeads.configured=true` |
| LIVE Elite (separate app) | `2a4e115acdd881ef074f4c795fbe1e575f8fb7af` at `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` asset `index-CiVmQVqq.js` (Last-Modified 2026-08-19 03:23:27 UTC). Contains Capital `b9806bc` + Client `0ffb645`. **Not redeployed for this Hub hotfix.** |
| Immediate prior Hub zip | `a43803edb29a3f8dd080033ca579a09532d89fbc` (deployment `3d406e37-2d91-4fd6-a20b-8c955c7b5733`) — rollback archive `server.js.pre-a43803e-20260819-040903` |
| Immediate prior Elite | `e5740379ff16b68f329b7e2388867d7a43233a5b` asset `index-DvEHjcS6.js` |
| Older Hub zip | `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` (deployment `dd965bc2-6d56-4f80-b126-67fcecfc33db`) — superseded |
| Ancestor noted on the prior record | `0b2305cf40bf35871256e923344216b21d6f1baa` (Phase 4 transaction execution OS); earlier zip `e49be659e8d7d0c7f6079cd505b73469398f2d4c` |

That SHA is the zip that was deployed. Overlay facts persist under `INTEGRATION_DATA_DIR=/home/webapp_data/integrations/capital-overlay` (App Service `/home`, survives recycle and zip `--clean` of wwwroot). Health observes that overlay as **durable**. Built-in Linux `NODE|22-lts`, plan B1 capacity 1, autoscale none, `WEBSITE_RUN_FROM_PACKAGE=0` were true on the prior recorded host; this honesty pass did not re-inventory SKU.

**ACCG01 ACL Apply was not run.** `capitalBackend.mode=sharepoint` is a Hub App Setting / health observation. It is not proof that Selected grants were applied on ACCG01.

GitHub workflows do **not** deploy Hub.

---

## CRM operator (LIVE — Owner-browser `/leads` PASS)

Hub zip `b333fb4` (CRM operator `a43803e` plus confirmation-gate) and Elite `2a4e115` are **running**. Anonymous `/api/pm/projects` and `/api/pm/leads` are **401**. Authenticated Microsoft Hub session returned 12 `HVCG_Leads` after the hotfix.

Phase 5C Owner-browser `/leads` **PASS**. Convert Lead → Opportunity (`887edd8`) is **not** in the live zip.

## Phase 5D confirmation-gate (LIVE Hub `b333fb4`)

Recorded submission requires a prepared application package for the **same** opportunity + lender, in `APPROVED_FOR_SUBMISSION`. Mismatched `lenderId` is **422**. Live proof: SYN01 `cap-309f30f9-272a-4775-a2ae-31d23fc88967` at ReadyForSubmission, celtic-bank PREPARED, `lenderId=ln-synthetic-1` → 422, zero submission rows. ACCG/Prodigy/Hart not mutated. Elite not redeployed.

Matching attested HTTP 200 is separately blocked by SYN SharePoint Graph **503** (overlay still writes `SUBMISSION_RECORDED`). That is P2, not a reopened P1.

---

## Phase 5B Elite (LIVE SWA `2a4e115` — Hub zip unchanged)

| Item | SHA / branch | Status |
|------|--------------|--------|
| Capital Elite post-shortlist execution | `b9806bc` inside SWA `2a4e115` | **LIVE DEPLOYED.** Elite-only. Hub is `b333fb4`. Owner-browser `/capital` PASS. |
| Client ops Elite detail | `0ffb645` inside SWA `2a4e115` | **LIVE DEPLOYED.** Elite-only. SYN01 workspace items currently empty. |
| stash0 Hub hardening | `773e120` `fix/hub-stash0-hardening` | **NOT APPLIED.** Wave 2 conflicts with live CRM. Do not apply. |

**Search P2 (open):** SYN* Command-K / Hub search still **15–24s**. Do not call this fixed.

---

## Repo HEAD is independent of production

`git rev-parse HEAD` in this worktree answers “what is checked out,” not “what Azure is running.”

Treat them as two facts:

1. **Worktree HEAD** — local / branch tip. On this honesty branch that tip is a docs-only commit on top of CRM `a43803e`. Changes here do nothing to production until an explicit Hub/Elite deploy.
2. **Running Hub SHA** — `b333fb4b833668ab5d2689446a10268868c75a4b` until the next successful `az webapp deploy`. A later docs-only commit on this branch is not production.

Do not infer production from:

- uncommitted files
- a newer local commit (including Phase 5B `b9806bc` / `0ffb645` / `773e120`)
- `origin/main` (`b641fdd`)
- `deployment/reports/HVCG-Dev-Deploy-latest.md` (that file is a local PnP/dev report, not Hub provenance)
- Elite or other app deploys (Elite LIVE is `2a4e115` / `index-CiVmQVqq.js`; Hub is `b333fb4`)

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
