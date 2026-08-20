# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **2** |
| Based on current SHA | `773b5101032ccd5218d5563d2177c31722ecf575` |
| Based on run ID | `none-on-this-worker` (replacement; prior `bc-af57d6b6` / `run-8c5dc9cf` not reused) |
| Fetched at | 2026-08-20T14:55Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |

## Binding technical directives (v2)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane.
2. Do not modify Hub/Elite runtime. Do not implement XSYS HMAC here (OD-005 candidate `0bbfd87`).
3. Refresh consumer compatibility vs GTM `e0dd445`, Revenue `e9b3be8`, GCC `41a59b8`, Copilot `19a200e8`, Contracts `773b510`.
4. Re-run `python3 tests/integrations/run_integration_contracts.py` (expect 27/27).
5. Confirm CC-001 / CC-002 / CC-003 / CC-006. Do not fork semantics.
6. Publish compatibility + `docs/agent-status.md` on this branch only.
7. Keep live adapters gated. No production deploy. No Hub thaw.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, and `../../agent-status.md`.
