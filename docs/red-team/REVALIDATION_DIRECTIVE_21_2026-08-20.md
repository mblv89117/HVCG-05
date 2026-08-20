# Independent Red Team Revalidation — Directive 21

**Directive version:** 21  
**Train:** red-team  
**Based on SHA:** `8d336b2c4d02cb61044702aa9b91098fc409eab5`  
**Based on run:** `run-38c049ca-7a16-44ee-a200-7faa55e9a2d6`  
**Published UTC:** 2026-08-20T14:55:00Z  
**Method:** Findings + regression probes only. No Hub deploy. No product feature implementation.

**Materially new vs D20:** Complete OD-005 candidate `0bbfd87` supersedes incomplete `bb7edae` (adds XSYS-01/02 Hub intake remediations).

---

## SHAS TESTED

| Surface | Branch | Exact SHA |
|---------|--------|-----------|
| OD-005 candidate (new complete) | `cursor/atlas-security-patch-od005` | `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` |
| Live Hub (production baseline) | frozen | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

**Not retested:** GTM, Revenue adapters/Elite/engine, GCC, Copilot, Integration SoT (identical prior tips).

---

## Per-finding dual-surface status

### ATLAS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Atlas Hub integration-api (opportunities) |
| LIVE PRODUCTION Branch/SHA | Hub `940a484` |
| LIVE Status | **OPEN** |
| LIVE Evidence | `canSeeOpportunity` still `if (isInternalStaff(principal)) return true;` — harness exit 2 |
| CANDIDATE Branch/SHA | `cursor/atlas-security-patch-od005` @ `0bbfd87` |
| CANDIDATE Status | **FIXED_REVALIDATED** |
| CANDIDATE Evidence | Staff short-circuit absent; `return entitledClientCodes(principal).includes(code)` — harness exit 0 |
| Reproduction (live) | Staff entitled only to ACCG01 lists foreign opportunities |
| Impact | Cross-client CRM opportunity disclosure |
| Recommended remediation | Deploy OD-005 Hub patch (owner-gated) |
| Required regression test | Staff A cannot list/get B opportunities |

### ATLAS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Atlas Hub (opportunity PATCH) |
| LIVE Status @ `940a484` | **OPEN** |
| CANDIDATE Status @ `0bbfd87` | **FIXED_REVALIDATED** |
| Evidence | Same `canSeeOpportunity` / `authorizeOpportunity` entitlement path as 01; staff short-circuit removed on candidate |
| Impact | Foreign Won/Lost mutations |
| Recommended remediation | Deploy OD-005 |
| Required regression test | Staff A cannot patch client B opportunity |

### ATLAS-RT-20260820-03
| Field | Value |
|-------|-------|
| System | Atlas Plaid API |
| LIVE Status @ `940a484` | **OPEN** |
| LIVE Evidence | `middleware/auth.ts` header-only `x-atlas-user-id` (no `jwtVerify`) |
| CANDIDATE Status @ `0bbfd87` | **FIXED_REVALIDATED** |
| CANDIDATE Evidence | `jwtVerify` + `requireVerifiedPrincipal` + `missing_bearer`; `npm test` ATLAS-03 case PASS |
| Impact | Bank connection isolation collapse if reachable |
| Recommended remediation | Deploy OD-005 Plaid gate |
| Required regression test | Missing Bearer → 401 |

### XSYS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Atlas website intake (`/api/website/leads`) |
| LIVE Status @ `940a484` | **OPEN** |
| LIVE Evidence | `http.ts`: "Auth is x-website-intake-key only" |
| CANDIDATE Status @ `0bbfd87` | **FIXED_REVALIDATED** |
| CANDIDATE Evidence | `intakeAuth.ts` `verifyWebsiteIntakeSignedRequest` — key + key-id + timestamp + HMAC-SHA256(`${timestamp}.${rawBody}`); `http.ts` uses signed verify; tests: 401 without signature |
| Impact | Key holder forges leads without body authenticity |
| Recommended remediation | Deploy OD-005 intake auth |
| Required regression test | Valid key + invalid signature → 401 |

### XSYS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Atlas website lead idempotency |
| LIVE Status @ `940a484` | **OPEN** |
| LIVE Evidence | `resolveWebsiteLeadIdempotencyKey` returns any `fullPayload.idempotencyKey` unbound |
| CANDIDATE Status @ `0bbfd87` | **FIXED_REVALIDATED** |
| CANDIDATE Evidence | `assertIdempotencyKeyBoundToSource` + `IDEMPOTENCY_PREFIX_MISMATCH` 409; Website+`eva|` rejected in unit + route tests |
| Impact | Cross-system lead overwrite via colliding keys |
| Recommended remediation | Deploy OD-005 prefix binding |
| Required regression test | Website type + `eva|` key → 409 |

---

## Candidate rollup @ `0bbfd87`

| Metric | Value |
|--------|-------|
| Candidate P0 open | **0** |
| Candidate P1 open | **0** |
| Live Hub P0 open | **5** (unchanged — do not count candidate closes as live) |
| Prior incomplete tip `bb7edae` | **STALE_SUPERSEDED** for XSYS scope |

**Do not request deploy in this run.** Owner-gated OD-005 authorization remains required.

---

## TESTS (independent)

| Suite | Command | Result |
|-------|---------|--------|
| D21 dual-surface harness | `node scripts/red-team/check-d21-od005-complete.mjs --od005 … --hub …` | **PASS** exit 0 (candidate fixed; live open=5) |
| Opportunity staff bypass | `check-opportunity-staff-bypass.mjs` @ candidate / Hub | exit **0** / **2** |
| Website leads | `npx tsx --test tests/hub-website-leads.test.ts` @ `0bbfd87` | **PASS 9/9** |
| Plaid | `npm test` in `apps/atlas-plaid-api` @ `0bbfd87` | **PASS 6/6** |
| Legacy D15 harness | `check-d15-od005.mjs --od005 …` | exit **0** (ATLAS+XSYS now fixed on tip) |

---

## PREMIUM QA

**N/A** — findings train; no product UI.

---

## COMPLETION ATTESTATION

- LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED: **21**  
- Dual-surface SHA-tied statuses published: **YES**  
- Candidate P0=0 and P1=0 @ `0bbfd87`: **YES** (stated; no deploy requested)  
- Live production P0 remains **5**  
- Production deploy: **NONE**  
- Frozen live Hub/Elite not mutated: **YES**
