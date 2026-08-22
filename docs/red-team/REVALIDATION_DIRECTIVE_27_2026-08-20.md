# Revalidation — Orchestrator Directive 27 (2026-08-20)

**Train:** red-team  
**Directive:** 27  
**Published UTC:** 2026-08-20T20:40:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `15d9f3248d7ffb399b6ef5684ea941cf8f1b76d4`  
**BASED ON RUN ID:** `run-146f77d7-4ff9-4de0-8fc5-380aa00f8031`

**Scope:** Independent Copilot revalidation of NEW tip after pre-call / enrichment delta. Do **not** retest identical Copilot `2f02702`, GCC `8d757cf`, OD-005 `9e5d10a`, Revenue `85def0e`, or GTM nurture-only tip.

**Target:** `hvcg-agent-copilot` / `cursor/copilot-production-completion` @ exact SHA `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` (matches origin tip; read/test only). Material feat: `0c62792`.

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| `npm test` | **PASS** exit **0** — **44/44** (was 37 @ `2f02702`) |
| `security-rt-revalidation` | **PASS** exit **0** — **7/7** |
| `pre-call-brief` suite | **PASS** exit **0** — **7/7** (incl. assessments GET/POST 401) |
| Independent unauth 401 probe (assessments + enrichment) | **PASS** (`UNAUTH_401_AND_FAILCLOSED_PASS`) |
| jose / session fail-closed | **PASS** (missing + forged → null) |
| Enrichment tenant spoof (foreign assessment/org) | **PASS** → **403** (`TENANT_CONTEXT_REQUIRED`) |
| `observationOnly` / `liveDispatch` / `commercialAuthority` | **true** / **false** / **`revenue-os`** |
| `productionClientDataAllowed` | **false** (Atlas handoff schema/literals; suite) |
| New P0/P1 on enrichment path | **0** |
| COPILOT-RT-01/02/03/11 @ `fe3db75` | **FIXED_REVALIDATED** |
| Copilot SECURITY_CERTIFIED | **PASS** @ `fe3db75` |
| GCC / OD-005 (cited; not retested) | PASS / REGRESSION=PASS |
| AUTHORIZE PRODUCTION / deploy | **NO** |
| Live Production P0 | **5 OPEN** |
| Copilot Premium | **N/A** — not marked PASS by RT |

---

## Commands (exact SHA `fe3db75`)

| Command | Exit | Evidence |
|---------|------|----------|
| `npm ci` | **0** | `/tmp/rt-d27/copilot` |
| `npx vitest run tests/security-rt-revalidation.test.ts` | **0** | `directive27_copilot_security_rt.txt` |
| `npx vitest run tests/pre-call-brief.test.ts` | **0** | `directive27_copilot_pre_call_brief.txt` |
| `npm test` | **0** | 7 files / **44** tests — `directive27_copilot_npm_test.txt` |
| Independent unauth 401 + allowlist + jose probe | **0** | `directive27_copilot_unauth_401_probe.txt` |
| Enrichment tenant/governance probe | **0** | `directive27_copilot_enrichment_tenant_probe.txt` |

### Explicit 401 results (independent probe)

| Route | Method | Status | Code |
|-------|--------|--------|------|
| `/api/assessments` | GET | **401** | `UNAUTHENTICATED` |
| `/api/assessments` | POST | **401** | `UNAUTHENTICATED` |
| `/api/gtm/enrichment` | GET | **401** | `UNAUTHENTICATED` |
| `/api/gtm/enrichment` | POST | **401** | `UNAUTHENTICATED` |

`isPublicApiPath("/api/assessments")` = false · `isPublicApiPath("/api/gtm/enrichment")` = false.

---

## Findings table (this run)

| Finding ID | System | Branch | Exact SHA | Severity | Evidence | Reproduction | Impact | Remediation | Regression requirement | Status |
|------------|--------|--------|-----------|----------|----------|--------------|--------|-------------|------------------------|--------|
| COPILOT-RT-20260820-01 | Copilot | `cursor/copilot-production-completion` | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | P1→closed | security-rt + unauth probe; assessments/enrichment not public | Unauth GET/POST assessments & enrichment → 401 | Unauth API compromise | Keep allowlist narrow; jose verify | Unauth mutating protected APIs → 401 | **FIXED_REVALIDATED** |
| COPILOT-RT-20260820-02 | Copilot | same | `fe3db75` | P0→closed | security-rt concurrent workspace isolation | Two auth/start → distinct workspace files | Cross-session wipe | Per-workspace store | Concurrent starts isolated | **FIXED_REVALIDATED** |
| COPILOT-RT-20260820-03 | Copilot | same | `fe3db75` | P0→closed | security-rt role/commercial gates | Non-admin requireRole throws | Admin bypass | Keep role gates | Non-admin cannot assume admin | **FIXED_REVALIDATED** |
| COPILOT-RT-20260820-11 | Copilot | same | `fe3db75` | P1→closed | allowlist + assessments 401 tests | Unauth assessments not public | Bootstrap wipe amplification | Assessments off public prefixes | Assessments not public + 401 | **FIXED_REVALIDATED** |
| *(none new)* | Copilot enrichment | same | `fe3db75` | — | route requires session + `requireTenantContext`; spoof assess/org → 403; `commercialAuthority=revenue-os`; `liveDispatch=false` | Unauth enrichment; spoofed session assessment/org | Would be cross-tenant producer leak if open | N/A — holds | Enrichment 401 + tenant 403 | **NOT_REPRODUCIBLE** as defect (controls hold) |

Prior Copilot tip `2f02702` is **STALE_SUPERSEDED** for SECURITY_CERTIFIED gate (SHA moved; enrichment path added).

---

## Source inspect — enrichment delta (`0c62792` vs `2f02702`)

| Change | Assessment |
|--------|------------|
| `GET`/`POST` `/api/gtm/enrichment` | Still `readSessionFromRequest` → 401 if missing; then `requireTenantContext` |
| Response flags | `observationOnly: true`, `liveDispatch: false`, `commercialAuthority: "revenue-os"`, `commercialBinding: false` |
| `toIntegrationPreCallBrief` | Maps producer brief → Integration SoT `pre-call-brief.v1` without CRM ids / liveDispatch |
| Auth weakening / public prefix / live dispatch enablement | **Not observed** |

Artifacts: `directive27_copilot_enrichment_delta.txt`, `directive27_copilot_enrichment_source.txt`.

---

## Dual-surface / citation

| Surface | Status |
|---------|--------|
| Live Hub `940a484` ATLAS-01/02/03 + XSYS-01/02 | **OPEN** ×5 |
| OD-005 `9e5d10a` | FIXED_REVALIDATED; D23 **REGRESSION=PASS** (cited) |
| GCC `8d757cf` | D25 **SECURITY_CERTIFIED=PASS** (cited) |
| Copilot `fe3db75` | **SECURITY_CERTIFIED=PASS**; RT-01/02/03/11 **FIXED_REVALIDATED** |

Artifacts: `docs/red-team/artifacts/directive27_copilot_*.txt`
