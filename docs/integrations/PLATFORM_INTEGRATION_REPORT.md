# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** `189281a` (directive 4 pack; based-on `d57a780`; SoT meaning `773b510`)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **28/28 OK**  
**Orchestrator directive consumed:** **4** (schema-probe run `run-e9674448` ignored; prior D3 `run-e3622029` consumed)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **75%**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published (incl. `nurture-plan.v1`) | 100 |
| Idempotency / failure atomicity | Synthetic matrix | 95 |
| Synthetic journeys A/B/C | Harness 28/28 (Journey A includes nurture) | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Hold on current tips | 95 |
| 24-step primary journey vs current tips | Weighted evidence pack | 75 |
| Live product adapters | Owner-gated | 40 |
| **CURRENT_PRODUCT_TIPS_TESTED_TOGETHER** | Supervisor V2 2013Z + this-worker fetchable tips | **YES** |
| **Weighted platform contract readiness** | SoT + harness; matrix/attestation reconciled | **~86** |

Live Hub POST, paid ads, and GCC auto-provision remain gated.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **4** |
| CURRENT SHA | `189281a` |
| COMPLETED ACTIONS | D4 reconcile TESTED_TOGETHER=YES; published `nurture-plan.v1`; NURTURE PASS; harness 28/28 |
| REMAINING ACTIONS | SECURITY_CERTIFIED / deploy owner-gated; XSYS Hub-side |
| P0/P1/P2 | **None on this train.** Hub XSYS-01/02 owned by OD-005 @ `9e5d10a`. Nurture P2 closed. |
| TEST STATUS | **28/28 OK** |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT `773b510`; `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES`; live adapters gated |
| OWNER DECISIONS | OD-005 / deploy owner-gated |

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`. Journey table: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

| Train | Declared tip (directive 4) | Status |
| --- | --- | --- |
| GTM | `e0dd445` | Git remote 404 here. Supervisor V2 2013Z + GitHub MCP opened `nurturePlanSchema` / `liveDispatch` false. |
| Revenue | `85def0e` | Fetched. SoT `773b510` (schema diff empty). CC-001/002/003 hold. |
| GCC | `8d757cf` | Fetched. CC-003/CC-006 hold. Schema byte-identical. |
| Copilot | `2f02702` | Git remote 404 here. Supervisor V2 2013Z + RT D26 jose/`/api/assessments` 401 cited. |
| OD-005 | `9e5d10a` | Fetched read-only. XSYS candidate FIXED_REVALIDATED (RT D23). |
| Contracts self | `189281a` | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** XSYS-01/02 = Hub LIVE_PRODUCTION_P0; candidate `9e5d10a` (not patched here). |
| P1 | **None.** |
| P2 | **None.** Nurture contract published this directive. |

## Owner Decisions

1. Live Hub POST / paid ads / GCC access remain owner-gated.
2. Hub HMAC / prefix-bind is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `9e5d10a`.
3. SoT matrix now agrees with D3 attestation (`TESTED_TOGETHER=YES`). `SECURITY_CERTIFIED` / `DEPLOYMENT_READY` remain owner-gated.

## Next Milestone

Keep SoT `773b510` stable. Do not deploy. Do not thaw Hub. Do not enable live GTM outbound.
