# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **4** |
| Based on current SHA | `d57a780d6e1b2240b7797393980bcd0429746489` |
| Based on run ID | `run-e9674448-8c8c-4b01-b09a-edafa99bb6a9` (schema-probe; ignored) |
| Prior D3 run | `run-e3622029-2e68-49f3-b517-1208492e54d2` |
| Fetched at | 2026-08-20T20:30Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 3 (consumed; not repeated) |

## Binding technical directives (v4)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Reconcile `CONSUMER_COMPATIBILITY.md` + `CROSS_SYSTEM_JOURNEY_PERCENT.md` so `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` using Supervisor V2 2013Z GTM+Copilot evidence.
3. Publish `nurture-plan.v1.json` matching GTM `nurturePlanSchema` @ `e0dd445` (`goal=prepare_lead_before_manny_call`; observation-only; no live send). Register + cheap harness fixture.
4. Keep SoT meaning `773b510`. No Hub/Elite runtime edits. No OD-005 merge.
5. Re-run `python3 tests/integrations/run_integration_contracts.py` (keep ≥27).
6. Keep live adapters gated. No production deploy. No Hub thaw. No live GTM outbound. No paid ads.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
