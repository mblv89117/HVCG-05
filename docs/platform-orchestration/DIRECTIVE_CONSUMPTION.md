# Directive Consumption Log — Train E (Platform Integration)

| Field | Value |
|-------|-------|
| Train | integration (E — Platform Integration / Contracts) |
| Product branch | `cursor/platform-integration-contracts` (`workOnCurrentBranch=true`) |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **7** |
| BASED ON CURRENT SHA | `d6aff599569a23b6d3501c361925a15c83e0826d` |
| BASED ON CURRENT RUN ID | D6 FINISHED (`followup-accepted-2026-08-20T2045Z` → `d6aff59`) |
| This worker | `bc-0e3c9a74` |
| Must not reuse | `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa` |
| Orchestrator repo | `360-growth-solution` |
| Orchestrator branch | `cursor/platform-orchestrator-b1fa` (**not pushed**) |
| Prior consumed | **6** (booking + opt-v2 harness vs then-current GTM `14d8e4d` @ `d6aff59`) |

## Comparison vs branch state at consume time

| Orch expectation (v7) | Branch state @ `d6aff59` | Action |
| --- | --- | --- |
| Pin GTM `f53e628` (D14 landed) | Matrix still pinned `14d8e4d` | Republished TESTED_TOGETHER=**YES** vs `f53e628` |
| Consume landed `journey-sot.ts` adapters | D6 used SYN-GTM marks only | Mirrored `toBookingEventV1` / `toExperimentSpecV1` / `toOptimizationDecisionV1` (file SHA `6d8d541`) |
| Keep A/B/C + nurture + pre-call + booking + opt green | 34/34 | Kept; harness grew to 36/36 |
| Early-funnel only from existing SYN-GTM marks | Grouped PARTIAL | Added schema/adapter tests for 7 marks with SoT; `icp_studio` + dry-run outbound left PARTIAL |
| Confirm CC-001/002/003/006 | Hold on D6 tips | Reconfirmed vs current tips |
| Keep SoT meaning 773b510 | Unchanged | No semantic fork |
| No Hub/OD-005/orchestrator | Satisfied | No runtime edits; no second worker |

## Stale-directive rule

D6 TESTED_TOGETHER / booking+opt publish against `14d8e4d` is consumed and superseded for the GTM tip pin. D5 pre-call-brief and D4 nurture remain historical coverage. D3 journey pack and D2 matrix refresh remain historical. Directive 1 schema publish remains satisfied since `9b46313`. Those items were not re-implemented.
