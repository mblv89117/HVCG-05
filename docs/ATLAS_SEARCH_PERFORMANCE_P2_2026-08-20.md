# Atlas Search Performance P2 — candidate report

**Branch:** `cursor/atlas-search-performance-p2`  
**Base lineage:** `cursor/atlas-hv-completion-52d1` @ certified Hub `940a484` / Elite `75d0c59` (tip at branch cut includes Premium freeze `2a5a605`)  
**Deployment:** candidate only — **do not deploy production**

## Profile (measured critical path)

Authenticated `/api/pm/search` (Manny Premium cert window) was ~14–16s because:

1. `listAuthorizedClients` blocked before other catalogs
2. CRM catalogs (opportunities/leads/capital) and Manny vendors/lenders/files were unbounded and often **serial**
3. Nested list reads duplicated Graph `listAll` (projects via tasks, clients via opportunity index, communications via extras + files)
4. No raw-list cache / in-flight dedupe

Budgets already protected client hits, but the **response still waited** on slow secondary catalogs → API P50 ≈ 14.5s.

## Safe optimizations shipped

| Change | Authz impact |
|--------|----------------|
| Parallel kickoff of core + CRM + Manny catalogs | None — filter after load |
| Overall search budget 4500ms + catalog/Manny budgets | Fail-soft on stalls; client hits preserved |
| Bounded raw `listId` TTL cache (20s) + inflight dedupe | Keys are listId only; principal filter after; invalidate on write |
| Elite Command-K `AbortController` + existing 280ms debounce | Cancels stale in-flight Hub search |
| Optional `timing` on search JSON for cert scripts | Non-sensitive latency breakdown |

## Benchmark (modeled Graph 800ms/list, 8 samples)

| Metric | Before (live cert) | After (bench) |
|--------|--------------------|---------------|
| P50 | 14474 ms | **1602 ms** |
| P95 | 15622 ms | **1603 ms** |
| Authz | PASS | PASS |
| Typical target | ≤ 3000 ms | met |
| P95 target | ≤ 5000 ms | met |

Artifact: `/opt/cursor/artifacts/atlas_search_perf_benchmark.json`

Warm-cache production should be faster still (duplicate listAll eliminated). Live re-cert requires `HUB_TOKEN` + `Invoke-HVCGSearchAuthzCert.mjs` after candidate deploy (not this window).

## P2 polish

- **Date input:** Opportunity `dayStamp` only emits `YYYY-MM-DD` or empty — no `mm/dd/…` fragments into `<input type="date">`
- **Projects:** `Draft` in Atlas status language; Draft+Unverified rows show “Not assessed yet · view only until next action is real”; Draft filter option added

## Tests

- Hub integration: **325 pass / 0 fail**
- Search redteam + perf + SharePoint CRM: pass
- Elite appShell search abort + date redteam: pass

## Security

- Cache never keyed by principal/role/client
- Writes invalidate list cache
- RBAC / entitled filtering unchanged
- Unauth search remains 401
- No ACCG01 writes

## P0 / P1 / P2

- P0: 0
- P1: 0
- P2: search latency addressed in candidate; live Hub re-measure pending controlled deploy
