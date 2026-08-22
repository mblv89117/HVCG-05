# Live Hub Independent Validation — Orchestrator Directive 33 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 33  
**Status:** ISSUED — public-marker SHA gate (NOT a D32 clone)  
**Published UTC:** 2026-08-22T02:35:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `0e09aa630ad09f829dc9ef7a3a81c2a7e753c0a8`  
**PREVIOUS:** D32 `run-c0d16bda` CONSUMED=32 INHERIT=FAIL — **not replayed**  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`

**Acknowledge:** Directive **33** consumed. Public SHA marker is live. Azure ABSENT does not abort. No deploy/rollback. Elite `75d0c59` untouched. No ACCG01 mutation. No V3 secrets used. No auth bypass invented.

---

## THIS-POD INHERIT (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_CLIENT_ID | **ABSENT** |
| AZURE_CLIENT_SECRET | **ABSENT** |
| AZURE_TENANT_ID | **ABSENT** |
| AZURE_SUBSCRIPTION_ID | **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

Per D33: envVersion still `a86e2323` / AZURE_* ABSENT → **CONTINUE** (do not abort solely for Azure ABSENT).

Artifact: `docs/red-team/artifacts/directive33_this_pod_inherit.txt`

---

## PUBLIC SHA GATE

**Required live SHA:** `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26`  
**Live Hub:** `https://app-atlas-integration-hub.azurewebsites.net`  
**Note:** Marker-only Hub candidate — **not** a redeploy of `9e5d10a` / `698f7e92`.

| Marker | HTTP | Value | Match |
|--------|------|-------|-------|
| `GET /ATLAS_HUB_COMMIT.txt` | 200 text/plain | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |
| `GET /health` → `commit` | 200 | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |
| `GET /hub-build.json` → `gitSha` | 200 | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |

**SHA_GATE=PASS**

| /health field | Value |
|---------------|-------|
| ok | true |
| authRequired | true |
| insecureDevAuth | false |
| commit | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |

`hub-build.json` also reports `branch=cursor/hub-public-sha-marker-7a6b`, `builtAt=2026-08-22T02:29:49.0275541Z`, `source=file`.

Azure/Kudu/OneDeploy corroboration: **skipped** (optional; AZURE_* ABSENT).

---

## Fail-closed regression (live)

| Probe | Result |
|-------|--------|
| `GET /api/pm/opportunities` unauth | **401** Bearer missing |
| `GET /api/pm/search` unauth | **401** Bearer missing |
| `GET /api/pm/leads` unauth | **401** Bearer missing |
| `GET /api/pm/opportunities` forged JWT + `x-atlas-*` | **401** Invalid/expired Microsoft token |
| `PATCH /api/pm/opportunities/1` unauth | **401** |
| `PATCH /api/pm/opportunities/1` forged JWT | **401** |
| Staff-bypass harness `check-opportunity-staff-bypass.mjs` @ `64b56dc` | exit **0**; `staffShortCircuitPresent=false` |
| Synthetic fallback masking authz | **not observed** on fail-closed surfaces |

Artifact: `docs/red-team/artifacts/directive33_live_hub_probes.txt`

---

## Per-finding classification (live SHA `64b56dc`)

### ATLAS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Atlas Hub opportunities entitlement |
| Live SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` (public markers) |
| Evidence | Fail-closed 401; forged JWT+headers denied; source `canSeeOpportunity` uses `entitledClientCodes` only — staff short-circuit **ABSENT** (harness exit 0) |
| Established full reproducer | Staff JWT entitled only to one client listing/getting foreign opps — **not executed** (no RT staff JWT; do not invent bypass / ask Manny / use V3 secrets) |
| **Classification** | **INCONCLUSIVE** |

### ATLAS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Atlas Hub opportunity PATCH |
| Evidence | Unauth/forged PATCH → **401**; `patchOpportunity` goes through `authorizeOpportunity` → `canSeeOpportunity` (no staff all-see short-circuit) |
| Full foreign Won reproducer | **not executed** (no staff JWT) |
| **Classification** | **INCONCLUSIVE** |

### ATLAS-RT-20260820-03
| Field | Value |
|-------|-------|
| System | Atlas Plaid API |
| Evidence | Hub-host `/api/plaid/*` → **405** method_not_allowed (not served). Source `apps/atlas-plaid-api` still header-oriented (`requirePrincipal` / no `jwtVerify` in inspect). No separate Plaid base URL in RT env. |
| **Classification** | **INCONCLUSIVE** |

### XSYS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Hub `/api/website/leads` signed intake |
| Evidence | No key / Bearer-only / forged key+HMAC headers → **401** `Website intake key required.` Source includes HMAC verify path (`intakeAuth.ts` signature invalid). Valid-key + invalid-signature → signature invalid **not** live-executed (no `WEBSITE_INTAKE_KEY`) |
| **Classification** | **INCONCLUSIVE** |

### XSYS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Website lead idempotency prefix binding |
| Evidence | Cannot reach idempotency gate without intake auth. Source has `assertIdempotencyKeyBoundToSource`. Live 409 with `eva|` key **not** executed. |
| **Classification** | **INCONCLUSIVE** |

---

## Certification rollup (worker evidence only)

| Metric | Value |
|--------|-------|
| SHA_GATE | **PASS** |
| INHERIT | **FAIL** (Azure ABSENT; continued per D33) |
| LIVE_VALIDATION_ABORTED | **NO** |
| Findings VERIFIED_FIXED | **0** / 5 |
| Findings REPRODUCIBLE | **0** / 5 |
| Findings INCONCLUSIVE | **5** / 5 |
| LIVE_P0 | **5** (INCONCLUSIVE; not closable as 0) |
| LIVE_P1 | none newly opened this limited scope |
| LIVE_SECURITY_CERTIFIED | **NO** |
| Elite | out of scope / untouched |

**LIVE_SECURITY_CERTIFIED=NO** because not all five are VERIFIED_FIXED (staff JWT + intake key + Plaid host still required for full established reproducers). Fail-closed regressions and public SHA markers passed; that alone is not LIVE_CERT.

### Unblock for VERIFIED_FIXED

Synthetic RT materials only (already requested prior cycles; names only): staff JWT for entitlement isolation; `WEBSITE_INTAKE_KEY` for HMAC + idempotency; optional Plaid base URL. Do not use V3 secrets. Do not ask Manny for production identities.

---

## Do-not / compliance

- Did not replay D32 abort-on-Azure-absent.
- No deploy, rollback, RBAC, ACCG01, GTM outbound, paid ads, live Graph, lender submit.
- No replacement worker. Docs/evidence only on `cursor/platform-red-team-866c`.
- No secret values exposed.
