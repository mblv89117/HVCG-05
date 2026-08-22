# Live Hub Classification — Orchestrator Directive 34 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 34  
**Status:** ISSUED — classify packaged XSYS evidence (NOT a D33/D32 clone)  
**Published UTC:** 2026-08-22T03:11:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `557aa6faf203183cf2fec26afb67de7a40ddd1bd`  
**PREVIOUS:** D33 `run-494e1372` CONSUMED=33 @ `557aa6f` SHA_GATE=PASS 5/5 INCONCLUSIVE  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`

**Acknowledge:** Directive **34** consumed. Classify-only mission. D33 SHA-gate mission not re-run as the mission. D32 abort-on-Azure-absent not replayed. No deploy/rollback. Elite untouched. No ACCG01. No V3 secrets used. No staff sessions minted. No app-settings fetch. No bypass invented.

---

## Why this is not D33 / D32

| Directive | Mission |
|-----------|---------|
| D32 | Azure inherit gate → abort if ABSENT |
| D33 | Public-marker SHA gate → full established reproducers (staff JWT / intake key / Plaid) |
| **D34** | Independently **classify XSYS-01/02** from packaged public HTTP evidence + RT no-secret re-probes |

---

## THIS-POD (names only — do not abort)

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

Continued per D34 (Azure ABSENT / envVersion `a86e2323` → do not abort).

Artifact: `docs/red-team/artifacts/directive34_this_pod_inherit.txt`

---

## Public corroboration (not the mission)

Hub: `https://app-atlas-integration-hub.azurewebsites.net`

| Marker | Observed | Match expected `64b56dc…` |
|--------|----------|---------------------------|
| `GET /ATLAS_HUB_COMMIT.txt` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |
| `GET /health` → `commit` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |
| `GET /hub-build.json` → `gitSha` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` | **YES** |
| `authRequired` / `insecureDevAuth` / `ok` | true / false / true | — |
| Unauth `GET /api/pm/opportunities` | **401** | expected |
| Unauth `GET /api/pm/search` | **401** | expected |
| Unauth `GET /api/pm/leads` | **401** | expected |

Finding classification proceeds against observed SHA `64b56dc…`.

---

## Evidence sources for XSYS

### (a) V3 packaged 0253Z live evidence (package only — V3 did not self-certify)

Source: `360-growth-solution` `cursor/platform-orchestrator-b1fa` @ `55cde624a71033846585ec9c65344e51eef4114a`  
Path: `docs/platform-orchestration/reports/V3_AZURE_BACKED_P0_PROBES_2026-08-22T0253Z.md`  
Copy on RT branch: `docs/red-team/artifacts/directive34_v3_packaged_p0_probes_0253Z.md`

| Probe (packaged) | Finding | HTTP | Message / code |
|------------------|---------|------|----------------|
| Valid key-id=`website` + timestamp + signature `'0'*64` | XSYS-01 | **401** | `Website intake signature invalid.` |
| Valid HMAC + `Website-Contact` + `fullPayload.idempotencyKey=eva\|v3-orchestrator-d33-do-not-upsert` | XSYS-02 | **409** | `IDEMPOTENCY_PREFIX_MISMATCH` / must match `website\|` — Graph upsert **not** reached |
| Missing intake headers | fail-closed | **401** | `Website intake key required.` |
| Forged Bearer only | fail-closed | **401** | `Website intake key required.` |

Probed (per package): 2026-08-22T02:52:55Z against live Hub SHA `64b56dc`. No secret values in package.

### (b) RT independent public re-probes (no Azure secrets)

| Probe | HTTP | Message |
|-------|------|---------|
| `POST /api/website/leads` no intake headers | **401** | `Website intake key required.` |
| `POST /api/website/leads` `Authorization: Bearer forged-not-a-session` only | **401** | `Website intake key required.` |

Artifact: `docs/red-team/artifacts/directive34_public_xsys_reprobes.txt`

RT did **not** fetch Hub app settings, use V3 secrets, mint staff sessions, invent a bypass, or ask Manny.

---

## Classification (D34 vocabulary)

### XSYS-RT-20260820-01 → **VERIFIED_FIXED**

| Field | Value |
|-------|-------|
| Live SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` (RT-corroborated public markers) |
| Established regression | Valid intake key + invalid signature → **401** |
| Judgment | Packaged live probe OBSERVED_401_INVALID_SIG (`Website intake signature invalid.`) closes the established HMAC finding on this SHA. RT independently re-confirmed same SHA + fail-closed missing-key / Bearer-not-substitute **401**. Combined (a)+(b) judged sufficient under D34 classify rules. |
| Not claimed | LIVE_SECURITY_CERTIFIED from V3 alone |

### XSYS-RT-20260820-02 → **VERIFIED_FIXED**

| Field | Value |
|-------|-------|
| Live SHA | `64b56dc…` (same) |
| Established regression | Website type + `eva\|` idempotency key → **409** (prefix binding) |
| Judgment | Packaged live probe OBSERVED_409_PREFIX_MISMATCH (`IDEMPOTENCY_PREFIX_MISMATCH`) before SharePoint upsert closes the established unbound-prefix finding on this SHA. RT public fail-closed probes confirm intake still fail-closed on same release. |
| Not claimed | LIVE_SECURITY_CERTIFIED from V3 alone |

### ATLAS-RT-20260820-01 → **STILL_INCONCLUSIVE**
No staff/synthetic session. Entitlement isolation not executed. D14 not issued (per V3 package). No new secrets.

### ATLAS-RT-20260820-02 → **STILL_INCONCLUSIVE**
Same — no staff session; foreign Won not live-proven.

### ATLAS-RT-20260820-03 → **STILL_INCONCLUSIVE**
No Plaid host opened. Hub `/api/plaid/*` not a live surface (prior 405). No new Plaid surface.

**None REPRODUCED** this cycle.

---

## Rollup (worker evidence only)

| Metric | Value |
|--------|-------|
| Mission | Classify packaged XSYS evidence |
| INHERIT | FAIL (continued) |
| Observed live Hub SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| XSYS-01 | **VERIFIED_FIXED** |
| XSYS-02 | **VERIFIED_FIXED** |
| ATLAS-01/02/03 | **STILL_INCONCLUSIVE** |
| LIVE_P0 remaining open/inconclusive | **3** (ATLAS-01/02/03) |
| LIVE_P1 | none newly opened |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |

**LIVE_SECURITY_CERTIFIED=NO** — ATLAS triad still STILL_INCONCLUSIVE; V3 evidence alone is not LIVE_CERT; worker does not self-certify for V3.

---

## Do-not / compliance

- Did not replay D32 abort-on-Azure-absent.
- Did not re-run D33 SHA-gate as the mission (markers corroborated only).
- No deploy, rollback, RBAC, ACCG01, GTM outbound, paid ads, live Graph, lender submit.
- No replacement worker. No secret exposure.
- Docs/evidence only on `cursor/platform-red-team-866c`.
