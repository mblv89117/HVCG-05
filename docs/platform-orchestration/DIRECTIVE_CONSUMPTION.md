# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **4** |
| BASED ON CURRENT SHA | `d57a780d6e1b2240b7797393980bcd0429746489` |
| BASED ON CURRENT RUN ID | `run-e9674448-8c8c-4b01-b09a-edafa99bb6a9` (schema-probe; ignored) |
| PRIOR D3 RUN | `run-e3622029-2e68-49f3-b517-1208492e54d2` (consumed) |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **3** (D3 journey pack; TESTED_TOGETHER=NO superseded by D4 reconcile) |

## Comparison vs branch state at consume time

| Orch expectation (v4) | Branch state @ `d57a780` | Action |
| --- | --- | --- |
| Reconcile TESTED_TOGETHER | SoT matrix NO vs attestation YES | Set **YES** citing Supervisor V2 2013Z |
| Publish nurture-plan.v1 | Schema absent; NURTURE NOT TESTED | Published matching GTM `nurturePlanSchema` @ `e0dd445` |
| Keep SoT meaning 773b510 | Unchanged | Additive only; no semantic fork |
| Re-run harness ≥27 | Supervisor 2013Z independently 27/27 @ `d57a780` | Re-ran after nurture add |
| No Hub/OD-005/orchestrator | Satisfied | No runtime edits; no second worker |

## Stale-directive rule

D3 current-tip journey pack and D2 matrix refresh are consumed. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
