# Agent Status — Atlas P2 Performance / Polish

| Field | Value |
|-------|-------|
| project | Atlas P2 Performance / Polish (Train G) |
| primary repo | `hvcg-05` |
| branch | `cursor/atlas-search-performance-p2` |
| current SHA | *(set on tip pin commit)* |
| baseline | Hub `940a484` + Elite `75d0c59` via freeze tip `2a5a605` |
| owned domains | Search performance; operator honesty (D11–D13 consumed); D14 auth search P50 |
| files/domains touched | D14 report + status only this checkpoint (no D11–D13 redo) |
| contracts required | None |
| tests | Prior Hub 325/325; D14 is live timing cert (not unit suite) |
| build | Prior Elite build PASS (candidate) |
| synthetic certification | D14 live auth search P50 measured (see report) |
| security status | Train P0: 0 · No LIVE_SECURITY_CERTIFIED / live P0=0 / live Elite honesty shipped. No ATLAS-RT/XSYS. |
| Premium status | **ELITE_PREMIUM=NOT_RUN** (MSAL_TOKEN/staff session ABSENT this pod) |
| integration dependencies | None |
| P0 | 0 (train) |
| P1 | See SEARCH note — D14 live P50 recorded; candidate patch still undeployed |
| P2 | D11–D13 honesty on branch only (not live Elite) |
| owner decisions | OD-005 out of scope |
| deployment state | `REMOTE-REACHABLE` · **DO NOT DEPLOY** |

## Orchestrator control protocol

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **14** (`ORCH-D14` authenticated search P50) |
| ORCHESTRATOR REMOTE SHA | `55cde62` (control plane still showed D13 consumed / idle at fetch; D14 issued in-band) |
| BASED ON WORKER SHA (directive) | `823e9b8a7d9449ce149f4e4d05cb8674b0954636` |
| ACK | **D14 acknowledged explicitly** (D11–D13 not redone; no deploy) |

## THIS-POD auth names (D14)

| Name | Result |
|------|--------|
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | PRESENT |
| `HUB_TOKEN` | ABSENT |
| `MSAL_TOKEN` | ABSENT |
| `STAFF_JWT` | ABSENT |
| `AUTH_SESSION` | **PRESENT** (Hub API audience via client-credentials; not Graph) |
| `ELITE_PREMIUM` | **NOT_RUN** |

## Live search (D14)

| Item | Value |
|------|--------|
| `AUTHENTICATED_LATENCY` | **RUN** — 7× `GET /api/pm/search?q=hvcg` → HTTP 200 |
| **P50_ms** | **2408** |
| P95 / min / max / mean ms | 2459 / 2194 / 2698 / 2387 |
| resultCount | 0 (all samples; counts only) |
| Unauth 401 | Prior D11 PASS — not re-probed |
| Artifact | `docs/ATLAS_P2_D14_AUTH_SEARCH_P50_2026-08-22.md` + `/opt/cursor/artifacts/d14_auth_search_latency.json` |

## Honesty change list (carry-forward; not redone)

D11–D13 remain accepted on this branch. Live Elite `75d0c59` does not show them.

## COMPLETED ACTIONS

- D14 this-pod auth inventory
- Hub audience AUTH_SESSION + authenticated search P50
- ELITE_PREMIUM=NOT_RUN recorded
- Status CONSUMED=14

## REMAINING ACTIONS

1. Elite Premium rendered QA when MSAL/staff session exists (not this pod)
2. Authorized Elite release for D12/D13 (Section-27 still FAIL per orch — not this train)
3. Authorized Hub deploy for candidate search patch if still required after live P50 context

## TEST STATUS

D14 live timing PASS (7/7 HTTP 200). Prior Hub unit **325/325** unchanged this checkpoint.

## PREMIUM STATUS

**ELITE_PREMIUM=NOT_RUN** — no MSAL/staff browser session this pod. Hub token not injected into Elite.

## INTEGRATION STATUS

N/A.

## OWNER DECISIONS

None.

**Updated:** 2026-08-22T03:15:00Z
