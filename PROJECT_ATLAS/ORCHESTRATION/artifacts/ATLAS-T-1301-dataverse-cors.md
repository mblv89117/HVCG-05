# ATLAS-T-1301 — Dataverse CORS for Elite OS SWA

**Agent:** power-platform  
**Environment:** HVCG Development (`https://org1131a2b0.crm.dynamics.com`)  
**Verified:** 2026-07-20T00:08:01Z  
**Production change:** none (Dev only; no Production PP cutover)

## Required origins (governance allowlist)

| Origin | Purpose |
|--------|---------|
| `http://127.0.0.1:5180` | Elite OS Vite local |
| `http://localhost:5180` | Elite OS Vite local (alt host) |
| `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` | Elite OS Dev SWA |

## Platform finding

Dataverse Web API on HVCG Development already returns CORS headers that permit browser SPA calls from the origins above:

- OPTIONS `/api/data/v9.2/WhoAmI` with `Origin: https://zealous-rock-0090c7e1e.7.azurestaticapps.net` → `access-control-allow-origin: *` (HTTP 200)
- OPTIONS with `Origin: http://127.0.0.1:5180` → `access-control-allow-origin: *` (HTTP 200)
- GET with SWA Origin (unauthenticated) → `401` + `access-control-allow-origin: *` (auth challenge still CORS-visible to SPA)

`pac env list-settings` (496 keys) has **no** `AllowedOrigins` / CORS-named organization setting. Privacy + Security CSP `frame-ancestors` is unrelated to Web API caller CORS.

## What was recorded

- `registry/environments.json` — `corsOrigins` + `corsStatus` on development (and local)
- Re-verification script: `scripts/power-platform/verify-dataverse-cors.sh`
- RISK-002 mitigation marked verified in `memory/risks.json`

## Connection / solution notes

| Item | Status |
|------|--------|
| Model-driven admin app | `dea8a490-4b82-f111-ab0e-6045bd0193e8` (Atlas Command Center) |
| Connection references | Unchanged (`HVCG_ConnectionReferences.json`) |
| Environment variables | Unchanged |
| Managed solution promotion | N/A for this CORS task |
| Secrets | None introduced |

## Testing evidence

```bash
bash scripts/power-platform/verify-dataverse-cors.sh
```

Expected: PASS for SWA + both localhost origins.

## Signed-in Elite OS on SWA (AC2)

Preflight CORS is satisfied. End-to-end signed-in Dataverse track load on the SWA URL requires Entra SPA session + MSAL token and is covered by **ATLAS-T-1304** (Owner UAT). Power Platform does not self-approve that UAT.

## Promotion instructions

- **Dev:** complete — no further Dataverse admin action required for CORS preflight.
- **Test / Prod:** if a future environment stops returning permissive ACAO, re-run the verify script and escalate to Power Platform admin under Privacy + Security / org CORS controls for that environment. **Production remains owner-gated.**

## Reviewers

- qa
- security
