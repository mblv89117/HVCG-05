# Revalidation — Orchestrator Directive 25 (2026-08-20)

**Train:** red-team  
**Directive:** 25  
**Published UTC:** 2026-08-20T16:22:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `ab0e17da2005330b3ef607517a093e254acd1351`  
**BASED ON RUN ID:** `run-fbfde3d2-0cbd-43ba-9b72-7b6acfa58a11`

**Scope:** Independent GCC revalidation of NEW tip after D26 typecheck fix. D24 @ `32e923c` not retested. OD-005 / Hub D21–D23 not retested. Cite D23 `REGRESSION=PASS` @ `9e5d10a`.

**Target:** `growth-command-center` branch `cursor/gcc-client-value-os` @ exact SHA `8d757cf68157a6054432de7ca57f8431731b2d64` (matches `origin` tip; read/test only). Fix commit in lineage: `430eea4`.

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — LIVE Production P0 = **5 OPEN**.

---

## Overall gates

| Gate | Result |
|------|--------|
| `npm run typecheck` | **PASS** exit **0** |
| `npm run test:security` | **PASS** **6/6** exit **0** |
| `npm test` | **PASS** exit **0** (isolation 5 + handoff 3 + cvos 8 + security 6) |
| `npm run fixture:cvos` | **PASS** exit **0** (`FIXTURE_PATH_PASS`) |
| GCC-RT-01/02/03/05/06/07 @ `8d757cf` | **FIXED_REVALIDATED** |
| GCC SECURITY_CERTIFIED | **PASS** @ `8d757cf` |
| D26 fixture delta vs `32e923c` | **typecheck-only** (no governance/HMAC/RBAC/dispatch/entitlement thaw) |
| New P0/P1 on fixture path | **0** |
| OD-005 REGRESSION (D23 cite) | **PASS** @ `9e5d10a` (not retested) |
| AUTHORIZE PRODUCTION / deploy | **NO** |
| Live Production P0 | **5 OPEN** |
| GCC Premium | **N/A** — product claim; not marked PASS by RT |

---

## Commands (exact SHA `8d757cf`)

| Command | Exit | Evidence |
|---------|------|----------|
| `npm ci` | **0** | worktree `/tmp/rt-d25/gcc` |
| `npm run typecheck` | **0** | `directive25_gcc_typecheck.txt` |
| `npm run test:security` | **0** | 6 pass / 0 fail — `directive25_gcc_test_security.txt` |
| `npm test` | **0** | `directive25_gcc_npm_test.txt` |
| `npm run fixture:cvos` | **0** | `directive25_gcc_fixture_cvos.txt` |

### Security subtests (all ok)

| ID | Result |
|----|--------|
| GCC-RT-01 | **ok** |
| GCC-RT-02 | **ok** |
| GCC-RT-03 | **ok** |
| GCC-RT-05 | **ok** |
| GCC-RT-06 | **ok** |
| GCC-RT-07 | **ok** |

---

## `fixture:cvos` independent assertions

Executable output:

```
✓ activation_handoff: … autoProvisionAccess=false
✓ client_context: org=org-syn01 …
✓ value_signals: … canonical=gcc-value-signal.v1
FIXTURE_PATH_PASS
```

Artifact JSON `/opt/cursor/artifacts/gcc_d26_synthetic_fixture_path.json`:

| Check | Result |
|-------|--------|
| `autoProvisionAccess == false` | **PASS** |
| org ≠ `org-apex` | **PASS** (`org-syn01`) |
| SYN01 / `org-syn01` | **PASS** |
| `liveAtlasDispatch == false` | **PASS** |
| `liveSupabaseMigration == false` | **PASS** |
| `gcc-value-signal.v1` | **PASS** |

---

## Source inspect — D26 delta only (`430eea4` vs `32e923c`)

Files changed `32e923c..430eea4`: **only** `scripts/fixture-synthetic-cvos-path.ts` (+ docs pins on tip after).

Delta substance:

1. Drop `.ts` suffixes on local imports (closes TS5097).
2. Remove `assert.equal(mapped.ok, true)` before `mapped.issues` access (closes TS2339 narrowing).
3. Rename artifact filename / directive field `25` → `26` (docs-only labeling).

**Not changed:** HMAC, RBAC, session org authority, OAuth state, autoProvisionAccess logic, dispatch flags, entitlement provisioning, org-apex guards, Integration SoT adapters.

Artifact: `docs/red-team/artifacts/directive25_gcc_fixture_delta.txt`

---

## Dual-surface / citation

| Surface | Status |
|---------|--------|
| Live Hub `940a484` ATLAS-01/02/03 + XSYS-01/02 | **OPEN** ×5 |
| OD-005 candidate `9e5d10a` | FIXED_REVALIDATED; D23 **REGRESSION=PASS** (cited) |
| GCC-RT-01/02/03/05/06/07 @ `8d757cf` | **FIXED_REVALIDATED** |
| Prior D24 tip `32e923c` | STALE_SUPERSEDED for SECURITY_CERTIFIED gate (typecheck residual closed on `8d757cf`) |

Artifacts: `docs/red-team/artifacts/directive25_gcc_*.txt`
