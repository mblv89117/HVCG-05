# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **7** |
| Based on current SHA | `d6aff599569a23b6d3501c361925a15c83e0826d` |
| Based on run ID | D6 FINISHED (`followup-accepted-2026-08-20T2045Z` → `d6aff59`) |
| Fetched at | 2026-08-20T21:15Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 6 (consumed; not repeated) |

## Binding technical directives (v7)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Remain sole publisher of canonical meaning. SoT `773b510`. Do not invent a semantic fork.
3. Open GTM `f53e628` `packages/gtm-agent/src/atlas/journey-sot.ts`. Cite file SHA. Consume landed `toBookingEventV1` / `toExperimentSpecV1` / `toOptimizationDecisionV1`. Do not keep pinning `14d8e4d`.
4. Republish `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` against current six tips (GTM **must** be `f53e628`).
5. Keep Journey A/B/C + nurture + pre-call + booking + opt-v2 green. Do not drop D6 coverage.
6. Early-funnel: add harness coverage only from existing SYN-GTM marks on `f53e628`. Do not invent product depth.
7. Confirm CC-001 / CC-002 / CC-003 / CC-006.
8. Re-run `python3 tests/integrations/run_integration_contracts.py`. Keep live adapters gated. No production deploy.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
