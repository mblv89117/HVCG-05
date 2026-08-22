# QA Handoff Package — Atlas Integration Release

**To:** QA & Release Manager  
**From:** Integration & Release Manager  
**Date:** 2026-07-20  
**Branch:** `cursor/atlas-integration-release`  
**Path:** `.worktrees/atlas-integration-release`

## What to test

1. Local URL http://127.0.0.1:5180/ — all primary nav routes load (no blank/hidden broken pages).
2. Client selector switches workspace context (visible in footer).
3. Financial Intelligence shows **pending** labels only — no fabricated dollars.
4. Banking Connections:
   - Without secrets: clear error / not-configured (no fake Connected).
   - With Sandbox secrets: Link connect, sync, disconnect, verified cash provenance.
5. Accounting Connections: explicit BLOCKED messaging (no fake QBO connect).
6. Admin / Settings / Notifications reachable per role.
7. Sign-in button behavior with/without Entra client ID.
8. Recovery tests: `npm run test:recovery`
9. Plaid unit: `npm run test:plaid-api`

## Test evidence already recorded

| Check | Command | Result |
|-------|---------|--------|
| Build | `npm run build` | **PASS** |
| Recovery | `npm run test:recovery` | **PASS** |
| Plaid unit | `npm run test:plaid-api` | **PASS** (5/5) |
| HTTP smoke | curl primary routes | **PASS** (200) |
| Plaid health | `GET /health` | **PASS** — `plaidConfigured:false` honest |
| Plaid Sandbox E2E | — | **BLOCKED** |
| QBO Sandbox | — | **NOT APPLICABLE** |
| Live Entra multi-identity | — | **BLOCKED** |

## Artifacts

- [RELEASE_STATUS.md](./RELEASE_STATUS.md)
- [INTEGRATION_LEDGER.md](./INTEGRATION_LEDGER.md)
- [DEFECT_LIST.md](./DEFECT_LIST.md)
- [BRANCH_INVENTORY.md](./BRANCH_INVENTORY.md)
- Prior: Elite recovery QA evidence on `cursor/elite-ui-release-recovery` @ `35ca684`
- Plaid: `PROJECT_ATLAS/QA/PlaidIntegration/*`

## Ask of QA

Issue written **GO** or **NO-GO** for Owner Local UAT and separately for Dev SWA redeploy from this branch.  
Production remains NO-GO until your written GO.
