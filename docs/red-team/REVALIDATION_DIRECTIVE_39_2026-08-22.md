# Live Hub Classification — Orchestrator Directive 39 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 39  
**Status:** ISSUED — EXECUTE ONCE. **NOT A D38 CLONE.**  
**Mission:** `ENTITLED_CLASSIFY_SELF_MINTED_SESSION`  
**Published UTC:** 2026-08-22T05:07:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**BASED ON WORKER SHA (pre-publish tip):** `9803b8aed5d97585a38f2dbec77e693f7dab49b0`  
**PRIOR:** D38 CONSUMED=38 @ `run-1312cbb6` / `9803b8a` — **not redone**  
**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b` / this V3 run `run-a58fafe7-0ba1-402b-bd1c-afcd8f2c44b4`

**Acknowledge:** Directive **39** consumed. Mission = self-mint AUTH_SESSION then classify ATLAS-01/02. Lineage is gate only. Self-mint **failed** (AZURE_* ABSENT) → **ARTIFACT-REVIEW** path executed. No deploy. No LIVE_CERT claim. No secrets logged.

---

## 1) THIS-POD inherit (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_CLIENT_ID | **ABSENT** |
| AZURE_CLIENT_SECRET | **ABSENT** |
| AZURE_TENANT_ID | **ABSENT** |
| AZURE_SUBSCRIPTION_ID | **ABSENT** |
| HUB_TOKEN / STAFF_JWT | **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

### Inherit vs approved env `9e385f28-9c25-11f1-ba66-0e7d0216e441`

| Check | Result |
|-------|--------|
| THIS_POD_ENV_ID == approved env | **YES** (same public id) |
| Runtime AZURE_* present on this pod | **NO** |
| Diagnosis | Approved environment id is bound, but Runtime Secrets for Azure SP are **not** present in this pod process. Follow-up cannot rebind envVersion. Worker **not** replaced. |

---

## 2) SELF-MINT AUTH_SESSION

| Step | Result |
|------|--------|
| AZURE_* PRESENT? | **NO** |
| `az account get-access-token --resource api://…` | **NOT ATTEMPTED** (no SP credentials; would fail) |
| Hub app setting `MICROSOFT_CLIENT_ID` lookup | **NOT DONE** (requires az + secrets; forbidden dump path without login) |
| AUTH_SESSION | **ABSENT** |
| insecureDevAuth enabled? | **NO** (live health remains false) |
| V3 bearer accepted? | **NO** |

**SELF_MINT=FAIL** → proceed to step 5 ARTIFACT-REVIEW (new mission path; not D38 lineage-only).

---

## 3) Lineage gate only (not the mission)

| Probe | Result |
|-------|--------|
| `/ATLAS_HUB_COMMIT.txt` | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| `/hub-build.json` gitSha / branch | `4b9631a…` / `cursor/hub-entitlement-group-members-7a6b` |
| `/health` commit / ok / authRequired / insecureDevAuth | `4b9631a…` / true / true / false |
| Unauth `GET /api/pm/opportunities` | **401** |
| Unauth `GET /api/capital` | **401** |

**LINEAGE_GATE=PASS**

OneDeploy cite only: `7e3f65a2-948b-4f7d-959b-dd47576170b2`. Rollback cite: `ed34f2f` / `798f0dd6` (not executed).

---

## 4) Entitled probes

**NOT EXECUTED** — AUTH_SESSION absent.

---

## 5) ARTIFACT-REVIEW classification (independent)

Sources (V3 packaged; V3 does **not** self-certify; RT may disagree):

1. D39 prompt **0500Z** probe table (artifact `directive39_v3_0500z_probe_table.txt`)
2. `360-growth-solution` `cursor/platform-orchestrator-b1fa` @ `50c8473` — `SYN01_REPROBE_2026-08-22T0448Z.md`, `HUB_ENTITLEMENT_MEMBERS_DEPLOY_2026-08-22T0451Z.md`
3. RT lineage-gate corroboration on same SHA `4b9631a` (unauth 401; health posture)

### ATLAS-RT-20260820-01 → **VERIFIED_FIXED**

| Packaged evidence (judged) | Independent read |
|----------------------------|------------------|
| Opportunities **200** count **1**, `clientCodes=SYN01`, `staffAllSee=false` | Entitled list is SYN01-scoped; no staff all-see dump |
| Clients **200** count **1** SYN01; SYN01 client **200**; SYN01 opps **200** count **1** | Consistent single-client entitlement surface |
| Foreign `NOT-A-CLIENT` → **501** `PM_OPERATION_NOT_IMPLEMENTED` (not a dump) | Out-of-scope client path does not enumerate foreign CRM |
| 0448Z membership **PRESENT**; empty-scope Capital 403 gone | Entitlement path operational for SP session |

**Judgment:** Established “staff all-see / cross-client opportunity dump” finding is closed on live `4b9631a` for the entitled SYN01 scope described. RT did **not** self-mint; classification is ARTIFACT-REVIEW under D39 step 5.

### ATLAS-RT-20260820-02 → **VERIFIED_FIXED**

| Packaged evidence (judged) | Independent read |
|----------------------------|------------------|
| `PATCH /api/pm/opportunities/atlas02-out-of-scope` `{stage:Won}` → **404** `not_found` | Out-of-scope Won fail-closed |
| Upsert **NO** (1→1); real SYN01 opportunity **not** patched | No destructive Won on real row |
| IDs `1` / `999999` **NOT CALLED** | Fake-id story avoided |

**Judgment:** Established foreign Won/PATCH isolation finding is closed on this evidence set. No NEW_FINDING. Not STILL_OPEN.

### Reconfirm (no reopen without contrary evidence)

| Finding | Status |
|---------|--------|
| ATLAS-RT-20260820-03 | **VERIFIED_FIXED** (RT gate: `/api/plaid/link` **405**) |
| XSYS-RT-20260820-01/02 | **VERIFIED_FIXED** (RT gate: website leads bare **401**; D34 hold) |

**STILL_INCONCLUSIVE?** No — D39 artifact-review path supplies entitled-scope HTTP outcomes sufficient for VERIFIED_FIXED / STILL_OPEN / NEW_FINDING; RT chooses **VERIFIED_FIXED** for 01/02.

---

## Rollup

| Metric | Value |
|--------|-------|
| SELF_MINT / AUTH_SESSION | **FAIL** / **ABSENT** |
| Classification path | **ARTIFACT_REVIEW** |
| ATLAS-01 | **VERIFIED_FIXED** |
| ATLAS-02 | **VERIFIED_FIXED** |
| ATLAS-03 / XSYS | **VERIFIED_FIXED** |
| LIVE_P0 (finding rollup) | **0** |
| LIVE_SECURITY_CERTIFIED / LIVE_CERT | **NO** |

**LIVE_CERT=NO** — RT did not self-mint or personally execute entitled Bearer probes this cycle. Finding statuses may be VERIFIED_FIXED via D39-authorized artifact-review; LIVE_CERT remains withheld.

---

## Do-not / compliance

- Did not re-execute D38 lineage-only as the mission.
- Did not accept a V3 bearer token; did not log secrets.
- Did not deploy Hub/Elite; did not redeploy OD-005; did not change RBAC/ACCG01.
- Did not re-ask SYN01 group-add; did not request Application.Read.All.
- Did not invent staff all-see; did not claim LIVE_CERT.
