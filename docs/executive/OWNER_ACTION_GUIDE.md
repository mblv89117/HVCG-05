# Owner Action Guide — Executive Command Center

## Repo package (done on branch)

Exclusive paths under `docs/executive/`, `src/power-apps/executive/`, `src/power-bi/executive/`, `src/power-automate/executive/`, `src/sharepoint/views/executive-views.json`, `tests/executive/`, `sample-data/executive/`.

## Your actions (Dev only)

1. **Parent merge** — Apply `SHARED_FILE_RECOMMENDATIONS.md` after offline PASS (views, formulas, predeploy test append).  
2. **Power Apps** — Follow `POWER_APPS_BUILD_GUIDE.md` on `HVCG_ProjectCommandCenter_DEV`.  
3. **Power BI** — Follow `POWER_BI_CEO_COMMAND.md` (workspace audience Owner).  
4. **Seed** — Import `sample-data/executive/executive-seed.json` rows (or rely on demo-pack HVD01 flags) for queue smoke.  
5. **Flows** — Do **not** change CRM flows. Leave `HVCG_ExecutiveWeeklyBrief` Off until you approve digest copy. Existing `HVCG_ExecutiveDecisionEscalation` remains platform-owned.  
6. **Acceptance** — Fill `ACCEPTANCE_REPORT.md` after Maker smoke.

## Do not

- Production publish  
- Edit `.env` / deployment engines from this workstream  
- Enable company-wide Teams for executive digests
