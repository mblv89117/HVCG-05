# PROJECT HANDOFF — HVCG OS (resume without chat history)

## Purpose
HVCG OS v1.1.0 Opportunity CRM on Development: schema repair done earlier; Maker OA was **approved** and attempted. Live flow/app import is **blocked** until interactive Power Platform auth completes. No Production.

## Architecture (brief)
SharePoint lists (PnP) + Power Apps/Automate (Maker) + deployment modules under `deployment/`. CRM flow packages under `src/power-automate/` are **scaffolds** (build sheets + Logic definitions), not managed solution zips.

## Repo / branch
- Remote: `https://github.com/mblv89117/HVCG-05.git`
- Branch: `cursor/v1.1.0-intelligence-ai-ops`
- CRM merge: `8635397`
- Workspace: `/Volumes/MacMiniPro2TB/HVCG Project Management System`

## Environment
- **development** only
- Site: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Power Platform: display name **HVCG Development** (`environmentId` still OPTIONAL until `pac org list`)
- Production: forbidden until OA-CRM-11 + approval

## Auth approach
- PnP: Entra ClientId + Interactive (used successfully during repair)
- Maker/`pac`: **device-code** — profile `HVCG-Dev-Maker` pending; log `deployment/reports/checkpoints/pac-auth-dev-maker.log`
- PATH: `export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"`

## Completed components
- Live Dev CRM SharePoint repair (hasDrift=false / 1170 fields)
- Offline predeploy + CRM acceptance/unit/lifecycle/smoke **PASS** (Maker OA session)
- `.NET 10` + `pac` 2.9.3 installed
- CRM environment variable packaging (Teams notify **false**, Dev site URL defaults)
- Live acceptance template filled as **PARTIAL**: `docs/crm/ACCEPTANCE_REPORT.md`

## Repair / build phase
- SharePoint repair: **COMPLETED** (do not re-run unless new drift)
- Maker import: **NOT COMPLETED** — auth blocker

## Deploy state
- SharePoint Dev schema aligned
- Power Platform: packages ready / **0 flows imported live** / **canvas not published**
- Teams notify: **gated Off**
- No Production

## Last checkpoint
Maker OA attempt stopped at `pac auth create --deviceCode`. Browser opened to device login page for owner; agent must not paste secrets. Offline suites green. Env var package updated for CRM flags.

## Exact next steps
1. Owner completes device login (or re-issues code if expired).
2. Select Dev environment only; create/bind SharePoint (+ optional Outlook) connections; **do not** enable Teams notify.
3. Rebuild four CRM flows from guides; leave **Off** until dry-run.
4. Build `scrCRM` / `scrOpportunityDetail` in Maker; publish Dev only.
5. Run live smoke checklist; update acceptance; commit/push.

## Known issues
- `Microsoft.PowerApps.CLI.Tool` requires **.NET 10** (not 8).
- LeadQualified definition includes Compose **placeholders** — full Maker rebuild.
- No `.msapp` export in repo — canvas cannot be CLI-imported.
- Predeploy schema unit test overwrites `schema-validation-latest.json` — restore from `schema-validation-20260715-103353.json`.

## Failed approaches
- Auto-enter device code into browser login prompt (blocked by credential policy — owner must enter).
- Direct solution import of CRM flows — workflows not packed in solution; scaffolds incomplete for silent import.

## Dependencies / tools
pwsh 7.x, PnP.PowerShell, Microsoft.Graph, python3, **pac 2.9.3**, **.NET 10.0.302** (`~/.dotnet`)

## Permissions
Git push of docs/packages OK. Live Maker/Pac mutations need completed interactive auth. Production still requires OA-CRM-11.

## Important commands
```powershell
export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"
pac auth create --deviceCode --name HVCG-Dev-Maker
pac org list
pac org select --environment <HVCG_DEVELOPMENT_URL_OR_ID>

# Offline verify (safe)
pwsh -NoProfile -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
pwsh -NoProfile -File ./scripts/Test-HVCGOpportunityCrmAcceptance.ps1 -Offline
```

## Testing / deploy / rollback
- Tests: offline PASS this Maker OA session
- Deploy: Maker per OWNER_ACTION_GUIDE after auth
- Rollback reference: `backups/development/20260715-092137`

## Recent files
`docs/crm/ACCEPTANCE_REPORT.md`, `deployment/reports/crm/maker-oa-acceptance-latest.json`, `src/power-platform/environment-variables/HVCG_EnvironmentVariables.json`, CRM `EnvironmentVariableDefinitions/*`, `PROJECT_STATUS.md`, `NEXT_SESSION.md`, `PROJECT_HANDOFF.md`, `deployment/reports/AGENT_ACTIVITY.log`, pac auth checkpoint log

## Do not
- Touch Production
- Enable Teams CRM notify by default
- Commit secrets / `.worktrees/`
- Start second SharePoint repair without confirmed drift
