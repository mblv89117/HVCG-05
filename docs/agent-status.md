# Agent Status — Atlas P2 Performance / Polish

| Field | Value |
|-------|-------|
| project | Atlas P2 Performance / Polish (Train G) |
| primary repo | `hvcg-05` |
| branch | `cursor/atlas-search-performance-p2` |
| current SHA | *(set on tip pin commit)* |
| baseline | Live Hub **`4b9631a`** (entitlement group members). Immediate rollback Hub: `ed34f2f` / `798f0dd6`. Elite still `75d0c59` (untouched). |
| owned domains | D17 Search recert on `4b9631a` (not D16 clone; not Elite) |
| files/domains touched | D17 report + status only |
| contracts required | None |
| tests | D17 live lineage + unauth 401 + auth Search n≥7 |
| build | N/A (worker verify-only; no deploy) |
| synthetic certification | D17 Search P50 recorded on live `4b9631a` |
| security status | No LIVE_SECURITY_CERTIFIED / live P0=0. No ATLAS-RT/XSYS. |
| Premium status | **ELITE_PREMIUM=NOT_RUN** |
| integration dependencies | None |
| P0 | 0 (train) — not a live P0=0 claim |
| P1 | Entitled Search still ~2.0–2.1s P50 on `4b9631a` (see D17) |
| P2 | D11–D13 honesty remain branch-only vs live Elite |
| owner decisions | Out of scope this directive |
| deployment state | Hub live `4b9631a` (V3). Worker **DID NOT DEPLOY**. Elite **NOT TOUCHED**. |

## Orchestrator control protocol

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **17** (`SEARCH_RECERT_ON_4b9631a`) |
| BASED ON PRIOR | D16 CONSUMED=16 @ `89e7f0f` (ed34f2f — now rollback; not redone) |
| ISSUER RUN | `run-a58fafe7-0ba1-402b-bd1c-afcd8f2c44b4` |
| ACK | **D17 acknowledged explicitly** (not D16 clone; not D15; no deploy) |

## D17 summary

| Item | Value |
|------|--------|
| Live Hub commit | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| Lineage match | YES |
| Unauth `/api/pm/search` + `/api/capital` | 401 |
| `AUTH_SESSION` | PRESENT (self-minted this pod) |
| Empty-result `q=hvcg` P50 | **2022 ms** (resultsCount=0, scope=entitled) |
| Entitled `q=SYN01` P50 | **2074 ms** (resultsCount=2, syn01HitCount=2) |
| `ELITE_PREMIUM` | NOT_RUN |
| deployed | NO |
| Report | `docs/ATLAS_P2_D17_SEARCH_RECERT_4b9631a_2026-08-22.md` |

## Carry-forward (not redone)

D11–D16 remain CONSUMED. D15 / Elite not executed. D16 empty-scope floor on `ed34f2f` is historical only.

## COMPLETED ACTIONS

- D17 lineage + unauth + AUTH_SESSION Search P50 (empty-result + entitled SYN01)
- Status CONSUMED=17

## REMAINING ACTIONS

1. Elite Premium / D15 only if separately issued
2. Hub/Elite deploy only if separately authorized (not this worker)

## TEST STATUS

D17 verify PASS — lineage `4b9631a`, unauth 401, AUTH_SESSION PRESENT, Search P50 empty=2022 / entitled=2074, ELITE_PREMIUM=NOT_RUN, deployed=NO.

## PREMIUM STATUS

**ELITE_PREMIUM=NOT_RUN**

## INTEGRATION STATUS

N/A.

## OWNER DECISIONS

None from this worker.

**Updated:** 2026-08-22T05:10:00Z
