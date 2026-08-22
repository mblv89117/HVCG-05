# Atlas OD-005 complete security-patch candidate

**Branch:** `cursor/atlas-security-patch-od005`  
**Base:** freeze tip `2a5a605` (Hub `940a484` / Elite `75d0c59` ancestors)  
**Status:** CANDIDATE ONLY — **NOT DEPLOYED** — awaiting independent Red Team PASS on this exact SHA, then owner AUTHORIZE PRODUCTION SECURITY PATCH.

## Security truth (live Hub)

| ID | Classification | Live Hub `940a484` | Elite `75d0c59` | Notes |
|----|----------------|--------------------|-----------------|-------|
| ATLAS-RT-20260820-01 | **LIVE_PRODUCTION_P0** | YES | Not Hub API surface | Staff short-circuit on opportunities |
| ATLAS-RT-20260820-02 | **LIVE_PRODUCTION_P0** | YES | Not Hub API surface | Same authz path before patch |
| ATLAS-RT-20260820-03 | **LIVE_PRODUCTION_P0** | YES (if Plaid reachable) | Not Plaid surface | Header-only Plaid auth |
| XSYS-RT-20260820-01 | **LIVE_PRODUCTION_P0** | YES (if intake configured) | N/A | Key-only website ingest |
| XSYS-RT-20260820-02 | **LIVE_PRODUCTION_P0** | YES (if intake configured) | N/A | Unbound idempotency prefixes |

**ACTUAL LIVE PRODUCTION P0 COUNT = 5** (do not report frozen P0=0 while these are PRODUCTION_REPRODUCIBLE).

## Candidate remediations

| ID | Change on this branch |
|----|------------------------|
| ATLAS-01/02 | Removed `canSeeOpportunity` staff short-circuit; entitlement intersection for all principals |
| ATLAS-03 | Plaid `requireAuth` requires verified Entra Bearer JWT; x-atlas-* headers never authorize when auth is on |
| XSYS-01 | Website intake requires key-id + timestamp + HMAC-SHA256(`${timestamp}.${rawBody}`) signature (fail closed) |
| XSYS-02 | Idempotency keys must match submissionType prefix (`website|` / `eva|` / `copilot|` / `360|`); foreign prefix → 409 |

## Required invariants (preserved)

- Fail-closed authz
- No Sites.Manage.All
- Synthetic Graph writes remain false / not enabled
- No ACCG01 writes
- Frozen production not thawed by this branch alone

## Tests

- `node --test apps/atlas-integration-api/tests/hub-website-leads.test.ts`
- `node scripts/red-team/check-opportunity-staff-bypass.mjs .`
- `npm run test -w @hvcg/atlas-plaid-api` (when workspace deps available)

## Stop line

Do **not** deploy Hub or Elite from this train until:

1. Independent Red Team reports P0=0 and P1=0 on **this exact candidate SHA**
2. Owner answers AUTHORIZE PRODUCTION SECURITY PATCH = YES

Incomplete prior tip `bb7edae` (ATLAS-only) is superseded by this complete candidate for OD-005 readiness.

## Orchestrator follow-up (directive version 1)

**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED = 1**

| Item | Value |
|------|--------|
| Prior candidate SHA | `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` (`0bbfd87`) |
| Fixture alignment SHA | `533a13007753e81f2178393907d63bc8ab16310a` (`533a130`) |
| Status note SHA | `226c11047533a508cb1e33b9d0543c92585638c7` (`226c110`) |
| Live Hub | `940a484` — **P0 remains 5 OPEN** (ATLAS-01/02/03, XSYS-01/02). Do not claim live close. |
| Candidate P0/P1 | 0 OPEN on this SHA (fixture alignment only; no product authz rollback) |
| DEPLOYMENT_READY | Owner-gated — not pursued |

### Residual closed on this SHA

Red Team D22 (`bc-1d522892`) reported REGRESSION=PARTIAL on `0bbfd87`: convert POST succeeded (`company=NORTH01`, `entitlement=false`) but GET `/api/pm/opportunities/{id}` returned 404 because the fixture principal was entitled only for ACCG01.

**Certified contract kept:** convert does **not** provision entitlements (`entitlementProvisioned=false`). Staff short-circuit stays **removed**. Post-convert GET is 200 only under a principal already entitled for the proposed ClientCode (`NORTH01`). Unentitled staff remains 404.

### Evidence commands (executed)

```bash
cd apps/atlas-integration-api && npx tsx --test tests/hub-pm-sharepoint.test.ts
# tests 34  pass 34  fail 0

cd apps/atlas-integration-api && npm test
# tests 323  pass 323  fail 0   (was 322/323 on 0bbfd87)

node scripts/red-team/check-opportunity-staff-bypass.mjs .
# staffShortCircuitPresent=false  exit 0
```

Do **not** authorize a production security patch from this note. Live Hub P0 count stays 5 until an authorized Hub deploy.
