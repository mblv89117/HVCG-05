# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **5** |
| BASED ON CURRENT SHA | `8fb9af7cafe905c29f8277bfe5959d3c29d8e505` |
| BASED ON CURRENT RUN ID | `run-b871ffb0-643b-4bee-ac4e-25d48d5584c1` |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **4** (TESTED_TOGETHER vs stale GTM `e0dd445` / Copilot `2f02702`; nurture-plan.v1) |

## Comparison vs branch state at consume time

| Orch expectation (v5) | Branch state @ `8fb9af7` | Action |
| --- | --- | --- |
| Retarget matrix to current tips | D4 still pinned `e0dd445` / `2f02702` | Republished current six SHAs; TESTED_TOGETHER=**YES** |
| Add pre-call-brief harness | Schema published; step PARTIAL | Journey B + dedicated test + adapter |
| Keep nurture + A/B/C green | Present | Kept |
| Confirm CC-001/002/003/006 | Hold on D4 tips | Reconfirmed vs current tips |
| Keep SoT meaning 773b510 | Unchanged | No semantic fork |
| No Hub/OD-005/orchestrator | Satisfied | No runtime edits; no second worker |

## Stale-directive rule

D4 TESTED_TOGETHER/nurture publish against `e0dd445`/`2f02702` is consumed and superseded for tip pins. D3 journey pack and D2 matrix refresh remain historical. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
