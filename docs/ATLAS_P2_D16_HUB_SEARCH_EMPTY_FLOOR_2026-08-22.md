# Atlas P2 D16 — Hub post-deploy Search empty-scope floor recert

**Recorded:** 2026-08-22T04:35Z  
**Directive:** ORCH-D16 (NEW; not D14 clone; not D15)  
**Worker:** `bc-fde26848-7c34-4376-8d41-0e4a5fbbbbe0`  
**This V3 run (issuer):** `run-221ab1a6-43e9-45f0-acf7-203f65f3cc11`  
**Branch (worker report):** `cursor/atlas-search-performance-p2`  
**Based on prior tip:** `bc31cf8` (D14 CONSUMED=14)  
**Deploy by worker:** NO (Hub already deployed by V3; Elite untouched)

## Mission

Independent Hub post-deploy Search latency recert on live SHA `ed34f2f86fa1a0ce0c4c6ff6ab255d6eff32aa3a`.  
Not Elite. Not Elite Premium. Not Elite MSAL. Not D15. D11–D14 not re-executed.

## 1) Lineage (verified this pod)

| Probe | Result |
|-------|--------|
| `GET /health` | `ok=true`, `commit=ed34f2f86fa1a0ce0c4c6ff6ab255d6eff32aa3a`, `authRequired=true`, `insecureDevAuth=false` |
| `GET /ATLAS_HUB_COMMIT.txt` | `ed34f2f86fa1a0ce0c4c6ff6ab255d6eff32aa3a` |
| `GET /hub-build.json` | `gitSha=ed34f2f86fa1a0ce0c4c6ff6ab255d6eff32aa3a`, `branch=cursor/hub-search-empty-shortcircuit-7a6b` |
| Match expected | **YES** |

Hub URL: `https://app-atlas-integration-hub.azurewebsites.net`  
OneDeploy (claimed by orch): `798f0dd6-c939-4b08-9b42-eb0bb090a1c4`  
Elite: **NOT TOUCHED** (`75d0c59` remains live SWA).

## 2) Unauth fail-closed

| Path | HTTP |
|------|------|
| `/api/pm` | **401** |
| `/api/capital` | **401** |
| `/api/pm/search?q=hvcg` (extra) | **401** |
| `/api/capital/opportunities` (extra) | **401** |

No auth bypass. `insecureDevAuth` remains false.

## 3) THIS-POD auth names (values never logged)

| Name | Result |
|------|--------|
| `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | PRESENT |
| `HUB_TOKEN` / `MSAL_TOKEN` / `STAFF_JWT` | ABSENT |
| `az` CLI | ABSENT |
| `AUTH_SESSION` | **PRESENT** — Hub API audience via client-credentials (`api://{MICROSOFT_CLIENT_ID}/.default` from Hub app setting; not Graph). Token not logged; scrubbed after use. |

## 4) Authenticated Search samples

`GET /api/pm/search?q=hvcg` × **7** (n≥5)

| i | http | ms | resultsCount | scope |
|---|------|----|--------------|-------|
| 1 | 200 | 571 | 0 | entitled |
| 2 | 200 | 306 | 0 | entitled |
| 3 | 200 | 323 | 0 | entitled |
| 4 | 200 | 419 | 0 | entitled |
| 5 | 200 | 320 | 0 | entitled |
| 6 | 200 | 444 | 0 | entitled |
| 7 | 200 | 328 | 0 | entitled |

| Metric | Value |
|--------|--------|
| **P50_ms** | **328** |
| P95_ms | 444 |
| min / max / mean ms | 306 / 571 / 387 |
| Baseline `1ac6257` Graph-fanout | 2193 ms |
| V3 ref on `ed34f2f` | 379 ms (n=7) |

Artifact: `/opt/cursor/artifacts/d16_hub_search_recert.json`

No tokens, secrets, raw GUIDs, item fields, emails, or client names.

## 5) Classification — empty-scope floor on `ed34f2f`

### **LIVE**

- Lineage matches `ed34f2f`
- Authenticated Search **P50=328 ms** materially below **2193 ms** `1ac6257` Graph-fanout baseline
- `resultsCount=0` for this service principal on all samples; `scope=entitled`

## Explicit non-claims

- Not `LIVE_SECURITY_CERTIFIED`
- Not live P0=0
- Not entitled-desk Search closed (SYN01 still EMPTY; owner action remains batched)
- Not Elite honesty / Premium / MSAL
- Worker did not deploy Hub or Elite
- Did not call `/api/pm/opportunities/1` or `999999`
- Did not change Azure RBAC, ACCG01, or App Settings

## Rollback context (reference only; not executed)

| Kind | SHA / OneDeploy |
|------|-----------------|
| Immediate | `1ac62572…` / `333912dc…` |
| Deeper (DO NOT REDEPLOY) | `9e5d10a` / `698f7e92` |
