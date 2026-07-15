# Next Session

**Generated:** 2026-07-15 (~10:07 PT)  
**Mode:** Opportunity CRM **live Dev apply in flight** — repo integration complete; do not start a second Repair

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Branch:** `cursor/v1.1.0-intelligence-ai-ops` (tracks `origin/cursor/v1.1.0-intelligence-ai-ops`)
- **HEAD tip:** `8635397` — `crm(integration): merge Opportunity CRM parallel workstreams` (verified)
- **Repo:** Six CRM workstreams merged; offline predeploy **PASS**; see `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md`
- **Infrastructure engines:** Frozen — do not modify `deployment/lib/*` / provisioning unless a confirmed defect

## Live Dev SharePoint (as of handoff)

- An owner/agent Repair is **already running** (`pwsh` Repair-HVCGOSSharePointSchema development; Cursor terminal `573342`). **Do not kill, interrupt, or start another Repair.**
- Progress observed: CRM fields/lists/lookups applied; post-list and pre-view validations reported **HasDrift=False / 1170 fields**; CRM views created; then entered **pre-seed** schema validation (slow — may look stalled).
- Earlier repair attempts had stalled around post-list validation; this run advanced past that. After the current process exits, **attest** schema (`hasDrift=false` / repair exit 0). If it dies without exit footer, owner may re-run Repair once — not now while pid alive.
- Log: `deployment/reports/checkpoints/repair-opportunity-crm-live.log`

## Maker / OA — NOT done

- Flow import / connection bind / activate — **not done**
- Canvas publish (`scrCRM` / `scrOpportunityDetail`) — **not done**
- Teams / Copilot activation — **not done**

## Do not

- Stop or kill existing Repair/Backup/seed processes
- Modify frozen deployment engines
- Run a concurrent SharePoint repair/deploy/import/publish
- Commit `.worktrees/`, `.env`, or credentials

## Next owner/agent steps (sequential)

1. **Wait** for current Dev Repair to finish (or confirm dead + no footer → then one clean re-run when owner ready).
2. **Attest schema:** repair exit 0 and `hasDrift=false` (report under `deployment/reports/schema/`).
3. **Maker OA actions** from `docs/crm/OWNER_ACTION_GUIDE.md` (OA-CRM-05…10): connections → import four CRM flows → test/activate → publish apps → fill `docs/crm/ACCEPTANCE_REPORT.md`.
4. Do not promote to Production until OA-CRM-11.

Primary module: `docs/crm/OPPORTUNITY_MANAGEMENT.md`  
Owner guide: `docs/crm/OWNER_ACTION_GUIDE.md`  
Acceptance (offline): `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md`
