# PROJECT HANDOFF — HVCG OS (resume without chat history)

## Purpose
HVCG Project Management System (HVCG OS) v1.1.0 — Opportunity CRM module applied on Development SharePoint; next phase is Maker-gated Power Platform activation (approval required). Agents continue under frozen-infra / no-Production / no flow-import-without-approval rules.

## Architecture (brief)
- SharePoint lists/schema (PnP.PowerShell) as system of record for CRM + ops data
- Power Apps canvas + Power Automate flows (Maker import/publish — **approval gate**)
- Deployment scripts under `deployment/` with modules `HVCG.Deployment` / `HVCG.Release`
- Schema source of truth in repo; `Repair-HVCGOSSharePointSchema.ps1` idempotent align to Dev

## Repo / branch
- Remote: `https://github.com/mblv89117/HVCG-05.git`
- Branch: `cursor/v1.1.0-intelligence-ai-ops` (tracks origin)
- CRM integration merge: `8635397`
- Workspace: `/Volumes/MacMiniPro2TB/HVCG Project Management System`

## Environment
- Target: **development** only this phase
- Site: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Tag: `v1.1.0-dev-sharepoint-baseline` (pre-CRM freeze)
- Production: **do not start**

## Auth approach
- Microsoft Graph interactive + PnP Interactive + Entra app ClientId (used successfully for completed repair)
- Do not commit secrets / `.env` / credentials

## Completed components
- Opportunity CRM repo package (six parallel workstreams) merged
- **Live Dev Repair COMPLETED** (term 573342): `REPAIR_EXIT:0`, `Success: True`, final schema `hasDrift: false`, **1170** fields / **82** lists
- CRM list `HVCG_OpportunityActivities`; Opportunity/Capital CRM fields + lookups; CRM views provisioned
- Dev seed gate: **28** `Seed:*` creates; Errors []; Skipped 1195 (idempotent)
- Offline predeploy + CRM acceptance **PASS** (`PREDEPLOY_EXIT:0`)

## Repair / build phase
- **IDLE / COMPLETE** — no live repair PID expected
- Evidence: tee `deployment/reports/checkpoints/repair-opportunity-crm-live.log`; report `deployment/reports/HVCG-Dev-Deploy-20260715-103353.json`; schema `deployment/reports/schema/schema-validation-20260715-103353.json`
- Pre-CRM Full backup: `backups/development/20260715-092137` (`BACKUP_LIVE_EXIT:0`)

## Deploy state
- SharePoint Dev: CRM schema applied and compliant
- Power Platform: **no** flow import / app publish / Teams activation executed
- Status: **WAITING FOR APPROVAL** for Maker OA

## Last checkpoint
Repair finished success; offline tests attested; docs updated for Maker gate.

## Exact next steps
1. **Next Step = Maker OA WAITING FOR APPROVAL** — ask user before any Maker action.
2. After approval: `docs/crm/OWNER_ACTION_GUIDE.md` (import → bind → activate → publish → Teams). No Production.
3. If SharePoint drift returns later: one idempotent `Repair-HVCGOSSharePointSchema.ps1 -Environment development` (no concurrent second repair).
4. Do not modify frozen deployment engines.

## Known issues
- `Test-HVCGSchemaValidation.ps1` (via predeploy) overwrites `schema-validation-latest.json` with mock data — restore from dated live artifact (`…103353`) after offline suite if needed.
- Module unapproved-verb WARNING spam on import — ignore.
- Global `*.log` gitignore — activity log tracked via force-add under `deployment/reports/AGENT_ACTIVITY.log`.

## Failed approaches
- Starting overlapping Repair while another live instance is healthy — forbidden.
- Treating schema-validation quiet windows (~13–14 min) as stalls — incorrect.

## Dependencies / tools
- PowerShell 7 (`pwsh`), PnP.PowerShell 3.3.0, Microsoft.Graph 2.38.1
- `gh` / git for status milestones (no force push)

## Permissions
- Repair auth already completed for this Dev apply
- Git push of docs status milestones OK
- Flow import / publish / Teams / Production require **user approval**

## Important commands
```powershell
# Idempotent Dev repair (only if drift / dead prior run)
pwsh -NoProfile -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development

# Offline predeploy (safe)
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1

# Health / backup
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

## Testing / deploy / rollback
- Test: offline predeploy **PASS** post-repair
- Deploy: Maker OA per OWNER_ACTION_GUIDE only after approval
- Rollback: pre-CRM backup `backups/development/20260715-092137`; repair is additive/idempotent; do not delete SP lists via agents

## Recent files
- `PROJECT_STATUS.md`, `PROJECT_HANDOFF.md`, `NEXT_SESSION.md`
- `deployment/reports/AGENT_ACTIVITY.log`
- `deployment/reports/checkpoints/repair-opportunity-crm-live.log`
- `deployment/reports/HVCG-Dev-Deploy-20260715-103353.json`
- `deployment/reports/schema/schema-validation-20260715-103353.json`
- `docs/crm/*`

## Must-not-modify areas
- Deployment engines (`deployment/lib/*` provisioning) unless confirmed defect
- Production environment / promote
- Concurrent second SharePoint repair while healthy
- Flow import / publish without user approval
- `.worktrees/`, secrets, force push, amend, git config

## Decisions made
- Repair success attested; Maker remains gated
- Restored live schema-validation-latest from post-repair artifact after offline unit overwrite
- Status docs committed as milestones for handoff

## Decisions required (user)
- Approve Maker OA (flow import / canvas publish / Teams)
- Production timing (OA-CRM-11) — later

## Commit hashes
- CRM merge: `8635397`
- This handoff commit: _(filled after commit)_
