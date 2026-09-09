# Hub CI known issues (classification)

As of tip `775b602d` / branch fixes (2026-09-09).

## Unit tests (FIXED on `cursor/atlas-hub-ci-preexisting-fix-472b`)

1. `client isolation hides Hart custom workflows from PDG01 principal`
   - Was: TypeError `undefined.startsWith` from missing `workflowId` on Engineering mission loop catalog entry.
   - Impact: test crash before isolation assertion; Workflow Center could emit undefined ids.
   - Tenant isolation: **not a cross-tenant leak** — isolation helpers were not the bug.
   - Hub deploy (HMAC/ClientCode): **non-blocking**; fixed.

2. `renews a stored mail subscription before the 4230-minute cap`
   - Was: test fixture clock mismatch.
   - Impact: test-only; production renewal uses consistent clocks.
   - Hub deploy: **non-blocking**; fixed.

## Typecheck gate (PRE_EXISTING_KNOWN_ISSUE)

`scripts/ci/hub-typecheck-gate.mjs` currently allowlists only one historical TS2367.
`tsc` on Hub reports a large set of **pre-existing** errors across operator desk / onboarding / tests
that also fail on `production/atlas-core` tip without Wave 3 HMAC changes.

**Exception fixed here:** `src/http/router.ts` module ingest passed undeclared `rawBody`
(TS18004). That broke typed HMAC verification wiring — **fixed** by reading `readRawBody(req)`
before `handleModuleIngestRoutes`.

Deploy safety for HMAC key-id ingest + ClientCode: unit tests for ingest remain the safety
gate; typecheck debt outside ingest/HMAC is **PRE_EXISTING** and does not block ancestry-safe
Hub deploy of tip, but should be reduced in a dedicated TS debt PR.
