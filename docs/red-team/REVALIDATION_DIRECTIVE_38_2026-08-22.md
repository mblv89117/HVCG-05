# Live Hub Classification — Orchestrator Directive 38 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 38  
**Status:** ISSUED — NEW; **not** a D37 clone  
**Mission:** `ENTITLED_ATLAS0102_CLASSIFY`  
**Published UTC:** 2026-08-22T04:56:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA (pre-publish tip):** `4b819e6b033c10418e7b0018063f9f2730d4bc27`  
**D37:** CONSUMED=37 @ `run-f253b2f5` — **not re-executed**  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b` / this V3 run `run-e07b76f2-e213-47ba-beac-2967c119567c`

**Acknowledge:** Directive **38** consumed. Entitlement-path classify mission on new live Hub SHA. No deploy. No LIVE_SECURITY_CERTIFIED claim. No live P0=0 claim. No secrets logged.

---

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* (all four) | **ABSENT** |
| HUB_TOKEN / MSAL_TOKEN / STAFF_JWT / HVCG_RT_STAFF_JWT | **ABSENT** |
| AUTH_SESSION | **ABSENT** / not obtainable |
| az login | **NO** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

---

## 1) Lineage (RT verify — not a D37 SHA_GATE clone)

**Expected:** `4b9631a0a50e06591dd9100fb48b07e5aea7d008`  
**Branch claim:** `cursor/hub-entitlement-group-members-7a6b`  
**OneDeploy claim (cite only):** `7e3f65a2-948b-4f7d-959b-dd47576170b2`  
**Hub:** `https://app-atlas-integration-hub.azurewebsites.net`

| Probe | Result |
|-------|--------|
| `GET /ATLAS_HUB_COMMIT.txt` | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| `GET /hub-build.json` → `gitSha` / `branch` | `4b9631a…` / `cursor/hub-entitlement-group-members-7a6b` |
| `GET /health` → `commit` | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| ok / authRequired / insecureDevAuth | **true** / **true** / **false** |

**LINEAGE=PASS**

Immediate rollback cite (not executed): `ed34f2f8…` / `798f0dd6…`. Deeper OD-005 / Elite **not** redeployed or touched.

---

## 2) Unauth fail-closed

| Path | HTTP |
|------|------|
| `GET /api/pm/search` | **401** |
| `GET /api/pm/opportunities` | **401** |
| `GET /api/pm/leads` | **401** |
| `GET /api/pm/clients` | **401** |
| `GET /api/capital` | **401** |
| `GET /api/capital/needs` | **401** |

No auth bypass observed.

---

## 3) AUTH_SESSION / ATLAS-01 / ATLAS-02

| Check | Result |
|-------|--------|
| Hub AUTH_SESSION obtainable on this pod? | **NO** |
| Reason | AZURE_* ABSENT; `az` not logged in; no HUB_TOKEN/STAFF_JWT |
| Entitled SYN01 GET/PATCH executed? | **NO** |
| Fake-id `1` / `999999` mission? | **NO** |
| Staff all-see invented? | **NO** |

### ATLAS-RT-20260820-01 → **STILL_INCONCLUSIVE**
Cannot independently prove entitled SYN01 list/get isolation without AUTH_SESSION. V3 post-deploy SYN01 claims are **not** accepted as RT LIVE_CERT or VERIFIED_FIXED.

### ATLAS-RT-20260820-02 → **STILL_INCONCLUSIVE**
Foreign Won/PATCH isolation not independently executed (no AUTH_SESSION).

**Source cite (raw @ `4b9631a`, not a substitute for entitled live probes):** `graphMembership.ts` documents fail-closed fallback `GET /groups/{id}/members/microsoft.graph.user` and `…/microsoft.graph.servicePrincipal` when `directoryObjects/…/checkMemberGroups` returns 401/403. Artifact: `directive38_graphMembership.ts`.

Azure SP secrets requested for a later entitled session; this D38 cycle does **not** wait on them.

---

## 4) Reconfirm ATLAS-03 / XSYS-01/02

| Finding | Evidence on `4b9631a` | Status |
|---------|----------------------|--------|
| ATLAS-RT-20260820-03 | `GET /api/plaid/link` + `/api/plaid/create` → **405**; `/health` no Plaid key | **VERIFIED_FIXED** (unchanged; no contrary evidence) |
| XSYS-RT-20260820-01 | Unauth / Bearer-only intake → **401** key required | **VERIFIED_FIXED** (D34 hold + reconfirm) |
| XSYS-RT-20260820-02 | Same fail-closed gate; no HMAC/`eva\|` replay | **VERIFIED_FIXED** (D34 hold + reconfirm) |

---

## Rollup (worker evidence only)

| Metric | Value |
|--------|-------|
| LINEAGE | **PASS** (`4b9631a`) |
| Unauth 401 | **PASS** |
| ATLAS-01 | **STILL_INCONCLUSIVE** |
| ATLAS-02 | **STILL_INCONCLUSIVE** |
| ATLAS-03 | **VERIFIED_FIXED** |
| XSYS-01/02 | **VERIFIED_FIXED** |
| LIVE_P0 | **2** (ATLAS-01/02) — **not** 0 |
| LIVE_SECURITY_CERTIFIED / LIVE_CERT | **NO** |
| Deploy by RT | **NO** |

---

## Do-not / compliance

- Did not clone/re-execute D37 SHA_GATE as the mission (lineage verify only).
- Did not deploy Hub/Elite; did not redeploy OD-005 `9e5d10a` / `698f7e92`.
- Did not re-ask SYN01 group-add; did not change Azure RBAC / ACCG01.
- Did not invent staff all-see; did not log secrets/tokens/GUIDs.
- Did not claim LIVE_SECURITY_CERTIFIED or live P0=0.
