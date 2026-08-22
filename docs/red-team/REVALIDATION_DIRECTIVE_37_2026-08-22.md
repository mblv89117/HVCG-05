# Live Hub Independent Validation — Orchestrator Directive 37 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 37  
**Status:** ISSUED — EXECUTE  
**Mission:** `INDEPENDENT_LIVE_VALIDATION_1ac6257`  
**Published UTC:** 2026-08-22T04:10:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA (pre-publish tip):** `635772cf57cb02170e7f6b8c9e99cc4d8d0cf81f`  
**PRIOR CONSUMED:** D36 `run-7aee8578` CLASSIFY_ATLAS03_PUBLIC_ABSENCE on `64b56dc`  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`

**Acknowledge:** Directive **37** consumed and executed once. **Not** a D36/D35/D34/D33/D32 clone. Supervisor/V3 public GETs treated as corroboration only — RT re-GET performed. No LIVE_CERTIFIED claim. No live P0=0 claim. Stop after this report (no D38 issued by RT).

---

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* (all four) | **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

Azure inherit not required for this mission.

---

## 1) SHA_GATE (RT re-GET)

**Expected live SHA:** `1ac62572e2f0d4206f78539c25041fb7f69430f8`  
**Claimed OneDeploy (cite only):** `333912dc-e3e1-48e7-aefa-946142e6185f`  
**Claimed branch:** `cursor/hub-directory-objects-entitle-7a6b`  
**Hub:** `https://app-atlas-integration-hub.azurewebsites.net`

| Probe | Result |
|-------|--------|
| `GET /ATLAS_HUB_COMMIT.txt` | `1ac62572e2f0d4206f78539c25041fb7f69430f8` |
| `GET /hub-build.json` → `gitSha` | `1ac62572e2f0d4206f78539c25041fb7f69430f8` |
| `GET /hub-build.json` → `branch` | `cursor/hub-directory-objects-entitle-7a6b` |
| `GET /health` → `commit` | `1ac62572e2f0d4206f78539c25041fb7f69430f8` |
| `GET /health/commit` | **405** (as expected) |

**SHA_GATE=PASS**

---

## 2) HEALTH

| Field | Value |
|-------|-------|
| ok | **true** |
| authRequired | **true** |
| insecureDevAuth | **false** |
| capitalBackend.mode | sharepoint |
| websiteLeads.configured | true |
| Plaid host/config key in `/health` | **NONE** |

---

## 3) UNAUTH FAIL-CLOSED

| Path | HTTP |
|------|------|
| `GET /api/pm/search` | **401** |
| `GET /api/pm/opportunities` | **401** |
| `GET /api/pm/leads` | **401** |
| `GET /api/capital` | **401** |
| `GET /api/capital/needs` | **401** |

---

## 4) directoryObjects (inherit-free GitHub raw @ `1ac6257`)

Sources fetched independently:

- `https://raw.githubusercontent.com/mblv89117/HVCG-05/1ac62572e2f0d4206f78539c25041fb7f69430f8/apps/atlas-integration-api/src/entitlements/graphMembership.ts` → **200**
- `…/userLookup.ts` → **200**

| Check | Result |
|-------|--------|
| `GRAPH_CHECK_MEMBER_GROUPS_BASE` | `https://graph.microsoft.com/v1.0/directoryObjects` |
| `checkMemberGroupsUrl(oid)` | `…/directoryObjects/{oid}/checkMemberGroups` |
| `checkMemberGroups()` HTTP | **POST** via `fetch(checkMemberGroupsUrl(oid), { method: 'POST', … })` |
| POST `/v1.0/users/{oid}/checkMemberGroups` present in `graphMembership.ts` | **NO** |
| `userLookup.ts` | `GET /v1.0/users/{oid}?$select=id,mail,userPrincipalName` — mail/UPN only |
| `checkMemberGroups` in `userLookup.ts` | **NO** |

Artifacts: `directive37_graphMembership.ts`, `directive37_userLookup.ts`.

---

## 5) ATLAS-RT-20260820-03 on THIS SHA → **VERIFIED_FIXED**

| Probe | Result |
|-------|--------|
| `GET /api/plaid/link` | **405** `method_not_allowed` |
| `GET /api/plaid/create` | **405** `method_not_allowed` |
| `/health` Plaid host/config | **ABSENT** |

**REPRODUCED?** No — Hub still does not expose a Plaid auth handler on `1ac6257`.  
**Judgment:** Public absence on this new live SHA reconfirms D36 close for Hub-live Plaid exposure. Residual: reopen if Hub begins serving `/api/plaid/*` or a separate Plaid origin is published. Does not hide a real reachable P0 on this Hub.

---

## 6) XSYS-01/02 on THIS SHA (unauth only)

| Probe | HTTP | Message |
|-------|------|---------|
| `POST /api/website/leads` no intake headers | **401** | `Website intake key required.` |
| `POST /api/website/leads` `Authorization: Bearer forged-not-a-session` only | **401** | `Website intake key required.` |

Did **not** fetch Hub secrets. Did **not** replay D34 HMAC-invalid / `eva|` package.  
**Status carry-forward:** XSYS-01/02 remain **VERIFIED_FIXED** (D34) with fail-closed reconfirm on `1ac6257`.

---

## 7) ATLAS-01/02 → **STILL_INCONCLUSIVE** (owner-gated SYN01)

| Constraint | Observed |
|------------|----------|
| V3 0407Z SYN01 re-probe (cite) | EMPTY — Capital 403 no entitled clients; `GET /api/pm/clients/SYN01` 404 |
| RT entitled GET/PATCH | **NOT EXECUTED** |
| `GET /api/pm/opportunities/1` or `999999` | **NOT EXECUTED** |

**Classification:** **STILL_INCONCLUSIVE** / owner-gated SYN01. No loop.

---

## Rollup (worker evidence only — not LIVE_CERT)

| Metric | Value |
|--------|-------|
| SHA_GATE | **PASS** (`1ac6257`) |
| Health / fail-closed | **PASS** |
| directoryObjects membership POST | **CONFIRMED** in source; users `checkMemberGroups` **ABSENT** |
| ATLAS-03 | **VERIFIED_FIXED** |
| XSYS-01/02 | **VERIFIED_FIXED** (D34 + unauth reconfirm) |
| ATLAS-01/02 | **STILL_INCONCLUSIVE** |
| LIVE_P0 remaining | **2** (ATLAS-01/02) — **not** reported as 0 |
| LIVE_SECURITY_CERTIFIED / LIVE_CERTIFIED | **NO** (not claimed) |
| Elite / OD-005 redeploy / RBAC / ACCG01 | **not touched** |

---

## Do-not / compliance

- Did not clone/re-execute D36 as the mission.
- Did not redeploy OD-005 `9e5d10a` / `698f7e92`; did not deploy Elite.
- No replacement worker; no Azure RBAC/ACCG01 change; insecureDevAuth remains false.
- No secrets exposed. No LIVE_CERTIFIED claim.
- **Stop.** V3 will consume. RT does not issue D38.
