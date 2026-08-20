# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **5** |
| Based on current SHA | `8fb9af7cafe905c29f8277bfe5959d3c29d8e505` |
| Based on run ID | `run-b871ffb0-643b-4bee-ac4e-25d48d5584c1` |
| Fetched at | 2026-08-20T20:40Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 4 (consumed; not repeated) |

## Binding technical directives (v5)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Remain sole publisher of canonical meaning. SoT `773b510` unless a real semantic fork is found. `nurture-plan.v1` stays additive.
3. Republish `CONSUMER_COMPATIBILITY.md` so `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` is YES or NO against **current** tips: GTM `14d8e4d`, Copilot `fe3db75`, Revenue `85def0e`, GCC `8d757cf`, OD-005 `9e5d10a`, Contracts `8fb9af7`.
4. Add pre-call-brief to the harness using SoT `pre-call-brief.v1` + Copilot producer evidence @ `fe3db75`. No Copilot commercial authority. Not CRM/GTM.
5. Keep Journey A/B/C green. Do not drop nurture coverage. Live dispatch impossible in fixtures.
6. Update `CROSS_SYSTEM_JOURNEY_PERCENT.md`. PRE-CALL BRIEF may move PARTIAL→PASS only if the new test is green.
7. Confirm CC-001 / CC-002 / CC-003 / CC-006.
8. Re-run `python3 tests/integrations/run_integration_contracts.py`. Keep live adapters gated. No production deploy.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
