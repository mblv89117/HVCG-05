# Agent Status — Atlas P2 Performance / Polish

| Field | Value |
|-------|-------|
| project | Atlas P2 Performance / Polish (Train G) |
| primary repo | `hvcg-05` |
| branch | `cursor/atlas-search-performance-p2` |
| current SHA | *(set on tip pin commit)* |
| baseline | Live Hub **`070e093`** (entitled hot-path). Immediate rollback: `4b9631a` / `7e3f65a2…`. Elite still `75d0c59` (untouched). |
| owned domains | D18 Search recert on `070e093` (not D17 clone; not Elite) |
| files/domains touched | D18 report + status only |
| contracts required | None |
| tests | D18 live lineage + unauth + entitled Search n=7×2 |
| build | N/A (worker verify-only; no deploy) |
| synthetic certification | D18 entitled Search P50 on live `070e093` |
| security status | No LIVE_SECURITY_CERTIFIED / live P0=0. No ATLAS-RT/XSYS. |
| Premium status | **ELITE_PREMIUM=NOT_RUN** |
| integration dependencies | None |
| P0 | 0 (train) — not a live P0=0 claim |
| P1 | Entitled Search ~635–637 ms P50 on `070e093` (see D18) |
| P2 | D11–D13 honesty remain branch-only vs live Elite |
| owner decisions | OD-005 redeploy not performed |
| deployment state | Hub live `070e093` (V3). Worker **DID NOT DEPLOY**. Elite **NOT TOUCHED**. |

## Orchestrator control protocol

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **18** (`SEARCH_RECERT_ON_070e093`) |
| BASED ON PRIOR | D17 CONSUMED=17 @ `844ca25` (4b9631a — now rollback; not redone) |
| ISSUER RUN | `run-14f763b1-1383-4e3e-a313-d1afdec59529` |
| ACK | **D18 acknowledged explicitly** (not D17 clone; not D15; no deploy) |

## D18 summary

| Item | Value |
|------|--------|
| Live Hub commit | `070e0936914b0e87c908e06a95b743f6f1daa9aa` |
| OneDeploy (orch) | `ea24ba13-c5a8-4524-8feb-33ff282d593d` |
| Lineage match | YES |
| Unauth | root 405; `/api/pm/search` + `/api/capital` 401; `/api/search` 405 |
| `AUTH_SESSION` | PRESENT (self-minted) |
| `q=SYN01` P50 | **637 ms** (hits 1–2; scope=entitled; clientCodes=SYN01; foreignLeak=false) |
| `q=hvcg` P50 | **635 ms** (hits=0; scope=entitled; foreignLeak=false) |
| `ELITE_PREMIUM` | NOT_RUN |
| deployed | NO |
| Report | `docs/ATLAS_P2_D18_SEARCH_RECERT_070e093_2026-08-22.md` |

## Carry-forward (not redone)

D11–D17 remain CONSUMED. D15 / Elite not executed. D17 on `4b9631a` is historical only.

## COMPLETED ACTIONS

- D18 lineage + unauth + entitled Search P50 (SYN01 + hvcg)
- Status CONSUMED=18

## REMAINING ACTIONS

1. Elite Premium / D15 only if separately issued
2. Hub/Elite deploy only if separately authorized

## TEST STATUS

D18 verify PASS — lineage `070e093`, unauth fail-closed, AUTH_SESSION PRESENT, SYN01 P50=637 / hvcg P50=635, foreignLeak=false, ELITE_PREMIUM=NOT_RUN, deployed=NO.

## PREMIUM STATUS

**ELITE_PREMIUM=NOT_RUN**

## INTEGRATION STATUS

N/A.

## OWNER DECISIONS

None from this worker.

**Updated:** 2026-08-22T05:40:00Z
