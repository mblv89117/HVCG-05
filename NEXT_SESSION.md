# Next Session

**Generated:** 2026-07-15  
**Mode:** Opportunity CRM apply-in-progress (infrastructure baseline frozen; CRM packaging → owner apply)

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Infrastructure:** Development SharePoint baseline frozen at tag `v1.1.0-dev-sharepoint-baseline` (commit `f99164a`) — 1,147 fields, zero drift; do not modify deployment engines unless fixing a confirmed defect.
- **Application:** Opportunity CRM module v1 is **repo-ready** (schema migration, Power Apps specs, Power Automate packages, Copilot docs, tests, sample data). Parallel agents (migration audit, flows, apps, Teams/Copilot, QA, docs) are finishing exclusive paths — see `docs/crm/PARALLEL_AGENT_MAP.md`.
- **Live Dev tenant:** CRM additive schema **not yet applied**. Do not repair until parent designates an integration commit (or you explicitly approve applying from HEAD packages).

## Git

| Item | Value |
|------|--------|
| **Base branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Docs workstream** | `agent/crm-docs-owner` |
| **CRM feature commit** | `fd5a9b9973df6f1f2193693c59c45a48a3c7237f` |
| **Session baseline** | `4a8f25d6a84f5bc8fa0f018b98ea7cc19652dcc7` |
| **Baseline tag** | `v1.1.0-dev-sharepoint-baseline` |

## Do not

- Modify `deployment/lib/*` or provisioning scripts unless a confirmed defect
- Rewrite the immutable release docs under `releases/v1.1.0/` for new behavior
- Run production deploy from Dev scripts
- Import/activate flows, publish apps, or repair SharePoint concurrently from multiple agents
- Point Teams/Outlook notifications at non-test recipients before acceptance

## Next recommended task

### A. Integration (agents / parent) — if merge incomplete

1. Review and merge `agent/crm-*` branches per `docs/crm/PARALLEL_AGENT_MAP.md`.
2. Run full pre-deployment + CRM unit tests on the integration branch.
3. Record the integration SHA for owner apply.

### B. Owner apply (sequential) — when packages merged

Follow `docs/crm/OWNER_ACTION_GUIDE.md`:

1. **Sign-in / consent** (OA-CRM-01…02), optional backup.
2. **Apply Opportunity CRM schema to Dev**:
   ```powershell
   pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
   ```
   Expect additive list `HVCG_OpportunityActivities` + bridge columns; confirm `hasDrift=false`.
3. **Authorize connections** (SharePoint, Teams, Outlook) — OA-CRM-05.
4. **Import the four CRM flows** in Maker; bind connections; set **test** Teams channel env vars (`HVCG_TEAMS_CRM_CHANNEL_ID`, `HVCG_TEAMS_CAPITAL_CHANNEL_ID`) — OA-CRM-06…07.
5. **Test then activate** flows — OA-CRM-08.
6. **Build/publish** canvas `scrCRM` / `scrOpportunityDetail` per `src/power-apps/BUILD_SHEET.md` — OA-CRM-09.
7. **Manual lifecycle verify** + fill `docs/crm/ACCEPTANCE_REPORT.md` — OA-CRM-10.

Primary module doc: `docs/crm/OPPORTUNITY_MANAGEMENT.md`  
Owner stops: `docs/crm/OWNER_ACTION_GUIDE.md`
