# Next Session

**Generated:** 2026-07-14  
**Mode:** Application development (infrastructure baseline frozen)

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Infrastructure:** Development SharePoint baseline frozen at tag `v1.1.0-dev-sharepoint-baseline` (commit `f99164a`) — 1,147 fields, zero drift; do not modify deployment engines unless fixing a confirmed defect.
- **Application:** Opportunity CRM module v1 is in the repository (schema definitions, views, Power Apps specs, Power Automate flows, Copilot docs, tests, sample data). **Not yet repaired/deployed** to the live Dev tenant.

## Git

| Item | Value |
|------|--------|
| **Branch** | `cursor/v1.1.0-intelligence-ai-ops` |
| **Last commit** | `fd5a9b9973df6f1f2193693c59c45a48a3c7237f` |
| **Last commit message** | feat: implement Opportunity CRM module v1 |
| **Baseline tag** | `v1.1.0-dev-sharepoint-baseline` |

## Do not

- Modify `deployment/lib/*` or provisioning scripts unless a confirmed defect
- Rewrite the immutable release docs under `releases/v1.1.0/` for new behavior
- Run production deploy from Dev scripts

## Next recommended task

1. **Apply Opportunity CRM schema to Dev** (owner-attended, interactive auth):
   ```powershell
   pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
   ```
   Expect additive list `HVCG_OpportunityActivities` + bridge columns; confirm schema-validation `hasDrift=false`.
2. **Import the four CRM flows** in Power Automate (Maker) and set Teams channel env vars (`HVCG_TEAMS_CRM_CHANNEL_ID`, `HVCG_TEAMS_CAPITAL_CHANNEL_ID`).
3. **Build canvas screens** `scrCRM` / `scrOpportunityDetail` per `src/power-apps/BUILD_SHEET.md` and publish Dev app.
4. Optionally seed demo leads/opportunities from `sample-data/demo-pack.json` if not covered by repair seed path.

Primary module doc: `docs/crm/OPPORTUNITY_MANAGEMENT.md`
