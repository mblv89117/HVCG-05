# Executive Command Center — Implementation Plan

**Module version:** 1.0.0  
**Branch:** `cursor/executive-command-center`  
**Approach:** Option A — isolated package; shared merges via recommendation only

## Milestones

| # | Milestone | Deliverables | Validation |
|---|-----------|--------------|------------|
| M1 | Architecture lock | `ARCHITECTURE.md`, `SHARED_FILE_RECOMMENDATIONS.md`, this plan, `KPI_CATALOG.md` | Doc presence test |
| M2 | Data surfaces | `executive-views.json`, permissions model, seed | View field ↔ schema tests |
| M3 | App + BI | `scrHomeExec` spec, NamedFormulas.executive.fx, PBI model + DAX | Formula/KPI token tests |
| M4 | Automation contract | Flow integration doc + executive brief scaffold (Off) | No CRM flow diffs |
| M5 | QA + handoff | Offline tests, smoke checklist, acceptance, `NEXT_SESSION.md`, HANDOFF | `test_executive_command_center.py` PASS |

## Work breakdown

1. Catalog executive KPIs mapped to existing lists (no new SOR).
2. Define SharePoint views filtered to exec-attention / finance / capital slices.
3. Spec `scrHomeExec` regions + role gates (`nfIsExecutive`, `nfIsFinanceViewer`).
4. Spec Power BI app `HVCG_CEO_Command` pages and measures.
5. Document escalation flow contract (reuse `HVCG_ExecutiveDecisionEscalation`).
6. Seed synthetic executive-attention rows for Dev smoke.
7. Offline Python packaging tests; handoff for parent merge.

## Out of scope (this branch)

- Tenant deploy / Maker publish  
- Production  
- Modifying CRM flows or solution zip under active Maker OA  
- Deployment engine changes  

## Exit criteria

- All exclusive paths committed and pushed on `cursor/executive-command-center`
- Offline test PASS
- Parent has clear SHARED_FILE_RECOMMENDATIONS
- Owner action guide lists Dev-only Maker/BI steps
