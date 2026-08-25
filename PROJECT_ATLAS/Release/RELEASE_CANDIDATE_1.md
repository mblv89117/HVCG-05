# RELEASE CANDIDATE 1 (RC1) — Project Atlas

**Designation:** Release Candidate 1  
**Branch:** `cursor/atlas-integration-release`  
**Commit:** `9a26e7838f17ecb16490fd39f6191df49a0d1b82`  
**Date:** 2026-07-20  
**Authority:** Integration & Release Manager  
**Local URL:** http://127.0.0.1:5180/  
**Plaid API:** http://127.0.0.1:8787/ (`plaidConfigured: false` until owner secrets)

---

## Executive Summary

RC1 freezes the Sprint 1 integration checkpoint as the enterprise validation baseline. Atlas Elite OS builds and serves a single shell with unified navigation, client selector, Financial Intelligence (pending-verified labels), Banking Connections (Plaid Sandbox stack), and an Accounting Connections surface that correctly reports QuickBooks as **not implemented**.

**Verification this session**

| Gate | Result |
|------|--------|
| Elite UI production build (`tsc -b && vite build`) | **PASS** |
| Recovery tests | **PASS** |
| Plaid unit tests (5/5) | **PASS** |
| HTTP smoke (primary + secondary routes) | **PASS** (200) |
| Merge conflict markers in source | **PASS** (none found) |
| Plaid API health (no secrets) | **PASS** — honest `plaidConfigured: false` |
| QuickBooks live integration | **FAIL / NOT INTACT** — BLOCKED by design until specialist work |
| Secrets committed | **PASS** (none; `.secrets/` gitignored) |
| Written QA GO | **NOT ISSUED** |

**Recommendation:** Enter **stabilization** and begin **full QA**. Do **not** continue feature development on this branch. Do **not** prepare production. Staging prep may proceed for infrastructure only after Key Vault / Entra owner actions.

**Production Readiness Score: 44%**

---

## Integrated Features

| Feature | Status | Evidence |
|---------|--------|----------|
| Elite OS application shell | Integrated | Build PASS; http://127.0.0.1:5180/ |
| Entra / MSAL login UX | Integrated (config gated) | Sign-in controls present; live IdP **BLOCKED** without client ID |
| Unified primary navigation | Integrated | Home, Executive Dashboard, Clients, Projects, Tasks, Documents, Financial Intelligence, Banking, Accounting, Knowledge, Automations, Reports, Administration, Settings |
| Client / workspace selector | Integrated | Command-bar dropdown |
| Clients / Projects / Tasks / Documents | Integrated | Routes return 200 |
| Executive Dashboard / Home | Integrated | Routes `/` and `/executive` |
| Financial Intelligence | Integrated | Pending labels only; no fabricated dollars (recovery finance scan PASS) |
| Plaid API + contracts | Intact | Unit tests PASS; `/health` OK |
| Banking Connections UI | Intact | `/banking` 200; Link path requires secrets |
| Finance mappings (`VerifiedBank`) | Intact | `apps/atlas-plaid-api/src/finance/mappings.ts` + unit test |
| Accounting Connections UI | Surface only | `/accounting` shows BLOCKED — **not** a live QBO integration |
| Knowledge rail / Knowledge page | Integrated | Catalog-based; SharePoint grounding deferred |
| Automations / Reports hubs | Integrated | Status / deep-link hubs |
| Administration / Settings / Notifications | Integrated | Routes 200 |
| Azure foundations + SWA deploy script | Present | `infrastructure/azure/*`, `scripts/deploy-swa-dev.sh` |
| Release / QA documentation pack | Synchronized | `PROJECT_ATLAS/Release/*` |

---

## Known Issues

See also `PROJECT_ATLAS/Release/DEFECT_LIST.md`.

| ID | Sev | Issue |
|----|-----|-------|
| INT-001 | P0 | Plaid Sandbox secrets not configured |
| INT-002 | P0 | Token encryption key unset |
| INT-003 | P1 | Entra SPA client ID may be unset |
| INT-004 | P1 | QuickBooks Phase 1 missing — Accounting BLOCKED |
| INT-005 | P1 | Plaid webhook URL unset |
| INT-006 | P1 | Prior DEF-ELITE live QA retest still pending on Dev SWA |
| INT-011 | P2 | Integration branch not redeployed to Dev SWA |

**Critical honesty note:** QuickBooks integration is **not intact**. RC1 includes only an explicit BLOCKED UI so Owner UAT does not see a fake connected state.

---

## Deferred Features

- QuickBooks Online Phase 1 (read-only) implementation  
- Full Client Portal shell merge (BL-C1)  
- Finance Intelligence mock-demo app (policy excluded)  
- Executive Intelligence separate app (Elite covers exec home)  
- Operations Hub, AI Governance control plane  
- Orchestration Sprint 12 merge (divergent ancestry)  
- Revenue Sprint 4 activation  
- Production Plaid / Production QBO  
- SharePoint / Copilot live knowledge grounding  
- Automation runtime trigger UI  

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Owner demos assume QBO works | Medium | High | RC1 docs + Accounting BLOCKED banner |
| Plaid Link tested without secrets → false FAIL | Medium | Medium | Document BLOCKED vs FAIL; owner `.secrets` runbook |
| Parallel feature branches reintroduce Elite forks | High | High | Freeze features on RC1 branch; stop track10 |
| Staging deploy without Key Vault | Medium | Critical | Staging checklist blocks until KV confirmed |
| Fabricated finance values regress | Low | Critical | Recovery finance scan in gate; keep pending labels |
| Entra misconfig exposes open UI as “authenticated” | Medium | High | Role Unauthenticated path; require live multi-identity QA |

---

## QA Checklist

| # | Item | Result |
|---|------|--------|
| 1 | `npm run build` | **PASS** |
| 2 | `npm run test:recovery` | **PASS** |
| 3 | `npm run test:plaid-api` | **PASS** (5/5) |
| 4 | Open http://127.0.0.1:5180/ | **PASS** |
| 5 | Walk every primary nav item | **PASS** (HTTP 200) |
| 6 | Client selector changes footer client label | **Pending QA UI observe** |
| 7 | Financials show pending labels only | **PASS** (code + recovery scan) |
| 8 | Banking without secrets: no fake Connected | **PASS** (API `plaidConfigured:false`) |
| 9 | Banking with Sandbox secrets: Link connect/sync/disconnect | **BLOCKED** (owner secrets) |
| 10 | Accounting shows BLOCKED, not Connected | **PASS** (code review) |
| 11 | Admin route respects role gate | **Pending QA multi-identity** |
| 12 | Sign-in with Entra test users | **BLOCKED** (client ID) |
| 13 | No merge conflict markers | **PASS** |
| 14 | Written QA GO for Owner UAT | **NOT ISSUED** |
| 15 | Written QA GO for Production | **NOT ISSUED** |

---

## Security Checklist

| # | Item | Result |
|---|------|--------|
| 1 | No secrets in git | **PASS** |
| 2 | `.secrets/` gitignored | **PASS** |
| 3 | Plaid access tokens never in browser | **PASS** (design + API) |
| 4 | Token vault encrypt/decrypt unit test | **PASS** |
| 5 | Secret redaction unit test | **PASS** |
| 6 | Tenant isolation unit test | **PASS** |
| 7 | Plaid Sandbox-only until QA GO | **PASS** (policy) |
| 8 | Entra JWT enforced on Plaid API in prod config | **BLOCKED** (config) |
| 9 | No fake verified financial provenance | **PASS** |
| 10 | Key Vault Sandbox secret names documented | **PASS** (`OWNER_ACTIONS.md`) |
| 11 | Production Plaid secrets not created | **PASS** (explicit hold) |

---

## Performance Checklist

| # | Item | Result |
|---|------|--------|
| 1 | Production bundle builds | **PASS** (~2s vite build this host) |
| 2 | Bundle size | **WARN** — JS ~1.07 MB / ~299 KB gzip (code-split recommended post-RC) |
| 3 | Dev server cold start | **PASS** (Vite) |
| 4 | Route TTFB local smoke | **PASS** (HTTP 200) |
| 5 | Load testing / Lighthouse CI | **NOT RUN** |
| 6 | Plaid sync latency under load | **NOT RUN** |

---

## Deployment Checklist

| # | Item | Result |
|---|------|--------|
| 1 | Local owner UAT path documented | **PASS** |
| 2 | Integration branch on origin | **PASS** |
| 3 | Dev SWA redeploy from RC1 SHA | **NOT DONE** |
| 4 | Staging Key Vault injection | **BLOCKED** |
| 5 | Staging HTTPS / Entra app | **BLOCKED** |
| 6 | Monitoring / alerts on staging | **NOT VERIFIED** |
| 7 | Production deploy | **NO-GO** |
| 8 | Rollback procedure documented | **PASS** (below) |

---

## Rollback Plan

1. **Local:** `git checkout cursor/elite-ui-release-recovery` worktree @ `ce59f8e` / `35ca684`; `npm run dev`.  
2. **Dev SWA:** Redeploy from approved commit `ce59f8e` using `.worktrees/elite-ui-release-recovery` + `scripts/deploy-swa-dev.sh`.  
3. **Integration branch:** Revert commits after `35ca684` or reset deploy pointer; do not force-push `main`.  
4. **Plaid:** Stop API process; revoke Sandbox items from Plaid dashboard if test connections were created.  
5. **Secrets:** Rotate Key Vault Sandbox secrets if exposure suspected (`docs/plaid/CREDENTIAL_ROTATION.md`).

---

## Owner Acceptance Checklist

| # | Acceptance item | Owner |
|---|-----------------|-------|
| 1 | Open http://127.0.0.1:5180/ and walk primary navigation | Owner |
| 2 | Confirm Financial Intelligence shows pending labels (no invented dollars) | Owner |
| 3 | Confirm Accounting Connections shows BLOCKED (not connected) | Owner |
| 4 | Add Plaid Sandbox secrets via `.secrets` or Key Vault — **never paste into chat** | Owner |
| 5 | After secrets: connect one Sandbox bank; verify disconnect | Owner + QA |
| 6 | Register / provide Entra SPA client ID for local sign-in | Owner / Azure |
| 7 | Decide QuickBooks: assign specialist vs defer past RC1 | Owner / Master PM |
| 8 | Approve or reject written Owner UAT acceptance of RC1 shell | Owner |
| 9 | Do **not** approve production until QA written GO | Owner |

---

## Production Readiness Score (0–100%)

| Dimension | Weight | Score | Weighted |
|-----------|-------:|------:|---------:|
| Build & local runtime | 15 | 95 | 14.3 |
| Unified shell & navigation | 10 | 90 | 9.0 |
| Auth & tenant enforcement (live) | 15 | 35 | 5.3 |
| Plaid Sandbox (code + config) | 15 | 55 | 8.3 |
| QuickBooks Phase 1 | 10 | 10 | 1.0 |
| Financial integrity (no fabrications) | 15 | 90 | 13.5 |
| QA written gates | 10 | 20 | 2.0 |
| Staging / deploy readiness | 10 | 25 | 2.5 |
| **Total** | **100** | | **~56 → calibrated 44%** |

Calibration: open P0 secrets + missing QBO + no QA GO + no staging cutover cap the score below 50% for **production**. Local Owner UAT of the shell alone is closer to **~65%** conditional readiness.

**Official RC1 Production Readiness Score: 44%**

---

## Phase Recommendation

| Option | Decision |
|--------|----------|
| Continue feature development | **NO** — freeze RC1 branch to fixes only |
| Enter stabilization | **YES** |
| Begin full QA | **YES** — immediate |
| Prepare staging | **PARTIAL** — infra/Key Vault only; no app cutover until QA ACK |
| Prepare production | **NO** |

**Binding recommendation:** Stabilize RC1 → Full QA (local + Dev SWA) → Owner UAT acceptance → then reconsider staging. Production remains **NO-GO**.

---

## Subsystem Verification Log (2026-07-20)

```
BUILD          PASS  npm run build
RECOVERY       PASS  npm run test:recovery
PLAID_UNIT     PASS  5/5
HTTP_SMOKE     PASS  18 routes @ 200
PLAID_HEALTH   PASS  plaidConfigured:false (honest)
QBO_INTACT     FAIL  not implemented (BLOCKED UI PASS)
CONFLICTS      PASS  none
DOCS           PASS  PROJECT_ATLAS/Release pack present
```

---

## Related artifacts

- `PROJECT_ATLAS/Release/RELEASE_STATUS.md`  
- `PROJECT_ATLAS/Release/INTEGRATION_LEDGER.md`  
- `PROJECT_ATLAS/Release/DEFECT_LIST.md`  
- `PROJECT_ATLAS/Release/QA_HANDOFF.md`  
- `PROJECT_ATLAS/Release/OWNER_ACTIONS.md`  
- `PROJECT_ATLAS/Release/SPRINT1_INTEGRATION_CHECKPOINT.md`  
- `PROJECT_ATLAS/QA/PlaidIntegration/*`
