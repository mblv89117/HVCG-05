# Live Hub Classification — Orchestrator Directive 36 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 36  
**Mission hash:** `CLASSIFY_ATLAS03_PUBLIC_ABSENCE`  
**Status:** ISSUED — classify ATLAS-03 from public HTTP absence (NOT a D34/D35/D33/D32 clone)  
**Published UTC:** 2026-08-22T03:39:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `435824f1df84ddc02f362460a7c53356fbc91e0f`  
**PREVIOUS:** D34 CONSUMED=34 @ `435824f` — XSYS-01/02 VERIFIED_FIXED (not reclassified)  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`  
**Note:** D35 SKIPPED (would be a D34 clone)

**Acknowledge:** Directive **36** consumed. Only mission = classify ATLAS-RT-20260820-03. XSYS not re-probed. ATLAS-01/02 not classified. No staff mint. No deploy. No LIVE_SECURITY_CERTIFIED claim.

---

## THIS-POD (names only — do not abort)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* (all four) | **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

Continued (Azure ABSENT / envVersion `a86e2323` → do not abort).

---

## Public corroboration (not a SHA-gate abort)

| Check | Result |
|-------|--------|
| `GET /ATLAS_HUB_COMMIT.txt` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| `GET /health` → `commit` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| `GET /hub-build.json` → `gitSha` | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` |
| Unauth `GET /api/pm/search` | **401** |
| Unauth `GET /api/capital` | **401** |
| Unauth `GET /api/capital/opportunities` | **401** |

---

## ATLAS-03 public absence probes

Hub: `https://app-atlas-integration-hub.azurewebsites.net`

### `/health` Plaid config

| Check | Result |
|-------|--------|
| Top-level health keys | `authRequired`, `ba`, `capitalBackend`, `commit`, `insecureDevAuth`, `localAi`, `ok`, `pmBackend`, `port`, `providers`, `websiteLeads` |
| Any `plaid` / Plaid host key in `/health` JSON | **NO** |
| `capitalBackend.mode` | `sharepoint` |
| `websiteLeads.configured` | true |

### `/api/plaid/*` HTTP

| Probe | HTTP | Body code |
|-------|------|-----------|
| `GET /api/plaid/link` | **405** | `method_not_allowed` |
| `GET /api/plaid/link/token` | **405** | `method_not_allowed` |
| `GET /api/plaid/accounts` | **405** | `method_not_allowed` |
| `GET /api/plaid/health` | **405** | `method_not_allowed` |
| `GET /api/plaid` | **405** | `method_not_allowed` |
| `POST /api/plaid/link` | **404** | `not_found` |
| `GET /api/plaid/link` + forged `x-atlas-*` | **405** | `method_not_allowed` |

No live Plaid authz surface reached. Header-forge path does not execute on Hub (router rejects before Plaid auth).

Artifact: `docs/red-team/artifacts/directive36_atlas03_public_absence.txt`

### Capital note (non-authoritative for security)

Live Hub Capital is SharePoint / recorded-only style backend (`capitalBackend.mode=sharepoint`). Capital `/api/capital/*` fail-closed 401 without Bearer. That operational note does **not** hide a real P0: it only records that Hub Capital as currently exposed does not depend on a live Plaid host.

---

## Classification

### ATLAS-RT-20260820-03 → **VERIFIED_FIXED**

| Field | Value |
|-------|-------|
| Live SHA | `64b56dcb73caae1cfcd71743bcedfd8cd64c2b26` (public markers) |
| Established concern | Plaid API header-only principal / missing Bearer → bank isolation collapse **if network-reachable** |
| Independent evidence | Live Hub serves **no** Plaid HTTP API (`/api/plaid/link` and peers **405**; POST link **404**); forged headers still **405**; `/health` has **no** Plaid host/config key |
| REPRODUCED? | **No** — established Hub-path reproducer cannot reach a Plaid auth handler |
| Judgment | For this live Hub release, public absence closes the live Hub Plaid exposure finding. Mission `CLASSIFY_ATLAS03_PUBLIC_ABSENCE`. |
| Residual (explicit) | Public Hub GETs do not inventory a future/alternate non-Hub Plaid host. Reopen if a Plaid origin is published or Hub begins routing `/api/plaid/*` to an auth handler. |
| Not claimed | LIVE_SECURITY_CERTIFIED; ATLAS-01/02 unchanged |

### Not in mission (unchanged)

| ID | Status (cite prior) |
|----|---------------------|
| XSYS-01 / XSYS-02 | **VERIFIED_FIXED** (D34) — not reclassified; HMAC/`eva\|` probes not re-run |
| ATLAS-01 / ATLAS-02 | **STILL_INCONCLUSIVE** (D34) — not classified this mission; no staff mint |

---

## Rollup (worker evidence only)

| Metric | Value |
|--------|-------|
| Mission | `CLASSIFY_ATLAS03_PUBLIC_ABSENCE` |
| ATLAS-03 | **VERIFIED_FIXED** |
| LIVE_P0 remaining | **2** (ATLAS-01, ATLAS-02 STILL_INCONCLUSIVE) |
| LIVE_P1 | none newly opened |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |

**LIVE_SECURITY_CERTIFIED=NO** — ATLAS-01/02 remain STILL_INCONCLUSIVE; this mission does not close every remaining live P0.

---

## Do-not / compliance

- Not a D34/D35/D33/D32 clone.
- Did not reclassify XSYS or re-run HMAC-invalid / `eva|` probes as the mission.
- Did not classify ATLAS-01/02; no staff session; no bypass; no deploy; no secret exposure.
- Docs/evidence only on `cursor/platform-red-team-866c`.
