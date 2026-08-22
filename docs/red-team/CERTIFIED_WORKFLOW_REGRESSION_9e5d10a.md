# Certified Frozen-Workflow Regression — OD-005 candidate `9e5d10a`

**Directive:** 23  
**Train:** red-team  
**Candidate branch:** `cursor/atlas-security-patch-od005`  
**Exact SHA:** `9e5d10a20639bbeb659fbacd6362cd9f13adb08b`  
**Published UTC:** 2026-08-20T15:37:00Z  
**Method:** Independent executable retest of D22 residual only. D21 finding probes not re-run as sole D23 evidence. No Hub deploy. OD-005 branch not mutated.

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — five LIVE P0s remain **OPEN**.

**Prior residual (D22 @ `0bbfd87`):** Lead→Opportunity post-convert GET **404** → Hub API **322 pass / 1 fail** → `REGRESSION=PARTIAL`.

---

## Overall

| Gate | Result |
|------|--------|
| Candidate P0 / P1 (D21 cite @ `0bbfd87`; D23 did not reopen) | **0 / 0** FIXED_REVALIDATED |
| Certified workflow regression (D23 residual scope) | **PASS** |
| ROLLBACK_READY | **YES** |
| OWNER_GATE_PREREQS | `CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PASS ROLLBACK_READY=YES` |
| AUTHORIZE PRODUCTION SECURITY PATCH (this worker) | **NO** |
| Production deploy requested | **NO** |

---

## Required commands (exact SHA `9e5d10a`)

| ID | Command | Exit | Counts / result |
|----|---------|------|-----------------|
| a | `cd apps/atlas-integration-api && npx tsx --test tests/hub-pm-sharepoint.test.ts` | **0** | **34 pass / 0 fail** |
| a′ | Subtest `converts a New website lead into Company, Contact, and Discovery Opportunity` | **ok** | See assertions below |
| b | `cd apps/atlas-integration-api && npm test` | **0** | **323 pass / 0 fail** (D22 was 322/1 on `0bbfd87`) |
| c | `node scripts/red-team/check-opportunity-staff-bypass.mjs .` | **0** | `staffShortCircuitPresent=false` |

Artifacts: `docs/red-team/artifacts/directive23_*.txt`

### Convert+GET residual assertions (fixture-enforced; suite exit 0)

From `tests/hub-pm-sharepoint.test.ts` on this SHA (independently executed; subtest **ok**):

| Check | Expected | Evidence |
|-------|----------|----------|
| convert POST | **200** | `assert.equal(res.status, 200)` in passing subtest |
| `company.clientCode` | **NORTH01** | asserted; `notEqual` ACCG01 |
| `entitlementProvisioned` | **false** (company + top-level) | asserted |
| entitled principal (`USER_A` with NORTH01) GET opportunity | **200** | asserted |
| unentitled staff GET opportunity | **404** | asserted |
| ATLAS-01 staff short-circuit | **absent** | `check-opportunity-staff-bypass.mjs` → `staffShortCircuitPresent=false`, exit 0 |

Fixture now entitles `USER_A` for `['ACCG01', 'NORTH01']` so post-convert GET is under an entitled principal without reintroducing staff short-circuit.

---

## Rollback attestation (not executed)

| Artifact | Status @ `9e5d10a` |
|----------|---------------------|
| `deployment/scripts/Rollback-HVCGCapitalHub.ps1` | **EXISTS** |
| `deployment/artifacts/hub-rollback/pre-940a484-from-b6a3c9c.zip` | **MISSING** (gitignored; not required) |
| Prior Hub SHA `b6a3c9c50747f3bc06b0de870d9906c4b9424152` | **RECORDED** in live/cert docs |

**ROLLBACK_READY = YES** — script exists, prior Hub SHA recorded, steps describable (WhatIf → `-RollbackZip` → optional `-Apply`); **not executed**.

---

## Dual-surface findings

| ID | Live Hub `940a484` | Candidate `9e5d10a` |
|----|--------------------|---------------------|
| ATLAS-01/02/03 | OPEN | FIXED_REVALIDATED (D21 @ `0bbfd87`; D23 staff-bypass + convert residual PASS; findings probes not re-run as sole evidence) |
| XSYS-01/02 | OPEN | FIXED_REVALIDATED (D21 cite; not re-probed) |

Live production P0 count remains **5**. Candidate P0/P1 remain **0**.

---

## Comparison to D22

| Metric | D22 @ `0bbfd87` | D23 @ `9e5d10a` |
|--------|-----------------|-----------------|
| hub-pm-sharepoint | 33 pass / 1 fail (exit 1) | **34 / 0 (exit 0)** |
| Hub API aggregate | 322 / 1 (exit 1) | **323 / 0 (exit 0)** |
| staff-bypass check | exit 0 (D21) | **exit 0** |
| REGRESSION | PARTIAL | **PASS** |
