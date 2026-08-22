# Independent Red Team Revalidation — Directive 10

**Directive version:** 10  
**Train:** red-team  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Based on worker SHA:** `0386a53b9b82fd6e6cd351c3348cdfb3f83724c1`  
**Previous run:** `run-fb85119f-9632-4808-8d1a-f2bd09deffc4`  
**Published UTC:** 2026-08-20T05:35:00Z  
**Method:** `git fetch --prune` + source reproduction on exact tips. No production deploy. No ACCG01 writes. No destructive real-client tests. Integration train not mutated.

---

## CURRENT SHAS TESTED

| System | Branch | Exact SHA | Expected match |
|--------|--------|-----------|----------------|
| GTM | `cursor/360-gtm-agent-system` | `5bd8204dbf2fbb25e78aff7540f26c787604d77c` | YES |
| GCC | `cursor/gcc-client-value-os` | `b02c1322d5e18ef8bc6699b202515e9137cde6a1` | YES |
| Copilot | `cursor/copilot-production-completion` | `aacc09c4fe7d67d453d4ad6111f8db0cf38ebf12` | YES |
| Integration | `cursor/platform-integration-contracts` | `773b5101032ccd5218d5563d2177c31722ecf575` | YES (read-only) |
| Atlas Hub frozen | (baseline) | `940a4849577ad5356da86850e2eccdbf3fe4e86b` | pinned |
| Atlas Elite frozen | (baseline) | `75d0c59d564ae249787b9b1f93755a80d7a73ef5` | pinned |
| Atlas tip (Plaid surface) | `cursor/atlas-hv-completion-52d1` | `2a5a605` | inspected |

Runtime remote truth matched all expected candidate SHAs.

---

## COUNT ROLLUP

| Metric | Value |
|--------|-------|
| PREVIOUS P0 COUNT | **9** (0428Z catalog) |
| P0 STILL OPEN | **5** (+ **XSYS-02** still open → **6** P0 open total) |
| P0 CLOSED | **4** |
| PREVIOUS P1 COUNT | **19** |
| P1 STILL OPEN (revalidated subset + residual) | see table — **GTM-03/04, GCC-05/06/07** remain open/partial |
| P1 CLOSED (this pass) | **2** (GTM-02, COPILOT-11) + COPILOT-01 original claim closed |
| NEW P0 | **0** |
| NEW P1 | **0** |
| P2 | **14+** prior debt; plus dual-schema residual note (not inflated) |

**Release gate for new production candidates:** still **FAIL** (P0>0, P1>0).

---

## P0 RECLASSIFICATION

| Finding ID | System | Branch | Exact SHA | Severity | Status | Evidence (summary) |
|---|---|---|---|---|---|---|
| ATLAS-RT-20260820-01 | Atlas | Hub baseline | `940a484` | P0 | **OPEN** | `canSeeOpportunity` still `if (isInternalStaff) return true` — harness exit 2 |
| ATLAS-RT-20260820-02 | Atlas | Hub baseline | `940a484` | P0 | **OPEN** | Same staff bypass feeds `patchOpportunity` |
| ATLAS-RT-20260820-03 | Atlas | Hub + tip | `940a484` / `2a5a605` | P0 | **OPEN** | Plaid `requirePrincipal` still header-only; no `jwtVerify` |
| GTM-RT-20260820-01 | GTM | `360-gtm-agent-system` | `5bd8204` | P0 | **FIXED** | `matchCallRailSignature` binds office secrets; ingest calls `assertCallRailSecretOfficeBinding`; unit tests present in tip |
| GCC-RT-20260820-01 | GCC | `gcc-client-value-os` | `b02c132` | P0 | **FIXED** | `gcc_handle_new_user` / `handle_new_user` insert `role='staff'`, `organization_id=NULL` — no Apex COALESCE |
| GCC-RT-20260820-02 | GCC | `gcc-client-value-os` | `b02c132` | P0 | **FIXED** | RLS WITH CHECK locks role/org + `gcc_prevent_profile_privilege_escalation` trigger + migration |
| GCC-RT-20260820-03 | GCC | `gcc-client-value-os` | `b02c132` | P0 | **FIXED** | `createSignedQuickBooksState` / `verifySignedQuickBooksState`; callback requires session |
| COPILOT-RT-20260820-01 | Copilot | `copilot-production-completion` | `aacc09c` | was P0/P1 | **FIXED** | Assessments require session; start moved off public assessments path |
| COPILOT-RT-20260820-02 | Copilot | `copilot-production-completion` | `aacc09c` | P0 | **OPEN** | Global `data/store.json`; `/api/auth/start` still `writeStore` replaces workspace |
| XSYS-RT-20260820-01 | Integration/Hub | Hub + contracts | `940a484` / `773b510` | P0 | **OPEN** | Hub intake key only; Integration documents HMAC requirement but does not patch Hub (correct freeze fail-safe) |
| XSYS-RT-20260820-02 | Atlas Hub | Hub | `940a484` | P0 | **OPEN** | `resolveWebsiteLeadIdempotencyKey` still prefers any `fullPayload.idempotencyKey` without prefix↔source binding |

### Atlas status note (fail-safe)

Frozen production current-scope certification remains **PASS (P0=0/P1=0 for certified scope)** per orchestrator. Independent RT does **not** reopen that live-cert decision. ATLAS-RT-01/02/03 remain **OPEN remediation backlog** for OD-005 / future Hub releases — reproducible in source at `940a484`.

---

## P1 RECLASSIFICATION (minimum set)

| Finding ID | SHA | Status | Notes |
|---|---|---|---|
| GTM-RT-20260820-02 | `5bd8204` | **FIXED** | Publisher gate requires `approval_id` + `guardian_result_id`; missing → `approval_missing` / `guardian_missing` |
| GTM-RT-20260820-03 | `5bd8204` | **PARTIALLY FIXED** | Publisher uses DB `isEffectivelyPaused`; atlas-handoff still hard-requires `EMERGENCY_PAUSE_GLOBAL` — dual SoT remains |
| GTM-RT-20260820-04 | `5bd8204` | **REQUIRES INTEGRATION TEST** | InquiryForm now emits `360-atlas-lead.v1` / `atlas-lead-intake.v1` governance fields; still posts to external HVCG intake URL — Atlas receive enforcement not proven here |
| GCC-RT-20260820-05 | `b02c132` | **PARTIALLY FIXED** | `selectOrganizationId` + mismatch deny present; browser may still supply org id (compared server-side) |
| GCC-RT-20260820-06 | `b02c132` | **OPEN** | `/api/tenant` still no `requirePermission(..., "financials:read")`; `sales` lacks that permission but can load full tenant payload |
| GCC-RT-20260820-07 | `b02c132` | **OPEN** | Atlas activation handoff still `requirePlatformAdminAccess` only — no HMAC/mTLS service attestation |
| COPILOT-RT-20260820-11 | `aacc09c` | **FIXED** | `/api/assessments` removed from public prefixes; unauth start → `START_MOVED`; public entry is `/api/auth/start` |

---

## SYSTEM STATUS

### GTM STATUS — IMPROVED / PARTIAL
- Live dispatch / paid ads / email / SMS defaults **OFF** (confirmed in flags).
- CallRail webhook default **false**.
- P0 CallRail unbound secret: **FIXED**.
- Publisher fail-open: **FIXED**.
- Residual: dual pause SoT; InquiryForm→Atlas receive needs integration proof; suppression/frequency still largely absent (design debt, not re-inflated to P0 while outbound OFF).

### GCC STATUS — IMPROVED / PARTIAL
- P0 signup Apex default, profile escalation, QBO unsigned state: **FIXED** on tip (+ migration).
- Residual P1: tenant financials RBAC parity; handoff authenticity; browser org id pattern; `schema.sql` alternate `profiles` update policy still weak if that schema path is used (**P2 residual**, not inflated).

### COPILOT STATUS — IMPROVED / PARTIAL
- Auth boundaries substantially hardened vs first catalog.
- COPILOT-RT-01/11 **FIXED**; admin auth remains required.
- **P0 remaining:** shared process store wipe via `/api/auth/start`.
- Sandbox/UAT posture; `productionClientDataAllowed: false`.

### INTEGRATION STATUS — CONTRACTS STRONG / HUB AUTH THIN
- Tip `773b510` documents XSYS-RT-01 fail-safe and expanded idempotency registry.
- Independent review: ID confusion / spoofing / schema / replay expectations are contract-tested in harness docs.
- Runtime Hub authenticity (HMAC + prefix bind) **not** closed — correctly deferred to Atlas patch train.
- This RT pass did **not** mutate Integration.

### ATLAS STATUS — FROZEN LIVE-CERT PASS; RT BACKLOG OPEN
- Hub `940a484` / Elite `75d0c59` current-scope cert **PASS**.
- Independent source defects ATLAS-RT-01/02/03 **OPEN** for security-patch train (OD-005), not a production rollback recommendation from this directive alone.

---

## DETAILED FINDING CARDS (still-open P0s)

### ATLAS-RT-20260820-01
- **System:** Atlas · **Branch:** frozen Hub · **SHA:** `940a484`
- **Severity:** P0 · **Status:** OPEN
- **Evidence:** `apps/atlas-integration-api/src/pm/sharepoint/repository.ts` staff short-circuit; harness `OPEN_DEFECT`
- **Reproduction:** `node scripts/red-team/check-opportunity-staff-bypass.mjs <hub-checkout>` → exit 2
- **Impact:** Cross-client opportunity disclosure for any HVCG Team Member
- **Remediation:** Entitlement intersection for all principals (OD-005 patch train)
- **Regression test:** Staff entitled to A cannot list/get B opportunities

### ATLAS-RT-20260820-02
- **System:** Atlas · **SHA:** `940a484` · **Severity:** P0 · **Status:** OPEN
- **Evidence/Reproduction:** Same authz path as 01 for PATCH Won/Lost
- **Impact:** Cross-client pipeline integrity failure
- **Remediation/Test:** ClientCode gate before patch; staff A cannot patch B

### ATLAS-RT-20260820-03
- **System:** Atlas · **SHA:** `940a484` / `2a5a605` · **Severity:** P0 · **Status:** OPEN
- **Evidence:** Plaid `parsePrincipal(headers)` only
- **Reproduction:** Source shows no JWT verify under `PLAID_REQUIRE_AUTH`
- **Impact:** Header-spoofable bank data isolation collapse if API reachable
- **Remediation:** Hub-style JWT + server entitlements
- **Regression test:** Missing/invalid Bearer → 401

### COPILOT-RT-20260820-02
- **System:** Copilot · **Branch:** `cursor/copilot-production-completion` · **SHA:** `aacc09c`
- **Severity:** P0 · **Status:** OPEN
- **Evidence:** `src/lib/store/index.ts` `STORE_FILE=data/store.json`; `src/app/api/auth/start/route.ts` calls `writeStore(store)`
- **Reproduction:** Two clients POST `/api/auth/start` on same process → second wipes first workspace
- **Impact:** Cross-session disclosure/destruction
- **Remediation:** Per-session durable store; never global replace
- **Regression test:** Concurrent starts isolate data

### XSYS-RT-20260820-01
- **System:** Atlas Hub / Integration docs · **SHA:** Hub `940a484`, contracts `773b510`
- **Severity:** P0 · **Status:** OPEN
- **Evidence:** `website/http.ts` intake key only; Integration `SECURITY_CONTRACT.md` documents required HMAC but forbids Hub patch on contracts branch
- **Reproduction:** Source review; no body signature verifier in Hub website path
- **Impact:** Key holder can forge leads
- **Remediation:** Atlas security-patch train body HMAC
- **Regression test:** Valid key + invalid body sig → 401 · **Requires:** integration/live harness when patch lands

### XSYS-RT-20260820-02
- **System:** Atlas Hub · **SHA:** `940a484` · **Severity:** P0 · **Status:** OPEN
- **Evidence:** `resolveWebsiteLeadIdempotencyKey` returns any `fullPayload.idempotencyKey`
- **Reproduction:** Source: no prefix↔`submissionType` assert before upsert
- **Impact:** Cross-system idempotency collision / overwrite
- **Remediation:** Enforce prefix binding; foreign prefix → 409
- **Regression test:** `360-Growth` + `eva|…` key rejected

---

## GTM SAFETY CONFIRMATIONS

| Control | Result @ `5bd8204` |
|---------|---------------------|
| Live publish | OFF default |
| Paid ads | OFF default |
| Email/SMS send | OFF default |
| CallRail webhook | OFF default |
| Dry-run publish | default true |
| Outbound engineering | flags + pause gated; publisher fail-closed on approval/Guardian |

---

## RESPONSIBLE PRODUCT TRAINS

| Open items | Owner train |
|------------|-------------|
| ATLAS-RT-01/02/03, XSYS-01/02 (Hub runtime) | Atlas security-patch (OD-005) |
| COPILOT-RT-02 | Copilot |
| GTM-RT-03/04 residuals | GTM (+ Integration/Atlas for receive proof) |
| GCC-RT-05/06/07 | GCC |
| Contract documentation only | Integration (no Hub mutation) |

---

## RETEST REQUIRED

1. After Atlas OD-005 patch tip exists — re-run ATLAS-01/02/03 + XSYS-01/02 harnesses  
2. After Copilot per-session store — re-run COPILOT-02 concurrency  
3. GTM-04 — end-to-end InquiryForm → Atlas receive with contract enforcement (integration test)  
4. GCC — confirm production applies `migration-rt-20260820-profile-isolation.sql`; retire/fix weak `schema.sql` profile UPDATE  
5. Do not trust product self-scores without the above reproductions  

---

## COMPLETION ATTESTATION

- Independent revalidation report published with exact SHAs tested: **YES**  
- Findings reclassified with evidence: **YES**  
- Status artifact updated: **YES** (this checkpoint)  
- Production deploy: **NONE**  
- LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED: **10**
