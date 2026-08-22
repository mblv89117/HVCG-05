# P0 Tip Revalidation — 2026-08-20T0428Z

**Directive consumed:** `ORCHESTRATOR_REPORT_2026-08-20T0418Z` + `trains/F-platform-red-team.md`  
**Orchestrator SHA:** `795d515`  
**Method:** Source probes on fetched tips (no destructive production actions)

## Tips under test

| System | Branch | SHA |
|--------|--------|-----|
| Atlas freeze tip | `cursor/atlas-hv-completion-52d1` | `2a5a605` |
| Atlas P2 | `cursor/atlas-search-performance-p2` | `66b77d2` |
| Integration | `cursor/platform-integration-contracts` | `8fc711f` |
| GTM | `cursor/360-gtm-agent-system` | `43f9305` |
| GCC | `cursor/gcc-client-value-os` | `78cb5d2` |
| Copilot | `cursor/copilot-production-completion` | `7e63a6d` |

## Results

| ID | Prior SHA | New tip | Result | Notes |
|----|-----------|---------|--------|-------|
| ATLAS-RT-01 | 940a484 / 2a5a605 | 2a5a605, 66b77d2, 8fc711f | **STILL OPEN** | Staff short-circuit present; P2 did not fix IDOR |
| ATLAS-RT-02 | 2a5a605 | same | **STILL OPEN** | Same authz path |
| ATLAS-RT-03 | 2a5a605 | 2a5a605, 66b77d2 | **STILL OPEN** | Plaid still header-only; no `jwtVerify` |
| GTM-RT-01 | e585d0f | **43f9305** | **STILL OPEN** | `secrets.some(...)` unbound across offices |
| GTM-RT-02 | e585d0f | 43f9305 | **STILL OPEN (P1)** | Publisher gate still fail-open when approval/Guardian absent |
| GCC-RT-01 | 62f98cc | **78cb5d2** | **STILL OPEN** | `schema.sql` + `setup.sql` COALESCE → `org-apex`; metadata role trusted |
| GCC-RT-02 | 62f98cc | **78cb5d2** | **STILL OPEN** | Profile UPDATE policies lack column WITH CHECK |
| GCC-RT-03 | 62f98cc | **78cb5d2** | **STILL OPEN** | QBO `state` still unsigned base64url; callback no session bind |
| COPILOT-RT-01 | 51f1cbf | **7e63a6d** | **PARTIAL CLOSE** | Middleware + route session guards added; residual: `/api/assessments` public prefix + unauth `start` |
| COPILOT-RT-02 | 51f1cbf | **7e63a6d** | **STILL OPEN** | Global `data/store.json`; `start` still `writeStore` replaces workspace |
| COPILOT-RT-03 | 51f1cbf | **7e63a6d** | **CLOSED on tip** | Admin review/pricing require session + `hvcg_admin`/`hvcg_consultant` |
| XSYS-RT-01 | 2a5a605 | 2a5a605 + Integration docs | **STILL OPEN** | Intake key only; Integration docs still document key auth, not body HMAC |
| XSYS-RT-02 | 2a5a605 | 2a5a605 | **STILL OPEN** | Prefix binding not enforced (not re-probed line-by-line this pass; no tip claim of fix) |

## New residual finding

### COPILOT-RT-20260820-11 — Assessments public middleware prefix + unauth start wipe
- **severity:** P1 (sandbox-uat classified by orchestrator CC-008; still serious if multi-tenant process shared)
- **branch/SHA:** `cursor/copilot-production-completion` / `7e63a6d`
- **evidence:** `PUBLIC_API_PREFIXES` includes `/api/assessments`; `action=start` issues session without prior auth and replaces shared store
- **impact:** Session bootstrap OK for UAT; combined with shared store enables cross-session wipe (amplifies RT-02)
- **status:** open
- **supersedes aspect of:** COPILOT-RT-01 blanket claim → narrowed

## Closed this pass

| ID | Tip | Reason |
|----|-----|--------|
| COPILOT-RT-03 | `7e63a6d` | Unauthenticated admin approve/pricing no longer possible via route |

## Count delta

| | First catalog | After tip revalidation |
|--|---------------|------------------------|
| P0 | 11 | **9** (closed COPILOT-03; narrowed COPILOT-01 out of P0 into residual P1 + RT-02 remains P0) |
| P1 | 18 | **19** (+ COPILOT-11) |
| P2 | 14 | 14 |

**Release gate:** Still **FAIL** (P0>0, P1>0). No production candidate may advance.

## Conflicts / fail-safe

- OD-005 Atlas security patch: RT documents requirement; does **not** implement Hub patches on product branches (release boundary + frozen Atlas rules).
- No ACCG01 writes; no live outbound; no production permission changes.
