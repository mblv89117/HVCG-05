# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** `795bbe7` (directive 7 pack; based-on `d6aff59`; SoT meaning `773b510`)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **36/36 OK**  
**Orchestrator directive consumed:** **7** (based-on D6 FINISHED `d6aff59`)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **96%**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published (incl. `nurture-plan.v1`) | 100 |
| Idempotency / failure atomicity | Synthetic matrix | 95 |
| Synthetic journeys A/B/C | Booking + pre-call + Variant 2 + early-funnel SoT marks | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Hold on current tips | 95 |
| 24-step primary journey vs current tips | Weighted evidence pack | 96 |
| Live product adapters | Owner-gated | 40 |
| **CURRENT_PRODUCT_TIPS_TESTED_TOGETHER** | GTM `f53e628` + current siblings (Supervisor 2100Z + GitHub MCP) | **YES** |
| **Weighted platform contract readiness** | SoT + harness; current-tip matrix | **~92** |

Live Hub POST, paid ads, and GCC auto-provision remain gated.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **7** |
| CURRENT SHA | `795bbe7` |
| COMPLETED ACTIONS | D7 retarget GTM `f53e628`; consume `journey-sot.ts`; early-funnel SoT marks; CC confirm |
| REMAINING ACTIONS | `icp_studio` + dry-run outbound PARTIAL; SECURITY_CERTIFIED / deploy owner-gated; XSYS Hub-side |
| P0/P1/P2 | **None P0/P1 on this train.** P2: `icp_studio` + dry-run outbound PARTIAL. Hub XSYS owned by OD-005 @ `9e5d10a`. |
| TEST STATUS | **36/36 OK** |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT `773b510`; `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` vs GTM `f53e628`; live adapters gated |
| OWNER DECISIONS | OD-005 / deploy owner-gated |

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`. Journey table: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

| Train | Declared tip (directive 7) | Status |
| --- | --- | --- |
| GTM | `f53e628` | Git remote 404. GitHub MCP: `journey-sot.ts` `6d8d541` landed; flags false. |
| Revenue | `85def0e` | Fetched. Commercial SoR unchanged. CC-002 holds. |
| GCC | `8d757cf` | Unchanged. CC-003/CC-006 hold. |
| Copilot | `fe3db75` | Unchanged vs D6. Pre-call coverage kept. |
| OD-005 | `9e5d10a` | Fetched read-only. XSYS candidate FIXED_REVALIDATED (RT D23). |
| Contracts self | `795bbe7` | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** XSYS-01/02 = Hub LIVE_PRODUCTION_P0; candidate `9e5d10a` (not patched here). |
| P1 | **None.** |
| P2 | `icp_studio` and dry-run outbound remain PARTIAL (no SoT schema). |

## Owner Decisions

1. Live Hub POST / paid ads / GCC access remain owner-gated.
2. Hub HMAC / prefix-bind is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `9e5d10a`.
3. SoT matrix is YES against **current** product tips (GTM `f53e628`). `SECURITY_CERTIFIED` / `DEPLOYMENT_READY` remain owner-gated.

## Next Milestone

Keep SoT `773b510` stable. Do not deploy. Do not thaw Hub. Do not enable live GTM outbound.
