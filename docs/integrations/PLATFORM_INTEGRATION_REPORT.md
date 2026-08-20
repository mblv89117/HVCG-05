# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** `778defd` (directive 8 pack; based-on `f2e27a0`; SoT lineage `773b510`)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **40/40 OK**  
**Orchestrator directive consumed:** **8** (based-on D7 FINISHED `f2e27a0`)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **100%**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published (incl. `icp-studio.v1` + `outbound-dispatch.v1`) | 100 |
| Idempotency / failure atomicity | Synthetic matrix | 95 |
| Synthetic journeys A/B/C | ICP + dry-run outbound + booking + pre-call + Variant 2 | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Hold on current tips | 95 |
| 24-step primary journey vs current tips | Weighted evidence pack | 100 |
| Live product adapters | Owner-gated | 40 |
| **CURRENT_PRODUCT_TIPS_TESTED_TOGETHER** | GTM `f53e628` + current siblings | **YES** |
| **Weighted platform contract readiness** | SoT + harness; current-tip matrix | **~93** |

Live Hub POST, paid ads, and GCC auto-provision remain gated. `outbound-dispatch.v1` does not authorize live send.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **8** |
| CURRENT SHA | `778defd` |
| COMPLETED ACTIONS | D8 publish icp-studio.v1 + outbound-dispatch.v1; flip last two PARTIAL steps; 40/40 |
| REMAINING ACTIONS | SECURITY_CERTIFIED / deploy owner-gated; XSYS Hub-side |
| P0/P1/P2 | **None P0/P1/P2 on this train.** Hub XSYS owned by OD-005 @ `9e5d10a`. |
| TEST STATUS | **40/40 OK** |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT lineage `773b510`; `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` vs GTM `f53e628`; live adapters gated |
| OWNER DECISIONS | OD-005 / deploy owner-gated |

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`. Journey table: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

| Train | Declared tip (directive 8) | Status |
| --- | --- | --- |
| GTM | `f53e628` | Git remote 404. GitHub MCP: ICP + outbound engines opened. RT D28 SECURITY_CERTIFIED=PASS (independent). |
| Revenue | `85def0e` | Fetched. CC-002 holds. |
| GCC | `8d757cf` | Unchanged. CC-003/CC-006 hold. |
| Copilot | `fe3db75` | Unchanged vs D7. |
| OD-005 | `9e5d10a` | Fetched read-only. |
| Contracts self | `778defd` | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** XSYS-01/02 = Hub LIVE_PRODUCTION_P0; candidate `9e5d10a` (not patched here). |
| P1 | **None.** |
| P2 | **None on this train.** |

## Owner Decisions

1. Live Hub POST / paid ads / GCC access remain owner-gated.
2. Hub HMAC / prefix-bind is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `9e5d10a`.
3. SoT matrix is YES against **current** product tips. `SECURITY_CERTIFIED` / `DEPLOYMENT_READY` remain owner-gated.

## Next Milestone

Keep SoT lineage `773b510` stable. Do not deploy. Do not thaw Hub. Do not enable live GTM outbound.
