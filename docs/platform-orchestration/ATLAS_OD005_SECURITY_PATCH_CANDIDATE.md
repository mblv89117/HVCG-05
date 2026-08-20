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
