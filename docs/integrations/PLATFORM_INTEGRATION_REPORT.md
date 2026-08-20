# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**SHA:** `773b510` (contracts base `9b46313`; directive 2 refresh)  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59` — **not thawed**  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **27/27 OK**  
**Orchestrator directive consumed:** **2** (replacement worker `bc-0e3c9a74`; did not reuse `bc-af57d6b6`)

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | Published + GTM sync / GCC feedback ratified | 100 |
| Idempotency registry | Expanded to all critical edges | 100 |
| Failure atomicity tests | Synthetic matrix covered | 95 |
| Identity / auth model | Documented; least privilege | 100 |
| Synthetic journeys A/B/C | Machine-verifiable harness | 100 |
| CC-001 / CC-002 / CC-003 / CC-006 | Confirmed on SoT; consumer matrix refreshed | 95 |
| Security contract tests | Spoof/replay/injection/schema confusion | 95 |
| Live product adapters | Owner-gated / staging (unchanged) | 40 |
| **Weighted platform contract readiness** | Contracts + harness + orch checkpoint | **~86** |

Live Hub POST for 360/Copilot and GCC auto-provision remain intentionally gated.

## Orchestrator protocol

| Field | Value |
| --- | --- |
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **2** |
| CURRENT SHA | `773b510` |
| COMPLETED ACTIONS | Directive 2 consume; consumer matrix vs five tips; harness 27/27; CC-001/002/003/006 confirm; XSYS-01/02 Hub-side docs |
| REMAINING ACTIONS | GTM/Copilot source fetch when remotes authorized; OD-005 RT + owner; DEPLOYMENT_READY owner-gated |
| P0/P1/P2 | P0/P1/P2 **none on this train**. Hub XSYS-01/02 owned by OD-005 @ `0bbfd87` |
| TEST STATUS | 27/27 OK |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT + compatibility matrix @ declared tips; live adapters gated |
| OWNER DECISIONS | OD-003 pending; OD-005 / deploy owner-gated |

## Canonical IDs / Attribution / Schemas / Idempotency / Failure / Identity

Unchanged from first-run publish; see `docs/integrations/*`. Additive this checkpoint: `360-atlas-gtm-sync.v1`, `gcc-gtm-feedback.v1`, peer `gcc-atlas-signal`, adapter docs, Copilot alias policy.

## Compatibility

Full matrix: `CONSUMER_COMPATIBILITY.md`.

| Train | Declared tip (directive 2) | Status |
| --- | --- | --- |
| GTM | `e0dd445` | SHA recorded; sibling remote 404 on this worker. SoT CC-001 unchanged. Last RT source probe `7b704111` held camelCase + `liveDispatch:false`. |
| Revenue | `e9b3be8` | Fetched. Consumes SoT `773b510`. CC-001/002/003 adapters present. Commercial authority = Revenue. |
| GCC | `41a59b8` | Fetched (equals remote branch tip). CC-003/CC-006 hold. `gcc-value-signal.v1.json` byte-identical. |
| Copilot | `19a200e8` | SHA recorded; sibling remote 404. SoT CC-001/002 unchanged. RT D12 inspected this SHA for RT-02 only. |
| Contracts self | `773b510` | Sole publisher of canonical meaning |

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | **None on this train.** Keep liveDispatch/paidAds/autoProvision false. XSYS-01/02 = Hub LIVE_PRODUCTION_P0 on OD-005 @ `0bbfd87` (not patched here). |
| P1 | **None on this train.** Product-side COP-INT-005 remains a Copilot obligation until source-confirmed. |
| P2 | **None on this train.** |

## Owner Decisions

1. **OD-003** — Confirm Integration tip as SoT (pending owner; consumers already pin `773b510`).
2. Live Hub POST / paid ads / GCC access remain owner-gated.
3. Hub HMAC / prefix-bind (XSYS-01/02) is **not** executed on this contracts branch. Candidate: `cursor/atlas-security-patch-od005` @ `0bbfd87`.

## Next Milestone

Keep SoT stable. Re-inspect GTM/Copilot source when remotes are authorized. Do not deploy.
