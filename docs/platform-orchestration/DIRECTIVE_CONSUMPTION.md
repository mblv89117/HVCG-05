# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **6** |
| BASED ON CURRENT SHA | `516553f18ac43085f704632f1b54ad94da5eed41` |
| BASED ON CURRENT RUN ID | D5 FINISHED (`followup-accepted-2026-08-20T2030Z` → `516553f`) |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **5** (current-tip TESTED_TOGETHER + pre-call-brief harness @ `516553f`) |

## Comparison vs branch state at consume time

| Orch expectation (v6) | Branch state @ `516553f` | Action |
| --- | --- | --- |
| Add booking-event.v1 harness | Schema published; step PARTIAL (not in A/B/C) | Journey A + dedicated dry-run/idempotency test + GTM adapter |
| Add experiment-spec / optimization-decision (Variant 2) | Schemas published; step PARTIAL | Journey C + mutatesPaidAds=false test + adapters |
| Keep A/B/C + nurture + pre-call-brief green | Present (30/30) | Kept; harness grew to 34/34 |
| BOOKING / OPT-V2 PARTIAL→PASS only if green + producer cite | PARTIAL | PASS; GTM `synthetic.ts` + `engine.ts` @ `14d8e4d` cited |
| Early-funnel stays PARTIAL unless new depth | PARTIAL | Left PARTIAL (no invented depth) |
| Confirm CC-001/002/003/006 | Hold on D5 tips | Reconfirmed vs current tips |
| Republish TESTED_TOGETHER vs current tips | D5 pins still current; GTM tip still `14d8e4d` | Republished YES |
| Keep SoT meaning 773b510 | Unchanged | No semantic fork |
| No Hub/OD-005/orchestrator | Satisfied | No runtime edits; no second worker |

## Stale-directive rule

D5 TESTED_TOGETHER / pre-call-brief publish is consumed and remains historical coverage. D4 nurture publish against `e0dd445`/`2f02702` is superseded for tip pins. D3 journey pack and D2 matrix refresh remain historical. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
