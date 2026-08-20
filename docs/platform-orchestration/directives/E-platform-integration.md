# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **3** |
| Based on current SHA | `a29c873729b0539505231c8b82e33b14f3ce2d49` |
| Based on run ID | `run-4497aaf8-2256-4d77-8905-2768cf566a61` |
| Fetched at | 2026-08-20T19:50Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 2 (consumed; not repeated) |

## Binding technical directives (v3)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Do not modify Hub/Elite runtime. Do not implement XSYS HMAC (OD-005 @ `9e5d10a`).
3. Publish current-tip compatibility + 24-step journey evidence vs GTM `e0dd445`, Revenue `85def0e`, GCC `8d757cf`, Copilot `2f02702`, OD-005 `9e5d10a`, Contracts `a29c873`.
4. Confirm CC-001 / CC-002 / CC-003 / CC-006. Cite or correct supervisor 1936Z. Do not fork SoT `773b510`.
5. Re-run `python3 tests/integrations/run_integration_contracts.py` (expect 27/27). Prefer evidence over new tests.
6. Publish `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` and `CROSS_SYSTEM_JOURNEY_PERCENT` on this branch only.
7. Keep live adapters gated. No production deploy. No Hub thaw. No live GTM outbound. No paid ads.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
