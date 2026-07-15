# PROJECT HANDOFF — HVCG OS (resume without chat history)

## Purpose
HVCG Project Management System (HVCG OS) v1.1.0 — Opportunity CRM module live Development SharePoint apply, then Maker-gated Power Platform activation. Agents continue autonomously under frozen-infra / no-Production / no concurrent second repair rules.

## Architecture (brief)
- SharePoint lists/schema (PnP.PowerShell) as system of record for CRM + ops data
- Power Apps canvas + Power Automate flows (Maker import/publish — approval gate)
- Deployment scripts under `deployment/` with modules `HVCG.Deployment` / `HVCG.Release`
- Schema source of truth in repo; `Repair-HVCGOSSharePointSchema.ps1` idempotent align to Dev

## Repo / branch
- Remote: `https://github.com/mblv89117/HVCG-05.git`
- Branch: `cursor/v1.1.0-intelligence-ai-ops` (tracks origin)
- CRM integration merge: `8635397`
- Prior docs tip: `9d77c2f`
- Workspace: `/Volumes/MacMiniPro2TB/HVCG Project Management System`

## Environment
- Target: **development** only this phase
- Site: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Tag: `v1.1.0-dev-sharepoint-baseline` (pre-CRM freeze)
- Production: **do not start**

## Auth approach
- Microsoft Graph interactive (tenant connected in current repair)
- PnP Interactive + Entra app ClientId (`Connect-HVCGPnPOnline` / resolved ClientId in logs)
- Do not commit secrets / `.env` / credentials

## Completed components
- Opportunity CRM repo package (six parallel workstreams) merged
- Offline predeploy tests **PASS**; consolidated acceptance docs under `docs/crm/`
- Live repair progress: CRM fields/lists, lookups, CRM views; repeated schema compliance **1170** fields, `hasDrift: false` (latest JSON `@ 2026-07-15T17:19:35Z` pre-seed / pre-final)

## Repair / build phase
- **ACTIVE** — `Repair-HVCGOSSharePointSchema.ps1 -Environment development`
- PID **12090**, parent shell **12084**, terminal **573342**
- Started 2026-07-15 09:24:13 PT
- Last checkpoint STEP: `[2026-07-15T10:20:06] Validating SharePoint schema vs repo (post-repair)...`
- Tee log: `deployment/reports/checkpoints/repair-opportunity-crm-live.log`
- **caffeinate** already present (pid **74204**) — do not spam additional instances
- Pre-CRM Full backup completed (term 573341, `BACKUP_LIVE_EXIT:0`, `backups/development/20260715-092137`)

## Deploy state
- SharePoint Dev repair in flight (no Production)
- Power Platform: **no** flow import / app publish / Teams activation executed
- Maker steps **WAITING FOR APPROVAL** after successful repair attest

## Last checkpoint
Post-repair schema validation in progress (quiet window expected ~13–14 min). Do not kill or interrupt. Classify health by new STEP/SUCCESS timestamps and exit footer — not mere PID existence.

## Exact next steps
1. Monitor terminal **573342** / log for post-repair SUCCESS + `REPAIR_EXIT:0`.
2. **Next monitor due:** ~**2026-07-15 11:05 PT** (~30 min from 10:33 PT status write), or sooner if parent re-delegates after short polls.
3. On COMPLETED success: attest `hasDrift: false` / field counts; optional quick `tests/Invoke-HVCGPreDeploymentTests.ps1`; document Maker OA waiting for approval.
4. If STALLED/dead (no PID + no footer + no new log): one idempotent resume — `pwsh -NoProfile -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development` (reuse existing caffeinate).
5. Never concurrent second SharePoint repair while one is healthy.

## Known issues
- Schema validation phases are long/silent (~13–14 min) — not automatically stalled.
- Module unapproved-verb WARNING spam on import — ignore.
- Global `*.log` gitignore — activity log tracked via force-add under `deployment/reports/AGENT_ACTIVITY.log`.

## Failed approaches
- Starting overlapping Repair while another live instance is healthy — forbidden / causes contention.
- Treating “no new log lines for a few minutes” alone as failure during schema validation.

## Dependencies / tools
- PowerShell 7 (`pwsh`), PnP.PowerShell 3.3.0, Microsoft.Graph 2.38.1
- Cursor terminals + optional `caffeinate -dimsu`
- `gh` / git for status doc commits only (no force push)

## Permissions
- Interactive Graph/PnP consent already obtained for current repair session
- Git push of docs status milestones OK
- Flow import / publish / Teams / Production require **user approval**

## Important commands
```powershell
# Idempotent Dev repair (only if prior run dead)
pwsh -NoProfile -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development

# Offline predeploy (safe after repair success)
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1

# Health / backup (do not collide with live repair arbitrarily)
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

## Testing / deploy / rollback
- Test: offline predeploy + CRM unit suite after repair COMPLETED
- Deploy: Maker OA per `docs/crm/OWNER_ACTION_GUIDE.md` only after approval
- Rollback: pre-CRM backup at `backups/development/20260715-092137`; do not delete SP lists via agents; repair is additive/idempotent

## Recent files
- `PROJECT_STATUS.md`, `PROJECT_HANDOFF.md`, `NEXT_SESSION.md`
- `deployment/reports/AGENT_ACTIVITY.log`
- `deployment/reports/checkpoints/repair-opportunity-crm-live.log`
- `deployment/reports/schema/schema-validation-latest.json`
- `docs/crm/*` (OWNER_ACTION_GUIDE, CONSOLIDATED_ACCEPTANCE_REPORT, etc.)

## Must-not-modify areas
- Deployment engines (`deployment/lib/*` provisioning) unless confirmed defect
- Production environment / promote
- Concurrent second SharePoint repair while healthy
- `.worktrees/`, secrets, force push, amend, git config

## Decisions made
- Leave ACTIVE repair running; monitor; do not re-run
- Maker gated until repair success + explicit approval
- Status docs committed as milestones for handoff

## Decisions required (user)
- Approve Maker OA (flow import / canvas publish / Teams) only after schema attest
- Production timing (OA-CRM-11) — later

## Commit hashes
- CRM merge: `8635397`
- Prior status: `9d77c2f`
- This handoff commit: _pending after push_
