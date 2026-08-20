# Revalidation — Orchestrator Directive 24 (2026-08-20)

**Train:** red-team  
**Directive:** 24  
**Published UTC:** 2026-08-20T15:52:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `eb77e53a3e5636740fb11f11d8f0aee72fe3ff44`  
**BASED ON RUN ID:** `run-f4eea81d-e7b1-405f-9913-56905040c2fe`

**Scope:** Independent GCC revalidation only. OD-005 / Hub D21–D23 probes **not** re-run. Cite D23 `REGRESSION=PASS` @ `9e5d10a`. GTM / Revenue / Copilot / Integration SoT meaning **not** retested.

**Target:** `growth-command-center` branch `cursor/gcc-client-value-os` @ exact SHA `32e923cb836741a9569b58841b51ceec429f56b4` (read/test; branch not mutated).

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| GCC-RT-01/02/03/05/06/07 @ `32e923c` | **FIXED_REVALIDATED** (`test:security` 6/6 exit 0) |
| `fixture:cvos` | **PASS** (`FIXTURE_PATH_PASS`; see assertions) |
| `npm test` | **PASS** (exit 0; isolation 5 + handoff 3 + cvos 8 + security 6) |
| `npm run typecheck` | **FAIL** exit **2** (new D25 `scripts/fixture-synthetic-cvos-path.ts` only) |
| GCC SECURITY_CERTIFIED | **PARTIAL** (security + train tests + fixture PASS; typecheck FAIL) |
| OD-005 certified REGRESSION (D23 cite) | **PASS** @ `9e5d10a` (not retested) |
| New P0/P1 on fixture path | **0** |
| AUTHORIZE PRODUCTION / deploy | **NO** |
| Live Production P0 | **5 OPEN** |

---

## Commands (exact SHA `32e923c`)

| Command | Exit | Evidence |
|---------|------|----------|
| `npm ci` | **0** | deps installed in worktree |
| `npm run test:security` | **0** | **6 pass / 0 fail** — artifact `directive24_gcc_test_security.txt` |
| `npm test` | **0** | suites: isolation 5, handoff 3, cvos 8, security 6 — `directive24_gcc_npm_test.txt` |
| `npm run typecheck` | **2** | TS5097 `.ts` import extensions ×5; TS2339 `issues` on `never` — `directive24_gcc_typecheck.txt` |
| `npm run fixture:cvos` | **0** | prints `FIXTURE_PATH_PASS` — `directive24_gcc_fixture_cvos.txt` |

Worktree: `/tmp/rt-d24/gcc` @ `32e923cb836741a9569b58841b51ceec429f56b4`.

### Security subtests (all ok)

| ID | Subtest | Result |
|----|---------|--------|
| GCC-RT-01 | signup trigger never COALESCE to org-apex / trusts metadata | **ok** |
| GCC-RT-02 | profile update freezes role and organization_id | **ok** |
| GCC-RT-03 | signed OAuth state rejects tampering and expiry | **ok** |
| GCC-RT-05 | tenant/dashboard/export derive org from session | **ok** |
| GCC-RT-06 | sales lacks financials:read and reports:export | **ok** |
| GCC-RT-07 | unsigned Atlas handoff HMAC rejected; valid accepted | **ok** |

---

## `fixture:cvos` independent assertions

Executable output (exit 0):

```
✓ activation_handoff: … autoProvisionAccess=false
✓ client_context: org=org-syn01 …
✓ value_signals: … canonical=gcc-value-signal.v1
FIXTURE_PATH_PASS
```

| Check | Result |
|-------|--------|
| `activation.governance.autoProvisionAccess == false` | **PASS** (assert + log) |
| mapped org ≠ `org-apex` | **PASS** (`org=org-syn01`; assert.notEqual) |
| `SYNTHETIC_ORG_ID` / `SYN01` only | **PASS** (`org-syn01` / `SYN01` from `src/lib/cvos/synthetic.ts`) |
| `liveAtlasDispatch == false` | **PASS** (artifact JSON + source literal) |
| `liveSupabaseMigration == false` | **PASS** (artifact JSON + source literal) |
| signals validate as `gcc-value-signal.v1` | **PASS** (`assertGccValueSignal`; sample schema `gcc-value-signal.v1`) |

### Source inspect (`scripts/fixture-synthetic-cvos-path.ts`)

| Risk | Observation |
|------|-------------|
| Tenant/org spoof | Uses `SYNTHETIC_ORG_ID`; asserts ≠ `org-apex` |
| Live network / real-client I/O | None — local imports only; writes local artifact JSON under `/opt/cursor/artifacts/` |
| Entitlement provisioning | Asserts `autoProvisionAccess=false`; no provision call |
| New P0/P1 | **None** |

Note: `liveAtlasDispatch` / `liveSupabaseMigration` are hardcoded `false` in the fixture artifact payload (not runtime feature flags). Acceptable for path proof; no live dispatch observed.

---

## Typecheck residual (non-security; blocks SECURITY_CERTIFIED=PASS)

`tsc --noEmit` fails solely on the new D25 script:

- TS5097: imports end with `.ts` while `allowImportingTsExtensions` unset
- TS2339: `mapped.issues` after `assert.equal(mapped.ok, true)` narrows to `never`

Runtime `tsx` path still **PASS**. Product train owns the fix. RT did not implement.

---

## Dual-surface / citation (unchanged this cycle)

| Surface | Status |
|---------|--------|
| Live Hub `940a484` ATLAS-01/02/03 + XSYS-01/02 | **OPEN** ×5 |
| OD-005 candidate `9e5d10a` | FIXED_REVALIDATED; D23 **REGRESSION=PASS** (cited) |
| GCC-RT-01/02/03/05/06/07 @ `32e923c` | **FIXED_REVALIDATED** |
| GCC Premium | **N/A** — product claim; not marked PASS by RT |

Artifacts: `docs/red-team/artifacts/directive24_gcc_*.txt`
