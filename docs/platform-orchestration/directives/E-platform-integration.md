# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **6** |
| Based on current SHA | `516553f18ac43085f704632f1b54ad94da5eed41` |
| Based on run ID | D5 FINISHED (`followup-accepted-2026-08-20T2030Z` → `516553f`) |
| Fetched at | 2026-08-20T21:10Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 5 (consumed; not repeated) |

## Binding technical directives (v6)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Remain sole publisher of canonical meaning. SoT `773b510`. Do not invent a semantic fork.
3. Add booking-event.v1 coverage (Journey A and/or dedicated test). Idempotency `booking|{bookingId}`. Live dispatch impossible. Use GTM `14d8e4d` SYN-GTM dry-run booking as producer evidence.
4. Add experiment-spec.v1 and/or optimization-decision.v1 coverage (Journey C or dedicated test). `mutatesPaidAds` const false. Use GTM `runOptimizationCycle` Variant 2 @ `14d8e4d`.
5. Keep Journey A/B/C + nurture-plan.v1 + pre-call-brief green. Do not drop D5 coverage.
6. Update `CROSS_SYSTEM_JOURNEY_PERCENT.md`. BOOKING and OPTIMIZATION VARIANT 2 may move PARTIAL→PASS only if new tests are green AND producer evidence is cited. Early-funnel stays PARTIAL unless new executable depth exists.
7. Confirm CC-001 / CC-002 / CC-003 / CC-006. Republish `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` against then-current tips.
8. Re-run `python3 tests/integrations/run_integration_contracts.py`. Keep live adapters gated. No production deploy.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
