# Train E Directive Snapshot (consumed)

This file is a **local consumption snapshot** of the Platform Orchestrator directive for Train E / integration.
Authoritative remote control plane: `360-growth-solution` / `cursor/platform-orchestrator-b1fa` (**not modified from this worker**).

| Field | Value |
|-------|-------|
| Directive Version | **8** |
| Based on current SHA | `f2e27a0973592cf324704047edcca2e878ce59ec` |
| Based on run ID | D7 FINISHED (`followup-accepted-2026-08-20T2100Z` → `795bbe7` / pin `f2e27a0`) |
| Fetched at | 2026-08-20T21:30Z |
| Expected branch | `cursor/platform-integration-contracts` |
| workOnCurrentBranch | true |
| Prior version | 7 (consumed; not repeated) |

## Binding technical directives (v8)

1. Stay on `cursor/platform-integration-contracts`. Do not create a second Integration train. Do not push orchestrator control-plane. Do not wake other workers.
2. Remain sole publisher of canonical meaning. SoT lineage `773b510`. Product adapters allowed. Semantic forks forbidden.
3. Publish exactly two new SoT schemas from existing GTM `f53e628` fields: `icp-studio.v1` and `outbound-dispatch.v1`. Do not invent product depth. Do not enable live outbound.
4. Register both. Add harness + adapter tests consuming SYN-GTM marks. Keep observationOnly / no liveDispatch.
5. Keep Journey A/B/C + nurture + pre-call + booking + opt-v2 + D7 early-funnel green.
6. Flip `icp_studio` and dry-run outbound to PASS only if schemas + tests land.
7. Confirm CC-001 / CC-002 / CC-003 / CC-006. Keep `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` vs current six tips.
8. Re-run `python3 tests/integrations/run_integration_contracts.py`. No production deploy.

See `../DIRECTIVE_CONSUMPTION.md`, `../../integrations/CONSUMER_COMPATIBILITY.md`, `../../integrations/CROSS_SYSTEM_JOURNEY_PERCENT.md`, and `../../agent-status.md`.
