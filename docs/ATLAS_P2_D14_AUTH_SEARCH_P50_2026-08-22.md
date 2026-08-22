# Atlas P2 D14 — Authenticated search P50 (this-pod AUTH_SESSION)

**Recorded:** 2026-08-22T03:15Z  
**Directive:** ORCH-D14 (NOT D13)  
**Worker:** `bc-fde26848-7c34-4376-8d41-0e4a5fbbbbe0`  
**Branch:** `cursor/atlas-search-performance-p2`  
**Based on tip:** `823e9b8`  
**Deploy:** NO  
**D11–D13:** CONSUMED — not re-executed

## THIS-POD credential names (values never logged)

| Name | Result |
|------|--------|
| `AZURE_CLIENT_ID` | PRESENT |
| `AZURE_CLIENT_SECRET` | PRESENT |
| `AZURE_TENANT_ID` | PRESENT |
| `AZURE_SUBSCRIPTION_ID` | PRESENT |
| `HUB_TOKEN` | ABSENT |
| `MSAL_TOKEN` | ABSENT |
| `STAFF_JWT` | ABSENT |
| `az` CLI | ABSENT (OAuth client-credentials used instead) |

## AUTH_SESSION

**PRESENT** — Hub API audience token obtained via client-credentials against Hub app setting `MICROSOFT_CLIENT_ID` (`api://{MICROSOFT_CLIENT_ID}/.default`). Not a Graph token. Token scrubbed after use.

## Authenticated search timing

| Field | Value |
|-------|--------|
| Hub | `https://app-atlas-integration-hub.azurewebsites.net` |
| Path | `GET /api/pm/search?q=hvcg` |
| Samples | 7 |
| HTTP | all **200** |
| resultCount | 0 / 0 / 0 / 0 / 0 / 0 / 0 (counts only) |
| latencies_ms | 2698, 2408, 2447, 2459, 2279, 2230, 2194 |
| **P50_ms** | **2408** |
| P95_ms | 2459 |
| min/max/mean_ms | 2194 / 2698 / 2387 |

Artifact: `/opt/cursor/artifacts/d14_auth_search_latency.json`

No tokens, item fields, emails, or client names logged.

## ELITE_PREMIUM

**NOT_RUN** — `MSAL_TOKEN` ABSENT; no real browser staff session in this pod. Local Owner is not staff MSAL. Hub Bearer was **not** injected into Elite.

## Claims discipline

- No `LIVE_SECURITY_CERTIFIED`
- No live P0=0 claim
- No live Elite honesty shipped claim
- No Hub/Elite deploy
- Search candidate patch remains undeployed; this measurement is live Hub as currently running

## SEARCH_LIVE_LATENCY note

Prior train P1 cited ~14.5s live auth on earlier cert queries. This D14 probe (`q=hvcg`, app-only AUTH_SESSION, 7×200, resultCount=0) measured **P50=2408 ms** on live Hub. Do not treat as Section-27 Elite release gate or as proof the undeployed candidate patch is live.
