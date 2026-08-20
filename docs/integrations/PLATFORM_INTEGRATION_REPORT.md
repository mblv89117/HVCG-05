# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** this D6 pack (based-on `516553f`; SoT meaning `773b510`)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **34/34 OK**  
**Orchestrator directive consumed:** **6** (based-on D5 FINISHED `516553f`)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **81%**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published (incl. `nurture-plan.v1`) | 100 |
| Idempotency / failure atomicity | Synthetic matrix | 95 |
| Synthetic journeys A/B/C | Journey A booking + Journey B pre-call-brief + Journey C Variant 2 | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Hold on current tips | 95 |
| 24-step primary journey vs current tips | Weighted evidence pack | 81 |
| Live product adapters | Owner-gated | 40 |
| **CURRENT_PRODUCT_TIPS_TESTED_TOGETHER** | Current six SHAs (Supervisor 2045Z + GitHub MCP) | **YES** |
| **Weighted platform contract readiness** | SoT + harness; current-tip matrix | **~89** |

Live Hub POST, paid ads, and GCC auto-provision remain gated.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **6** |
| CURRENT SHA | this D6 pack |
| COMPLETED ACTIONS | D6 booking + optimization-variant-2 harness; BOOKING/OPT-V2 PASS; CC confirm; TESTED_TOGETHER vs current tips |
| REMAINING ACTIONS | Early-funnel PARTIAL; SECURITY_CERTIFIED / deploy owner-gated; XSYS Hub-side |
| P0/P1/P2 | **None P0/P1 on this train.** P2: early-funnel PARTIAL. Hub XSYS owned by OD-005 @ `9e5d10a`. |
| TEST STATUS | **34/34 OK** |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT `773b510`; `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` vs current six SHAs; live adapters gated |
| OWNER DECISIONS | OD-005 / deploy owner-gated |

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`. Journey table: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

| Train | Declared tip (directive 6) | Status |
| --- | --- | --- |
| GTM | `14d8e4d` | Git remote 404. GitHub MCP: tip still `14d8e4d`; SYN-GTM dry-run booking + Variant 2 rollback opened. |
| Revenue | `85def0e` | Fetched. Commercial SoR unchanged. CC-002 holds. |
| GCC | `8d757cf` | Unchanged. CC-003/CC-006 hold. |
| Copilot | `fe3db75` | Git remote 404. D5 pre-call coverage kept. RT D27 SECURITY_CERTIFIED=PASS (not this retest). |
| OD-005 | `9e5d10a` | Fetched read-only. XSYS candidate FIXED_REVALIDATED (RT D23). |
| Contracts self | this D6 pack | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** XSYS-01/02 = Hub LIVE_PRODUCTION_P0; candidate `9e5d10a` (not patched here). |
| P1 | **None.** |
| P2 | Early-funnel remains PARTIAL. |

## Owner Decisions

1. Live Hub POST / paid ads / GCC access remain owner-gated.
2. Hub HMAC / prefix-bind is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `9e5d10a`.
3. SoT matrix is YES against **current** product tips. `SECURITY_CERTIFIED` / `DEPLOYMENT_READY` remain owner-gated.

## Next Milestone

Keep SoT `773b510` stable. Do not deploy. Do not thaw Hub. Do not enable live GTM outbound.
