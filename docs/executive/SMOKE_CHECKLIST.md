# Executive Command Center — Dev smoke checklist (owner-gated)

**Environment:** Development only  
**Prerequisite:** Lists provisioned; canvas app published with exec formulas  

Do **not** run against Production from this module.

| # | Step | Pass criteria |
|---|------|---------------|
| 1 | Sign in as Owner | Lands on scrHomeExec |
| 2 | KPI strip | Pipeline / MRR / AR / Capital tiles show numbers or em dash — no script errors |
| 3 | Decision queue | Seeded RequiresExecutiveAttention decision visible |
| 4 | Past-due retainer | If sample past-due exists, tile > 0 |
| 5 | Navigate Capital tile | Opens scrCapital |
| 6 | Phone width | My work appears above capital |
| 7 | Non-owner user | Redirects to Ops home |
| 8 | Copilot P1 (optional) | Brief cites list fields only |

Evidence: screenshot + note in `deployment/reports/executive/` when owner runs live smoke.
