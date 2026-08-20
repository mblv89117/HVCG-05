# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** `a29c873` (directive 3 based-on; SoT meaning `773b510`)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **27/27 OK**  
**Orchestrator directive consumed:** **3** (run `run-4497aaf8-2256-4d77-8905-2768cf566a61`)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **NO**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **71%**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published | 100 |
| Idempotency / failure atomicity | Synthetic matrix | 95 |
| Synthetic journeys A/B/C | Harness 27/27 | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Hold on current fetchable tips | 95 |
| 24-step primary journey vs current tips | Weighted evidence pack | 71 |
| Live product adapters | Owner-gated | 40 |
| **CURRENT_PRODUCT_TIPS_TESTED_TOGETHER** | GTM+Copilot remotes 404 | **NO** |
| **Weighted platform contract readiness** | SoT + harness; joint tip test open | **~82** |

Live Hub POST, paid ads, and GCC auto-provision remain gated.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **3** |
| CURRENT SHA | `a29c873` |
| COMPLETED ACTIONS | D3 current-tip pack; 24-step journey table; CC confirm; harness 27/27; XSYS docs → `9e5d10a` |
| REMAINING ACTIONS | GTM/Copilot source when authorized; INTEGRATION_CERTIFIED open; deploy owner-gated |
| P0/P1/P2 | **None on this train.** Hub XSYS-01/02 owned by OD-005 @ `9e5d10a` |
| TEST STATUS | 27/27 OK |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT `773b510`; `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=NO`; live adapters gated |
| OWNER DECISIONS | OD-005 / deploy owner-gated |

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`. Journey table: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

| Train | Declared tip (directive 3) | Status |
| --- | --- | --- |
| GTM | `e0dd445` | 404 here. Supervisor 1936Z cited (`liveDispatch`/paid ads false, kill switch true). |
| Revenue | `85def0e` | Fetched. SoT `773b510` (schema diff empty). CC-001/002/003 hold. |
| GCC | `8d757cf` | Fetched. CC-003/CC-006 hold. Schema byte-identical. |
| Copilot | `2f02702` | 404 here. Supervisor 1936Z + RT D26 jose/`/api/assessments` 401 cited. |
| OD-005 | `9e5d10a` | Fetched read-only. XSYS candidate FIXED_REVALIDATED (RT D23). |
| Contracts self | `a29c873` | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** XSYS-01/02 = Hub LIVE_PRODUCTION_P0; candidate `9e5d10a` (not patched here). |
| P1 | **None.** |
| P2 | **None.** |

## Owner Decisions

1. Live Hub POST / paid ads / GCC access remain owner-gated.
2. Hub HMAC / prefix-bind is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `9e5d10a`.
3. `INTEGRATION_CERTIFIED` waits on jointly authorized GTM+Copilot source (or a multi-repo environment).

## Next Milestone

Keep SoT `773b510` stable. Do not deploy. Re-open GTM/Copilot trees when remotes are authorized.
