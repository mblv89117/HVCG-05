# Next Session

**Generated:** 2026-07-15  
**Mode:** Opportunity CRM **owner apply** (repo integration complete; infrastructure baseline frozen)

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Infrastructure:** Development SharePoint baseline frozen at tag `v1.1.0-dev-sharepoint-baseline` (commit `f99164a`) — 1,147 fields, zero drift; do not modify deployment engines unless fixing a confirmed defect.
- **Application:** Opportunity CRM module v1 is **integration-complete** on `agent/crm-integration` (all six worker streams + consolidated acceptance). See `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md` and `docs/crm/PARALLEL_AGENT_MAP.md`.
- **Live Dev tenant:** CRM additive schema **not yet applied**. Owner may repair from the integration SHA after review.

## Git

| Item | Value |
|------|--------|
| **Integration branch** | `agent/crm-integration` |
| **Feature branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Session baseline** | `4a8f25d6a84f5bc8fa0f018b98ea7cc19652dcc7` |
| **Baseline tag** | `v1.1.0-dev-sharepoint-baseline` |
| **Offline predeploy** | **PASS** (2026-07-15) |

## Do not

- Modify `deployment/lib/*` or provisioning scripts unless a confirmed defect
- Rewrite the immutable release docs under `releases/v1.1.0/` for new behavior
- Run production deploy from Dev scripts
- Import/activate flows, publish apps, or repair SharePoint concurrently from multiple agents
- Point Teams/Outlook notifications at non-test recipients before acceptance

## Next recommended task

### A. Integration — CRM workers COMPLETE; cross-module MERGES HELD

Parent merged all six `agent/crm-*` workers, resolved soft conflicts, ran full suite (**PASS**), and wrote `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md`.

Cross-module READY queue (executive + agent-comms) has **offline merge packets** only — see `docs/integration/`. **No merges until owner D-003.** Agent Comms blocked by CRM dirty MAIN segregation. Soft ownership: `docs/crm/PARALLEL_AGENT_MAP.md` only.

### B. Owner apply (sequential) — ready when you are

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
