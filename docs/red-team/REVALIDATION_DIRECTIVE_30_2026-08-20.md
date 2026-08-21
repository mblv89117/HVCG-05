# Live Hub Revalidation — Orchestrator Directive 30 (2026-08-20)

**Train:** red-team  
**Directive:** 30  
**Published UTC:** 2026-08-21T00:01:00Z  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA:** `ef00de500eebb949c7d410d498d344ad52b7c383`  
**BASED ON RUN ID:** `followup-accepted-2026-08-20T2130Z`

**Scope:** Independent **LIVE** Hub retest after owner-authorized OD-005 production deploy of exact SHA `9e5d10a20639bbeb659fbacd6362cd9f13adb08b`. Not an identical-scope retest of pre-deploy Hub `940a484`. Unchanged GTM/Copilot/Integration/Revenue tips **not** retested.

**Live target:** `https://app-atlas-integration-hub.azurewebsites.net`  
**Claimed deploy (supervisor):** OneDeploy `f2eee147-2624-414b-8f16-688729249097` — **not** independently confirmed via Azure API in this RT environment (no `az`/SP credentials).

**Method:** Live HTTP fail-closed probes + source check of claimed deploy SHA `9e5d10a`. No app-settings dump, Key Vault, Sites.Manage.All, synthetic Graph writes, RBAC changes, or Hub redeploy.

---

## Live posture observed

| Check | Result |
|-------|--------|
| `GET /health` | **200** `ok=true` |
| `authRequired` | **true** |
| `insecureDevAuth` | **false** |
| `websiteLeads.configured` | **true** |
| `pmBackend.mode` | `sharepoint` / managed_identity |

Artifact: `directive30_live_hub_health.json`, `directive30_live_hub_probes.txt`.

---

## Per-finding LIVE status (post-deploy)

### ATLAS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Atlas Hub opportunities entitlement |
| Branch / Exact live evidence SHA | Production Hub URL above; claimed package `9e5d10a` (Azure OneDeploy id not RT-confirmed) |
| Severity | P0 |
| Evidence | Unauth `GET /api/pm/opportunities` → **401** Bearer missing; forged JWT + `x-atlas-*` → **401** Invalid/expired Microsoft token (no header bypass). Source @ `9e5d10a`: `staffShortCircuitPresent=false`. |
| Reproduction attempted | Live unauth/forged-token probes (PASS fail-closed). Full ACCG01-only staff vs foreign opportunity list/get **not** executed — no Entra staff JWT in RT env. |
| Impact if residual | Cross-client opportunity disclosure |
| Remediation | Provide staff JWT for entitlement isolation retest; or accept PARTIAL until then |
| Regression requirement | Staff entitled only to A cannot list/get B |
| **Status** | **PARTIAL** |

### ATLAS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Atlas Hub opportunity PATCH |
| Severity | P0 |
| Evidence | Unauth `PATCH /api/pm/opportunities/1` → **401**. Same entitlement path as 01; staff short-circuit absent in `9e5d10a` source. |
| Reproduction attempted | Live unauth PATCH deny. Foreign Won with staff JWT **not** executed. |
| Impact if residual | Foreign Won/Lost mutations |
| Remediation | Live staff JWT patch deny retest |
| Regression requirement | Staff A cannot patch client B → 404/403 |
| **Status** | **PARTIAL** |

### ATLAS-RT-20260820-03
| Field | Value |
|-------|-------|
| System | Atlas Plaid API |
| Severity | P0 |
| Evidence | Plaid routes **not** served on Hub host (`/api/plaid/*` → 404/405). No separate Plaid base URL available without app-settings. |
| Reproduction attempted | Hub-host probes only — surface not reachable here. |
| Impact if residual | Bank isolation collapse if Plaid host still header-auth |
| Remediation | Publish Plaid HTTPS origin for RT; retest missing Bearer → 401 |
| Regression requirement | Missing Bearer → 401 |
| **Status** | **NEEDS_RETEST** (live Plaid host not reachable from this run) |

### XSYS-RT-20260820-01
| Field | Value |
|-------|-------|
| System | Hub `/api/website/leads` signed intake |
| Severity | P0 |
| Evidence | No key → **401** `Website intake key required.`; Bearer not substitute → **401**; forged long key + key-id/ts/sig → **401** (fails at key equality before HMAC message). Claimed `9e5d10a` includes HMAC verify. |
| Reproduction attempted | Live unauth/forged-key probes. Valid-key + invalid-signature → `signature invalid` **not** executed — no intake key in RT env. |
| Impact if residual | Key-only forge if HMAC not actually live |
| Remediation | RT-held intake key (or owner-witnessed probe) for signature-invalid 401 |
| Regression requirement | Valid key + invalid signature → 401 |
| **Status** | **PARTIAL** |

### XSYS-RT-20260820-02
| Field | Value |
|-------|-------|
| System | Website lead idempotency prefix binding |
| Severity | P0 |
| Evidence | Cannot reach idempotency gate without passing intake auth. |
| Reproduction attempted | Blocked by missing intake key. |
| Impact if residual | Cross-system key collision overwrite |
| Remediation | Authenticated intake probe with `eva|` key on website type → 409 |
| Regression requirement | Website type + `eva|` key → 409 |
| **Status** | **NEEDS_RETEST** |

---

## Rollup

| Metric | Value |
|--------|-------|
| LIVE P0 fully FIXED_REVALIDATED | **0** |
| LIVE P0 PARTIAL | **3** (ATLAS-01/02, XSYS-01) |
| LIVE P0 NEEDS_RETEST | **2** (ATLAS-03, XSYS-02) |
| LIVE P0 still not closable as 0 | **YES** — do **not** report LIVE P0=0 |
| Candidate OD-005 `9e5d10a` | FIXED_REVALIDATED (prior; not re-run as sole D30 evidence) |
| LIVE_CERTIFIED | **NO** |

### Rollback note
Keep rollback ready (`Rollback-HVCGCapitalHub.ps1` + prior Hub SHA `b6a3c9c` lineage) until ATLAS-01/02 entitlement isolation and XSYS-01 signature-invalid are **FIXED_REVALIDATED** on live Hub with authenticated probes. Do not treat supervisor deploy claim alone as LIVE_CERTIFIED. RT did **not** execute rollback.

---

## Dual-surface (updated)

| ID | LIVE Hub (post-deploy probes) | Candidate `9e5d10a` |
|----|-------------------------------|---------------------|
| ATLAS-01 | **PARTIAL** | FIXED_REVALIDATED |
| ATLAS-02 | **PARTIAL** | FIXED_REVALIDATED |
| ATLAS-03 | **NEEDS_RETEST** | FIXED_REVALIDATED |
| XSYS-01 | **PARTIAL** | FIXED_REVALIDATED |
| XSYS-02 | **NEEDS_RETEST** | FIXED_REVALIDATED |

Artifacts: `docs/red-team/artifacts/directive30_*`
