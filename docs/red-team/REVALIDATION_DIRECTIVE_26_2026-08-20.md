# Revalidation — Orchestrator Directive 26 (2026-08-20)

**Train:** red-team  
**Directive:** 26  
**Published UTC:** 2026-08-20T16:26:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `b0dfd71d9f972203bda51f556ab61f631c5d8481`  
**BASED ON RUN ID:** `run-b434439c-dff0-43d5-91c9-8f47083d4737`

**Scope:** Independent Copilot revalidation of NEW tip after jose middleware fix. GCC `8d757cf` and OD-005 `9e5d10a` **not** retested (cite D25 / D23).

**Target:** `hvcg-agent-copilot` branch `cursor/copilot-production-completion` @ exact SHA `2f0270228cdaf1dceed51a52a62200ffde07a9e0` (matches `origin` tip; read/test only). Material fix: `600403b`.

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| `npm test` | **PASS** exit **0** — **37/37** |
| `tests/security-rt-revalidation.test.ts` | **PASS** exit **0** — **7/7** (RT-01/02/03 coverage incl. assessments non-public) |
| `npm run build` | **PASS** exit **0** |
| jose middleware fail-closed probe | **PASS** (`JOSE_FAILCLOSED_PASS`) |
| `/api/assessments` public | **false** (middleware + session allowlists) |
| `observationOnly=true` / `liveDispatch=false` / `productionClientDataAllowed=false` | **PASS** (source + suite) |
| COPILOT-RT-01/02/03/11 @ `2f02702` | **FIXED_REVALIDATED** |
| Copilot SECURITY_CERTIFIED | **PASS** @ `2f02702` |
| D25 middleware delta (`600403b` vs `19a200e`) | jose verify swap; fail-closed retained; no auth weaken / assessment public / live dispatch |
| New P0/P1 on jose path | **0** |
| GCC SECURITY_CERTIFIED (D25 cite) | **PASS** @ `8d757cf` (not retested) |
| OD-005 REGRESSION (D23 cite) | **PASS** @ `9e5d10a` (not retested) |
| AUTHORIZE PRODUCTION / deploy | **NO** |
| Live Production P0 | **5 OPEN** |
| Copilot Premium | **N/A** — product claim; not marked PASS by RT |

---

## Commands (exact SHA `2f02702`)

| Command | Exit | Evidence |
|---------|------|----------|
| `npm ci` | **0** | worktree `/tmp/rt-d26/copilot` |
| `npx vitest run tests/security-rt-revalidation.test.ts` | **0** | 7 passed — `directive26_copilot_security_rt.txt` |
| `npm test` | **0** | 6 files / **37** tests — `directive26_copilot_npm_test.txt` |
| `npm run build` | **0** | Next build + middleware 40.2 kB — `directive26_copilot_build.txt` |
| Independent jose fail-closed probe | **0** | `directive26_copilot_jose_failclosed.txt` |

### Security suite mapping

| Finding | Covered by | Result |
|---------|------------|--------|
| COPILOT-RT-01 | public allowlist excludes assessments; invalid/missing tokens fail closed | **ok** |
| COPILOT-RT-02 | session binds assessment; no default tenant; concurrent starts isolated; distinct workspace files | **ok** |
| COPILOT-RT-03 | non-admin cannot assume admin; commercial gates | **ok** |
| COPILOT-RT-11 | `/api/assessments` not public (same suite + middleware/source inspect) | **ok** |

---

## Source inspect — D25 auth delta (`600403b` vs `19a200e`)

Diff limited to `src/middleware.ts` (+ lead-handoff test in same commit):

| Change | Assessment |
|--------|------------|
| Custom Web Crypto HMAC verify → `jose.jwtVerify(..., { algorithms: ["HS256"] })` | Aligns Edge middleware with session signer (`session.ts` already jose) |
| Missing/invalid/incomplete/expired → `null` → redirect login / API **401** | **Fail-closed retained** |
| Required claims still: `userId`, `organizationId`, `assessmentId`, `workspaceId` | Unchanged |
| `PUBLIC_API_PREFIXES` | Unchanged; **no** `/api/assessments` |
| Admin role gate on `/admin` | Unchanged |
| Live dispatch / observation governance | **Not** thawed in this delta |

Independent probe: missing, forged, incomplete claims, expired → null; valid HS256 with full claims → accepted (`JOSE_FAILCLOSED_PASS`).

Artifacts: `directive26_copilot_middleware_delta.txt`, `directive26_copilot_middleware_source.txt`, `directive26_copilot_flags_and_public.txt`.

---

## Dual-surface / citation

| Surface | Status |
|---------|--------|
| Live Hub `940a484` ATLAS-01/02/03 + XSYS-01/02 | **OPEN** ×5 |
| OD-005 `9e5d10a` | FIXED_REVALIDATED; D23 **REGRESSION=PASS** (cited) |
| GCC `8d757cf` | D25 **SECURITY_CERTIFIED=PASS** (cited) |
| COPILOT-RT-01/02/03/11 @ `2f02702` | **FIXED_REVALIDATED** |
| Prior Copilot tip `19a200e` | STALE_SUPERSEDED for SECURITY_CERTIFIED gate (middleware path changed) |

Artifacts: `docs/red-team/artifacts/directive26_copilot_*.txt`
