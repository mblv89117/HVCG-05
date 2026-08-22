# Independent Red Team Revalidation — Directive 12

**Directive version:** 12  
**Train:** red-team  
**Based on SHA:** `072e56f3b355535d2f2cf421fb6ffa54cd16ea42`  
**Based on run:** `run-c9759931-513d-4435-bd50-f119f7f72676`  
**Published UTC:** 2026-08-20T06:05:00Z  
**Scope:** Revalidate **only moved tips** (GCC, Copilot). Did **not** retest GTM `5bd8204`, Integration `773b510`, Hub `940a484`, Elite `75d0c59` (Directive 10 coverage stands).

---

## CURRENT SHAS TESTED (this directive)

| System | Branch | Exact SHA | Prior SHA | Delta |
|--------|--------|-----------|-----------|-------|
| GCC | `cursor/gcc-client-value-os` | `41a59b84335d644effbd7bd84faa31f73a139531` | `b02c132` | RT-05/06/07 fix commit `39458ba` |
| Copilot | `cursor/copilot-production-completion` | `19a200e8af288ea0c81471b7c6235c002de45c7e` | `aacc09c` | RT-02 fix `44366b1` |

Unchanged (not retested): GTM `5bd8204`, Integration `773b510`, Atlas Hub/Elite frozen.

---

## PRODUCT CLAIM VERIFICATION

| Finding ID | Product claim | Independent result @ tip | Evidence |
|---|---|---|---|
| GCC-RT-20260820-05 | Closed after D11 | **FIXED** | Session-authoritative `requireApiAccess()`; browser org compared via `selectOrganizationId` only; mismatch → 403 |
| GCC-RT-20260820-06 | Closed after D11 | **FIXED** | `/api/tenant` requires `financials:read`; `sales` lacks permission; export requires `reports:export` |
| GCC-RT-20260820-07 | Closed after D11 | **FIXED** | `verifyAtlasHandoffAttestation` HMAC; unsigned machine POST → 401 `handoff_attestation_required`; platform_admin remains alternate (documented) |
| COPILOT-RT-20260820-02 | Closed after D11 | **FIXED** | Per-UUID `data/workspaces/{id}.json`; `writeStore` refuses legacy global path; concurrent starts isolate |

---

## COUNT ROLLUP

| Metric | Value |
|--------|-------|
| PREVIOUS P0 (D10 tip status) | 6 |
| P0 CLOSED this cycle | **1** (COPILOT-RT-02) |
| P0 STILL OPEN | **5** (ATLAS-01/02/03, XSYS-01/02) — Hub unchanged, not re-probed |
| PREVIOUS P1 open (D10 residuals) | 5 (GTM-03/04, GCC-05/06/07) |
| P1 CLOSED this cycle | **3** (GCC-05/06/07) |
| P1 STILL OPEN | **2** (GTM-03, GTM-04) — GTM tip unchanged |
| NEW P0 | 0 |
| NEW P1 | 0 |
| P2 | none tracked this cycle |

**Independent P0/P1 for DEPLOYMENT_READY:** still **≠ 0** (Atlas/XSYS P0s + GTM P1s). Gate remains FAIL for new production.

---

## FINDING CARDS (reclassified this cycle)

### GCC-RT-20260820-05 — FIXED
- **System:** GCC · **Branch:** `cursor/gcc-client-value-os` · **SHA:** `41a59b8…`
- **Severity:** P1 · **Status:** FIXED
- **Evidence:** `src/app/api/tenant/route.ts` uses `requireApiAccess()` without browser org override; `selectOrganizationId` deny on mismatch
- **Reproduction:** Source + `npm run test:security` GCC-RT-05 case PASS
- **Impact (prior):** IDOR risk if handlers trusted browser org
- **Remediation:** Applied on tip
- **Regression test:** `src/lib/security/rt-remediation.test.ts` (GCC-RT-05)

### GCC-RT-20260820-06 — FIXED
- **System:** GCC · **SHA:** `41a59b8…` · **Severity:** P1 · **Status:** FIXED
- **Evidence:** `requirePermission(access, "financials:read")` on tenant; sales lacks perm
- **Reproduction:** `npm run test:security` GCC-RT-06 PASS
- **Regression test:** same file

### GCC-RT-20260820-07 — FIXED
- **System:** GCC · **SHA:** `41a59b8…` · **Severity:** P1 · **Status:** FIXED
- **Evidence:** `attestation.ts` HMAC over `timestamp.body`; route rejects unsigned without admin session
- **Reproduction:** `npm run test:security` GCC-RT-07 PASS
- **Residual (not re-inflated):** authenticated `platform_admin` may still stage (explicit dual-auth design)

### COPILOT-RT-20260820-02 — FIXED
- **System:** Copilot · **Branch:** `cursor/copilot-production-completion` · **SHA:** `19a200e…`
- **Severity:** P0 · **Status:** FIXED
- **Evidence:** `newWorkspaceId()` + `writeStore(store, workspaceId)` under `data/workspaces/`; legacy global write forbidden
- **Reproduction:** `vitest run tests/security-rt-revalidation.test.ts` — concurrent starts isolate (PASS 7/7)
- **Regression test:** `tests/security-rt-revalidation.test.ts`

---

## AUTOMATED TEST STATUS

| Suite | Command | Result |
|-------|---------|--------|
| GCC security RT | `cd <gcc@41a59b8> && npm run test:security` | **PASS** 6/6 |
| Copilot security RT | `cd <copilot@19a200e> && npm test -- --run tests/security-rt-revalidation.test.ts` | **PASS** 7/7 |

Artifacts: `/opt/cursor/artifacts/gcc_rt_tests_d12.txt`, `/opt/cursor/artifacts/copilot_rt_tests_d12.txt`

---

## PREMIUM QA

**N/A** — Red Team train produces findings documentation only; no UI changes on `cursor/platform-red-team-866c`. Product UI remediations were verified via source + automated security tests, not Premium walkthrough (out of RT ownership / no RT UI surface).

---

## SYSTEM STATUS (delta)

| System | Status |
|--------|--------|
| GCC | RT-05/06/07 **independently confirmed FIXED** @ `41a59b8` |
| Copilot | RT-02 **independently confirmed FIXED** @ `19a200e` |
| GTM | Unchanged from D10 — P1-03/04 still open |
| Integration | Unchanged — SoT `773b510` dependency noted |
| Atlas | Frozen Hub/Elite PASS unchanged; RT P0 backlog (01/02/03) + XSYS still open for OD-005 |

---

## RESPONSIBLE TRAINS / RETEST

| Remaining open | Owner |
|----------------|-------|
| ATLAS-RT-01/02/03, XSYS-01/02 | Atlas security-patch (OD-005) |
| GTM-RT-03/04 | GTM (+ Integration receive proof for 04) |

**Retest required:** when Atlas patch tip or GTM tip moves.

---

## COMPLETION ATTESTATION

- LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED: **12**  
- Findings reclassified with tip evidence: **YES**  
- Status artifact updated: **YES**  
- Production deploy: **NONE**  
- Frozen Atlas not mutated: **YES**
