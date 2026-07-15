# Executive Command Center — Test Plan

## Scope

Offline validation of module artifacts: schemas referenced by views/KPIs, JSON integrity, formula/measure presence, doc completeness. No tenant calls.

## Test suites

| Suite | Path | Mode |
|-------|------|------|
| Unit (Python) | `tests/executive/test_executive_command_center.py` | Offline |
| Module runner | `tests/executive/run_offline_tests.py` | Offline |
| Acceptance checklist | `docs/executive/SMOKE_CHECKLIST.md` | Dev Maker (owner-gated later) |

## Cases

| ID | Case | Expected |
|----|------|----------|
| ECC-01 | `executive-views.json` parses; every `list` exists in `_index.json` | Pass |
| ECC-02 | Every view field exists on list schema (skip `@today` filter tokens) | Pass |
| ECC-03 | KPI docs reference Pipeline, MRR, AR, Capital, Decisions | Pass |
| ECC-04 | Semantic model JSON facts/dimensions resolve to known lists | Pass |
| ECC-05 | `measures.dax` contains Pipeline Value, MRR, Outstanding AR, Capital Pipeline, Executive Queue Count / Executive Open Decisions | Pass |
| ECC-06 | `NamedFormulas.executive.fx` defines `nfExecMRR`, `nfExecPipelineValue`, `nfExecDecisionQueue` (aliases also in `ExecutiveNamedFormulas.fx`) | Pass |
| ECC-07 | Required docs exist (Architecture, Data Map, KPIs, Screens, PBI, Copilot, Handoff, Test Plan) | Pass |
| ECC-08 | Component + layout specs exist under `src/power-apps/executive/` | Pass |
| ECC-09 | Sample KPI fixture validates arithmetic helpers | Pass |
| ECC-10 | No CRM flow files modified on this branch vs base (optional git check) | Pass / skip |

## Exit criteria

All offline tests PASS before push. Live Maker smoke waits for owner — not part of this branch gate.

## Regression

Re-run `python3 tests/executive/run_offline_tests.py` after each milestone commit.
