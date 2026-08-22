# Atlas P2 D18 — Search recert on live Hub `070e093`

**Recorded:** 2026-08-22T05:40Z  
**Directive:** ORCH-D18 `SEARCH_RECERT_ON_070e093` (NOT a D17 clone)  
**Worker:** `bc-fde26848-7c34-4376-8d41-0e4a5fbbbbe0`  
**Issuer run:** `run-14f763b1-1383-4e3e-a313-d1afdec59529`  
**Worker branch:** `cursor/atlas-search-performance-p2`  
**Prior:** D17 CONSUMED=17 @ `844ca25` (4b9631a — now rollback; not re-executed)  
**Deployed by worker:** **NO**  
**ELITE_PREMIUM:** **NOT_RUN**

## Why not D17

| | D17 | D18 |
|---|-----|-----|
| Live SHA | `4b9631a` / OneDeploy `7e3f65a2…` | **`070e093`** / OneDeploy `ea24ba13…` |
| Mission | entitled recert on 4b9631a (~2.0–2.1 s) | entitled hot-path recert on **new** SHA |
| Immediate rollback now | was `ed34f2f` | **`4b9631a` / `7e3f65a2…`** |

Do not treat D17 P50=2022/2074 ms or D16 empty-scope 328–379 ms as this recert. Groups resolve — empty-scope short-circuit does not apply.

## 1) Lineage (this pod)

| Probe | Result |
|-------|--------|
| `GET /health` | `ok=true`, `commit=070e0936914b0e87c908e06a95b743f6f1daa9aa`, `authRequired=true`, `insecureDevAuth=false` |
| `GET /ATLAS_HUB_COMMIT.txt` | `070e0936914b0e87c908e06a95b743f6f1daa9aa` |
| `GET /hub-build.json` | `gitSha=070e093…`, `branch=cursor/hub-search-entitled-hotpath-7a6b` |
| Match | **YES** |

Parent: `f2350b0…` · Lineage root (ancestor): `4b9631a…`  
Hub: `https://app-atlas-integration-hub.azurewebsites.net`

## 2) Unauth fail-closed

| Path | HTTP |
|------|------|
| Hub root `/` | **405** (`method_not_allowed`) |
| `/api/pm/search?q=hvcg` | **401** |
| `/api/capital` | **401** |
| Legacy `/api/search` | **405** (not treated as open) |

No auth bypass. `insecureDevAuth=false`.

## 3) AUTH_SESSION (self-minted this pod)

| Item | Result |
|------|--------|
| `AZURE_*` | PRESENT |
| `HUB_TOKEN` / `MSAL_TOKEN` / `STAFF_JWT` | ABSENT |
| Self-mint | Hub API audience client-credentials via Hub `MICROSOFT_CLIENT_ID` app setting (not Graph; not V3 token) |
| `AUTH_SESSION` | **PRESENT** |
| Token logging | none; scrubbed after use |

## 4) Entitled Search P50 on `070e093` (n=7 each)

### `q=SYN01`

| Metric | Value |
|--------|--------|
| HTTP | 7/7 **200** |
| resultsCount | 1, 2, 2, 2, 2, 2, 2 |
| scope | `entitled` (all) |
| clientCodes | `SYN01` only |
| foreignLeak | **false** (all samples) |
| latencies_ms | 2515, 634, 637, 629, 658, 628, 638 |
| **P50_ms** | **637** |
| P95 / min / max / mean | 658 / 628 / 2515 / 905 |

### `q=hvcg`

| Metric | Value |
|--------|--------|
| HTTP | 7/7 **200** |
| resultsCount | 0 (all) |
| scope | `entitled` (all) |
| clientCodes | (none) |
| foreignLeak | **false** (all samples) |
| latencies_ms | 645, 628, 635, 665, 652, 632, 633 |
| **P50_ms** | **635** |
| P95 / min / max / mean | 652 / 628 / 665 / 641 |

Artifact: `/opt/cursor/artifacts/d18_hub_search_recert_070e093.json`

V3 reference this cycle (not substituted for worker measurement): SYN01 P50 698 ms / hvcg P50 692 ms.

## 5) Acceptance checklist

| Gate | Result |
|------|--------|
| Lineage on `070e093` | YES |
| Unauth 401 (+ root 405) | YES |
| AUTH_SESSION | **yes** (PRESENT) |
| Search P50 `q=SYN01` | **637 ms** (2 hits typical; SYN01 only) |
| Search P50 `q=hvcg` | **635 ms** (0 hits) |
| foreignLeak | **false** |
| ELITE_PREMIUM | **NOT_RUN** |
| deployed | **NO** |

## Explicit non-claims

- Not `LIVE_SECURITY_CERTIFIED` / live P0=0 / finding reclassification  
- Not D15 / Elite MSAL / Elite Premium  
- Not Hub or Elite deploy / OD-005 redeploy  
- D17 on `4b9631a` not re-executed as the mission  
- Empty-scope floor on `ed34f2f` does not apply when groups resolve
