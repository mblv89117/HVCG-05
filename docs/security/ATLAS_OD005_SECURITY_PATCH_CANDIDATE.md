# Atlas OD-005 security-patch candidate

**Branch:** `cursor/atlas-security-patch-od005`  
**Base:** `cursor/atlas-hv-completion-52d1` @ `2a5a605` (Hub `940a484` / Elite `75d0c59` ancestors)  
**Status:** CANDIDATE ONLY — **NOT DEPLOYED** — awaiting owner production security-patch authorization (OD-005).

## Findings addressed in this candidate

| ID | Classification | Change |
|----|----------------|--------|
| ATLAS-RT-20260820-01 | PRODUCTION_REPRODUCIBLE @ `940a484` | Removed `canSeeOpportunity` staff short-circuit; entitlement intersection for all principals |
| ATLAS-RT-20260820-02 | PRODUCTION_REPRODUCIBLE @ `940a484` | Same authz path (authorize before patch) |
| ATLAS-RT-20260820-03 | PRODUCTION_REPRODUCIBLE @ `940a484`/`2a5a605` | Plaid `requireAuth` path now requires verified Entra Bearer JWT via `jose`; x-atlas-* headers never authorize when auth is on |

## Tests

- Static: `node scripts/red-team/check-opportunity-staff-bypass.mjs .` → exit 0
- Plaid unit: `npm run test -w @hvcg/atlas-plaid-api`

## Stop line

Do **not** deploy Hub or Elite from this train. Frozen live-cert remains Hub `940a484` / Elite `75d0c59` until OD-005 authorizes a production security patch.

## Orchestrator follow-up (directive version 1)

**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED = 1**

- Prior SHA: `0bbfd87` — D22 REGRESSION=PARTIAL (convert GET 404 under ACCG01-only principal)
- Fixture SHA: `533a130` — convert fixture entitles USER_A for `NORTH01`; staff short-circuit still absent; `entitlementProvisioned=false`
- Evidence (executed): `npx tsx --test tests/hub-pm-sharepoint.test.ts` → 34/34; `npm test` → 323/323 fail 0; staff-bypass check exit 0
- Live Hub `940a484` P0 remains **5 OPEN**. DEPLOYMENT_READY not pursued.
