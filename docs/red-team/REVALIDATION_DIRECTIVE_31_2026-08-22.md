# Live Hub Independent Validation — Orchestrator Directive 31 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 31  
**Published UTC:** 2026-08-22T00:56:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `7faca45a52c47cad1e1ba894f33b59877916aa2b`  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`

**Acknowledge:** Directive **31** consumed. Independent LIVE validation only. No Orchestrator role. No deploy/rollback. No ACCG01 mutation. Elite `75d0c59` not touched.

---

## Required live release (exact)

| Field | Required |
|-------|----------|
| Live Hub SHA | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Controlled deployment ID | `698f7e92-40d1-44e6-82ce-3988d30144fc` |
| Live target | `https://app-atlas-integration-hub.azurewebsites.net` |

---

## SHA / deployment gate

| Check | Result |
|-------|--------|
| Independent live Hub SHA verified | **NO** |
| Controlled deployment ID verified | **NO** |
| `az` CLI present | YES (installed this run) |
| `az login` / AZURE_* SP secrets | **ABSENT** |
| SCM `GET /api/deployments` | **401** |
| Public `hub-build.json` / `ATLAS_HUB_COMMIT.txt` | **not readable** (405 via Hub router) |
| App settings / Key Vault | **not read** (forbidden) |

**LIVE_VALIDATION_ABORTED=YES**

**Abort reason:** D31 requires STOP unless live Hub SHA is independently confirmed exact `9e5d10a…`. RT cannot confirm SHA or deployment `698f7e92…` without Azure deployment-history access. Orchestrator/deploy claims are not accepted as SHA proof. Finding reproducers were **not** executed against an unverified release (avoids validating a different artifact).

Artifact: `docs/red-team/artifacts/directive31_sha_gate_abort.txt`

### Ambient posture (not SHA proof; not finding classification)

| Check | Observed |
|-------|----------|
| `GET /health` | 200 `ok=true` |
| `authRequired` | `true` |
| `insecureDevAuth` | `false` |
| `websiteLeads.configured` | `true` |

These ambient observations do **not** authorize finding VERIFIED_FIXED and do **not** satisfy the exact-SHA gate.

---

## Per-finding classification (D31)

Scope was limited to the five prior findings. Classifications use D31 vocabulary only.

| Finding ID | System | Classification | Live SHA | Deployment ID | Notes |
|------------|--------|----------------|----------|---------------|-------|
| ATLAS-RT-20260820-01 | Atlas Hub opportunities entitlement | **INCONCLUSIVE** | unverified | unverified | SHA gate abort; established staff entitlement reproducer not run |
| ATLAS-RT-20260820-02 | Atlas Hub opportunity PATCH | **INCONCLUSIVE** | unverified | unverified | SHA gate abort |
| ATLAS-RT-20260820-03 | Atlas Plaid API | **INCONCLUSIVE** | unverified | unverified | SHA gate abort; Plaid host also unresolved without settings |
| XSYS-RT-20260820-01 | Hub `/api/website/leads` signed intake | **INCONCLUSIVE** | unverified | unverified | SHA gate abort |
| XSYS-RT-20260820-02 | Website lead idempotency binding | **INCONCLUSIVE** | unverified | unverified | SHA gate abort |

None classified **VERIFIED_FIXED** or **REPRODUCIBLE** this cycle (no production finding probes after abort).

---

## Regression (minimum) — D31

| Regression | Result |
|------------|--------|
| Health endpoint passes | Ambient **PASS** (200 ok) — not used as release identity |
| Authentication remains required | Ambient `authRequired=true` — not full protected-API matrix this cycle |
| Insecure development authentication disabled | Ambient `insecureDevAuth=false` |
| Unauthenticated protected API rejected | **NOT RUN** (SHA gate abort) |
| Unauthorized access fail-closed | **NOT RUN** (SHA gate abort) |
| Staff-bypass condition ABSENT | **NOT RUN** against live (source @ candidate `9e5d10a` previously absent; live attribution blocked) |
| Website-leads established suite vs live | **NOT RUN** (SHA gate abort; no intake key) |
| No synthetic fallback masks authz failure | **NOT RUN** (SHA gate abort) |

---

## Certification rollup

| Metric | Value |
|--------|-------|
| LIVE_VALIDATION_ABORTED | **YES** |
| LIVE_P0 (D31 closable as 0?) | **NO** — five findings INCONCLUSIVE; prior LIVE residual stands |
| LIVE_P1 | none newly opened this limited scope |
| LIVE_SECURITY_CERTIFIED | **NO** |
| Elite | not in scope (`75d0c59` untouched) |

### Unblock for resume

1. Azure SP secrets (`AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID`, optional `AZURE_SUBSCRIPTION_ID`) for **deployment history only** to confirm active deployment `698f7e92…` maps to SHA `9e5d10a…`.
2. If SHA matches: run established ATLAS/XSYS reproducers with synthetic staff JWT + website intake key (+ Plaid base URL if separate host).
3. If SHA ≠ `9e5d10a…`: remain aborted; do not certify a different release.

---

## Do-not / compliance

- No deploy, rollback, RBAC change, app-settings, Key Vault, ACCG01 writes, GTM/paid ads, Revenue live Graph, replacement worker, or Orchestrator behavior.
- Docs/evidence only on `cursor/platform-red-team-866c`.
