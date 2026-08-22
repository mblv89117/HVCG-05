# Atlas P2 D17 — Search recert on live Hub `4b9631a`

**Recorded:** 2026-08-22T05:10Z  
**Directive:** ORCH-D17 `SEARCH_RECERT_ON_4b9631a` (NOT a D16 clone)  
**Worker:** `bc-fde26848-7c34-4376-8d41-0e4a5fbbbbe0`  
**Issuer run:** `run-a58fafe7-0ba1-402b-bd1c-afcd8f2c44b4`  
**Worker branch:** `cursor/atlas-search-performance-p2`  
**Prior:** D16 CONSUMED=16 @ `89e7f0f` (ed34f2f — now rollback; not re-executed)  
**Deployed by worker:** **NO**  
**ELITE_PREMIUM:** **NOT_RUN** (not D15; Elite not touched)

## Why not D16

| | D16 | D17 |
|---|-----|-----|
| Live SHA | `ed34f2f` / OneDeploy `798f0dd6` | **`4b9631a`** / OneDeploy `7e3f65a2…` |
| Mission | empty-scope floor on ed34f2f | Search recert on **new** live SHA |
| Immediate rollback now | was `1ac6257` | **`ed34f2f` / `798f0dd6`** |

Do not treat D16 P50=328 ms / V3 379 ms as a `4b9631a` result.

## 1) Lineage (this pod)

| Probe | Result |
|-------|--------|
| `GET /health` | `ok=true`, `commit=4b9631a0a50e06591dd9100fb48b07e5aea7d008`, `authRequired=true`, `insecureDevAuth=false` |
| `GET /ATLAS_HUB_COMMIT.txt` | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| `GET /hub-build.json` | `gitSha=4b9631a…`, `branch=cursor/hub-entitlement-group-members-7a6b` |
| Match | **YES** |

Hub: `https://app-atlas-integration-hub.azurewebsites.net`

## 2) Unauth fail-closed

| Path | HTTP |
|------|------|
| `/api/pm/search?q=hvcg` | **401** |
| `/api/capital` | **401** |

No auth bypass. `insecureDevAuth=false`.

## 3) AUTH_SESSION (self-minted this pod)

| Item | Result |
|------|--------|
| `AZURE_*` | PRESENT |
| `HUB_TOKEN` / `MSAL_TOKEN` / `STAFF_JWT` | ABSENT |
| Self-mint | Hub API audience client-credentials via Hub app setting `MICROSOFT_CLIENT_ID` (not Graph; not a V3-passed token) |
| `AUTH_SESSION` | **PRESENT** |
| Token logging | none; scrubbed after use |

## 4) Search P50 on `4b9631a`

### Empty-result series — `q=hvcg` (n=7, all 200)

| Metric | Value |
|--------|--------|
| resultsCount | 0 / 0 / 0 / 0 / 0 / 0 / 0 |
| scope | `entitled` (all) |
| syn01HitCount | 0 (all) |
| latencies_ms | 1981, 2052, 1958, 2559, 2056, 2022, 1988 |
| **P50_ms** | **2022** |
| P95 / min / max / mean | 2056 / 1958 / 2559 / 2088 |

Note: On this SHA + this SP, empty **results** still run under `scope=entitled` at ~2.0s — **not** the prior `ed34f2f` empty-scope short-circuit floor (~328–379 ms). Do not conflate.

### Entitled series — `q=SYN01` (SYN01 visible)

First pass (n=7 attempts): 3×200 then 4×503 (transient).  
Retry until **7×200**:

| Metric | Value |
|--------|--------|
| resultsCount | 2 (all ok samples) |
| syn01HitCount | 2 (all ok samples) — **SYN01 visible** |
| scope | `entitled` |
| latencies_ms (ok) | 17340, 2074, 2124, 1921, 1933, 1933, 2100 |
| **P50_ms** | **2074** |
| P95 / min / max / mean | 2124 / 1921 / 17340 / 4203 |
| http503 (retry pass) | 0 |

Artifact: `/opt/cursor/artifacts/d17_hub_search_recert_4b9631a.json`  
Counts / scope / latency only — no item fields, emails, or client names.

## 5) Acceptance checklist

| Gate | Result |
|------|--------|
| Lineage on `4b9631a` | YES |
| Unauth 401 | YES |
| AUTH_SESSION | **yes** (PRESENT) |
| Search P50 empty-result (`q=hvcg`) | **2022 ms** |
| Search P50 entitled (`q=SYN01`, SYN01 visible) | **2074 ms** |
| ELITE_PREMIUM | **NOT_RUN** |
| deployed | **NO** |

## Explicit non-claims

- Not `LIVE_SECURITY_CERTIFIED` / live P0=0  
- Not D15 / Elite MSAL / Elite Premium / Elite honesty  
- Not a redeploy of Hub or Elite  
- D16 on `ed34f2f` not re-executed as the mission  
- Prior empty-scope floor on `ed34f2f` is **not** this recert
