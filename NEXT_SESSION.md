# Next Session

**Generated:** 2026-07-15 (~10:11 PT)  
**Mode:** Opportunity CRM **live Dev apply in flight** — repo integration complete; do not start a second Repair

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Branch:** `cursor/v1.1.0-intelligence-ai-ops` (tracks `origin/cursor/v1.1.0-intelligence-ai-ops`)
- **HEAD tip:** `8635397` — `crm(integration): merge Opportunity CRM parallel workstreams` (verified)
- **Repo:** Six CRM workstreams merged; offline predeploy **PASS**; see `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md`
- **Infrastructure engines:** Frozen — do not modify `deployment/lib/*` / provisioning unless a confirmed defect

## Live Dev SharePoint (as of handoff)

- **ACTIVE** health check 10:11 PT: `pwsh` pid **12090** (parent shell 12084), Cursor terminal **573342**. Do not kill, interrupt, or start another Repair.
- Last STEP (10:05:56): **Seeding Development sample data** → **Validating SharePoint schema vs repo (pre-seed)** + Connect-PnPOnline to HVCG-CommandCenter-Dev. Silent gaps of ~13 min between SUCCESS lines are normal for full schema validation (post-list 09:38→09:51; pre-views 09:51→10:05 both OK, HasDrift=False / 1170 fields).
- Prior progress this run: CRM fields/lists/lookups; views created (Open/Qualified Leads, Commit Forecast, Capital Handoffs Ready, Recent Activities).
- Log: `deployment/reports/checkpoints/repair-opportunity-crm-live.log`
- After process exits: attest exit 0 + `hasDrift=false`. If dead without `REPAIR_EXIT` footer, one clean re-run only when pid confirmed gone.

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
