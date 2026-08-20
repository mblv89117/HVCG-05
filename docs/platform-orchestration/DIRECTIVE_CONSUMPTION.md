# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **8** |
| BASED ON CURRENT SHA | `f2e27a0973592cf324704047edcca2e878ce59ec` |
| BASED ON CURRENT RUN ID | D7 FINISHED (`followup-accepted-2026-08-20T2100Z` → `795bbe7` / pin `f2e27a0`) |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **7** (TESTED_TOGETHER vs GTM `f53e628`; early-funnel SoT marks; icp/outbound left PARTIAL) |

## Comparison vs branch state at consume time

| Orch expectation (v8) | Branch state @ `f2e27a0` | Action |
| --- | --- | --- |
| Publish `icp-studio.v1` from existing IcpModel | No schema; step PARTIAL | Published from `icp/model.ts` + `studio.ts` @ `f53e628` |
| Publish `outbound-dispatch.v1` fail-closed | No schema; step PARTIAL | Published; `dispatched` const false; no live-send shape |
| Register + harness + adapters | D7 36/36 | Registry + Journey A + dedicated tests; 40/40 |
| Flip PARTIAL→PASS if green | 22 PASS / 2 PARTIAL | Both PASS; journey 100% |
| Keep D7 coverage | Present | Kept |
| Confirm CC-001/002/003/006 | Hold | Reconfirmed |
| Keep TESTED_TOGETHER vs current six tips | YES @ `f53e628` | Kept YES |
| SoT lineage 773b510 | Unchanged | Additive only; no semantic fork |
| No Hub/OD-005/orchestrator | Satisfied | No runtime edits; no second worker |

## Stale-directive rule

D7 TESTED_TOGETHER / early-funnel publish is consumed and remains historical coverage. D6 booking/opt vs `14d8e4d` is superseded for the GTM tip pin. D5 pre-call-brief and D4 nurture remain historical. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
