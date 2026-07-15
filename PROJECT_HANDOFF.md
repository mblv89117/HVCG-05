# PROJECT HANDOFF — HVCG OS (resume without chat history)

## Purpose
HVCG OS v1.1.0 Opportunity CRM: Dev SharePoint schema apply is done; continue only after Maker approval for Power Platform packaging/activation. No Production.

## Architecture (brief)
SharePoint lists (PnP) + Power Apps/Automate (Maker) + deployment modules under `deployment/`.

## Repo / branch
- Remote: `https://github.com/mblv89117/HVCG-05.git`
- Branch: `cursor/v1.1.0-intelligence-ai-ops`
- CRM merge: `8635397`
- Workspace: `/Volumes/MacMiniPro2TB/HVCG Project Management System`

## Environment
- **development** only for live apply completed
- Site: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Production: forbidden until OA-CRM-11 + approval

## Auth approach
Graph interactive + PnP Interactive/ClientId (used successfully during repair).

## Completed components
- Repo CRM package + offline predeploy/CRM tests
- Live Dev repair **COMPLETED** (`REPAIR_EXIT:0`, Success=True)
- Post-repair schema: hasDrift=false, okCount=1170, listsChecked=82, phase=post-repair
- Dated attest: `deployment/reports/schema/schema-validation-20260715-103353.json`
- Deploy report: `deployment/reports/HVCG-Dev-Deploy-20260715-103353.json`
- Tee log: `deployment/reports/checkpoints/repair-opportunity-crm-live.log`
- Pre-CRM backup: `backups/development/20260715-092137` (exit 0)

## Repair / build phase
- **COMPLETED** — terminal **573342**, was pid **12090**, ended ~10:33:53 PT / UTC 17:33:53
- Do **not** start another repair unless new confirmed drift

## Deploy state
- SharePoint Dev schema aligned
- Power Platform: **WAITING FOR APPROVAL** (no flow import / canvas publish / Teams done)
- No Production

## Last checkpoint
Repair finished success=True; offline predeploy PASS @ ~10:37 PT; `schema-validation-latest.json` restored from post-repair dated snapshot after unit-test pollution.

## Exact next steps
1. **Stop for user approval** on Maker OA (OA-CRM-05…10).
2. After approval only: connections → import four CRM flows → test/activate → publish apps → live acceptance notes.
3. Do not promote Production until OA-CRM-11.
4. Next autonomous monitor: only if user/parent re-delegates for Maker-approved work or new defects — no 30-min repair poll needed.

## Known issues
- `Invoke-HVCGPreDeploymentTests.ps1` schema drift unit test overwrites `schema-validation-latest.json` — use dated `schema-validation-20260715-103353.json` for live attest (latest restored afterward this session).
- Seed STEP has few SUCCESS lines after pre-seed OK; post-repair gate still clean.

## Failed approaches
- Concurrent second SharePoint repair while healthy — forbidden.
- Treating validation silence as stall — invalid.

## Dependencies / tools
pwsh 7.6.3, PnP.PowerShell 3.3.0, Microsoft.Graph 2.38.1, python3

## Permissions
Git push of docs OK. Maker import/publish/Teams and Production require explicit user approval.

## Important commands
```powershell
# Offline verify (safe)
pwsh -NoProfile -File ./tests/Invoke-HVCGPreDeploymentTests.ps1

# Idempotent repair ONLY if dead+needed
pwsh -NoProfile -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

## Testing / deploy / rollback
- Tests: offline predeploy PASS this session
- Deploy: Maker per OWNER_ACTION_GUIDE after approval
- Rollback reference: `backups/development/20260715-092137`

## Recent files
`PROJECT_STATUS.md`, `PROJECT_HANDOFF.md`, `NEXT_SESSION.md`, `deployment/reports/AGENT_ACTIVITY.log`, repair tee log, schema-validation-20260715-103353.json, HVCG-Dev-Deploy-20260715-103353.json

## Must-not-modify areas
Frozen deployment engines; Production; `.worktrees/`; secrets; force push.

## Decisions made
Leave Maker gated; restore post-repair schema latest pointer; commit status after COMPLETED.

## Decisions required (user)
Approve Maker OA (flow import / publish / Teams) when ready.

## Commit hashes
- CRM merge: `8635397`
- Prior ACTIVE status: `60d5ed3` / tip before COMPLETED docs: `4be0b61`
- This COMPLETED handoff: _pending after push_
