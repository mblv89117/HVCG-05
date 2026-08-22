# Live Hub Client Isolation — Independent Validation D42 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 42  
**Status:** EXECUTE ONCE. **NOT a D39/D40/D41 clone.**  
**Mission:** `LIVE_CLIENT_CX_CK_ISOLATION` @ Hub `976bea59`  
**Published UTC:** 2026-08-22T07:22:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c` (not recreated)  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**Hub:** `https://app-atlas-integration-hub.azurewebsites.net`  
**Lineage cite:** V3 stacked CX `14ac7d60` + CK `12d7ca99` → `cursor/hub-cx-ck-stack-7a6b`

Synthetic only. No real-client writes. No ACCG01 writes. No deploy. No Elite deploy. No OD-005 redeploy. No artifact review. No secrets logged.

---

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| envVersion | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| buildId | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| `AZURE_*` | all **ABSENT** |
| AUTH_SESSION | **ABSENT** |
| SELF_MINT | **FAIL** (not attempted) |

---

## 1) Lineage gate

| Check | Result |
|-------|--------|
| `/health` commit | `976bea591bb43879667407c1e8a8afc66bb8556d` |
| `/ATLAS_HUB_COMMIT.txt` | `976bea591bb43879667407c1e8a8afc66bb8556d` |
| `/hub-build.json` gitSha / branch | `976bea59…` / `cursor/hub-cx-ck-stack-7a6b` |
| `authRequired` | **true** |
| `insecureDevAuth` | **false** |

**SHA_GATE=PASS**

---

## 2) Unsigned `/client` and `/api/client/*` fail-closed → **PASS**

All unsigned GET and POST probes returned **401**. `/client` is **live** at this SHA (401, not D41-era 405).

| Method | Path | Code |
|--------|------|------|
| GET | `/client` | **401** |
| GET | `/api/client` | **401** |
| GET | `/api/client/` | **401** |
| GET | `/api/client/me` | **401** |
| GET | `/api/client/portal` | **401** |
| GET | `/api/client/workspace` | **401** |
| GET | `/api/client/documents` | **401** |
| GET | `/api/client/document-requests` | **401** |
| GET | `/api/client/knowledge` | **401** |
| GET | `/api/client/search` | **401** |
| GET | `/api/client/gcc` | **401** |
| GET | `/api/client/gcc/key` | **401** |
| GET | `/api/client/profile` | **401** |
| GET | `/api/client/context` | **401** |
| GET | `/api/client/home` | **401** |
| GET | `/api/client/v1` | **401** |
| GET | `/api/client/v1/{portal,workspace,documents,knowledge,search,gcc,gcc/key}` | **401** each |
| GET | `/api/client/{SYN01,HFD01}` | **401** |
| GET | `/api/client/{SYN01,HFD01}/portal` | **401** |
| GET | `/api/client/portal/SYN01` | **401** |
| GET | `/api/client/workspace/SYN01` | **401** |
| GET | `/api/client/documents/SYN01` | **401** |
| GET | `/api/client/knowledge/SYN01` | **401** |
| POST | `/api/client`, `/api/client/portal`, `/api/client/gcc/key` | **401** each |

**SCOPE_2=PASS** (`SCOPE2_FAIL_COUNT=0`)

---

## 3) Non-client entitled SP `/client` → **NOT_EXECUTED**

Expected: **403** (cannot open as client principal). No entitled non-client Bearer session.

---

## 4) SYN01 portal vs foreign → **NOT_EXECUTED**

Expected: SYN01 `portal` / `workspace` / `document-requests` → **200**; `HFD01` / `CPL01` / `PDG01` / `ACCG01` → **404**.

---

## 5) Knowledge operating picture → **NOT_EXECUTED**

Expected: `GET /api/pm/knowledge` entitled → `knowledge_operating_picture_v1`; SYN01 synthetic only; real client codes not operationalized; `HVS_DATA_ACCESS=BLOCKED`.

---

## 6) Client A vs Client B cross-read → **NOT_EXECUTED**

Expected: Client A never reads Client B on `/api/client`, portal, documents, knowledge, search, GCC key.

---

## Isolation table (RT-executed)

| Surface | Principal | Target | Method | Code | Scope | RT verdict |
|---------|-----------|--------|--------|------|-------|------------|
| `/client` | unsigned | — | GET | **401** | 2 | PASS |
| `/api/client/*` | unsigned | all discovered paths | GET/POST | **401** | 2 | PASS |
| `/client` | non-client SP | client principal | GET | — | 3 | NOT_EXECUTED |
| `/api/pm/clients/SYN01/{portal,workspace,document-requests}` | SYN01 entitled | own | GET | — | 4 | NOT_EXECUTED |
| `/api/pm/clients/{HFD01,CPL01,PDG01,ACCG01}/portal` | SYN01 entitled | foreign | GET | — | 4 | NOT_EXECUTED |
| `/api/pm/knowledge` | SYN01 entitled | operating picture | GET | — | 5 | NOT_EXECUTED |
| `/api/client` + portal/docs/knowledge/search/gcc | Client A | Client B | GET | — | 6 | NOT_EXECUTED |

---

## LIVE_P0 (client isolation surface only)

| Layer | RT-proven | Count |
|-------|-----------|-------|
| Unsigned unauth (`/client`, `/api/client/*`) | **YES** | **0** open P0 |
| Entitled client isolation (scopes 3–6) | **NO** | cannot assert 0 |

**LIVE_P0_CONFIRMED_OPEN=0**  
**LIVE_P0_ENTITLED_UNVERIFIED=YES**

---

## `/client` isolation classification

**INCONCLUSIVE** — unsigned fail-closed proven (**401**); entitled SYN01/foreign/knowledge/cross-client isolation **not independently executed** (`AUTH_SESSION` absent). Not **VERIFIED_FIXED**.

---

## Do-not / compliance

- Did not clone D39 artifact review.
- Did not redeploy Hub, Elite, or OD-005.
- Did not touch real client data or ACCG01 writes.
- Did not wake V2 or recreate worker.
- Did not log secrets or accept V3 bearer.

---

## Artifacts

- `docs/red-team/artifacts/directive42_live_probes.txt`
- `docs/red-team/artifacts/directive42_live_hub_health.json`
- `docs/red-team/artifacts/directive42_ATLAS_HUB_COMMIT.txt`
- `docs/red-team/artifacts/directive42_hub_build.json`
- `/opt/cursor/artifacts/d42_completion_status.txt`
