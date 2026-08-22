# Live Hub SYNQA Client Isolation — Independent Validation D44 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 44  
**Status:** EXECUTE ONCE. **NOT a D39–D43 clone.**  
**Mission:** `LIVE_SYNQA_CLIENT_SESSION_ISOLATION` @ Hub `101b1a7` (PR #35)  
**Published UTC:** 2026-08-22T10:30:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c` (not recreated)  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**Hub:** `https://app-atlas-integration-hub.azurewebsites.net`  
**Branch:** `cursor/cx-synqa-rotate-526a100`

Synthetic only. No real-client writes. No ACCG01 writes. No Elite deploy. No Sites.Selected. No secrets logged.

---

## SHA gate

| Check | Result |
|-------|--------|
| `/health` commit | `101b1a7d2409d13e3b96b96e7fe29ffc9d8dce5b` |
| `/ATLAS_HUB_COMMIT.txt` | `101b1a7…` |
| `authRequired` | **true** |
| `insecureDevAuth` | **false** |

**SHA_GATE=PASS** — destructive entitled probes not started without staff session (per gate: if SHA wrong, stop; SHA matches, proceed only as far as credentials allow).

---

## Credentials

| Field | Result |
|-------|--------|
| `AZURE_CLIENT_ID` / `SECRET` / `TENANT_ID` | all **ABSENT** |
| Staff Bearer (entitled) | **ABSENT** |
| `az login` / managed identity | **unavailable** |
| Invite token (from reissue) | **not obtained** |

**SELF_MINT=FAIL** — cannot execute staff-mediated invitation flow on live Hub.

---

## Step results (PASS/FAIL)

| Step | Probe | Expected | Actual | Verdict |
|------|-------|----------|--------|---------|
| 1 | Staff POST `/api/pm/clients/SYN01/invitation/reissue` | **201** | **NOT_EXECUTED** (no staff Bearer) | **FAIL** |
| 2 | Staff POST `/api/client/invitations/redeem` | **403** | **NOT_EXECUTED** | **FAIL** |
| 3 | Unsigned redeem one-time token | **200** `signedClientSession=true` `ClientCode=SYN01` | **NOT_EXECUTED** (no invite token) | **FAIL** |
| 4 | GET `/client.json` (client session) | **200** `clientCode=SYN01` only | **NOT_EXECUTED** | **FAIL** |
| 5 | GET `/api/client/workspace` | **200** SYN01 | **NOT_EXECUTED** | **FAIL** |
| 6 | POST `/api/client/documents` (tiny synthetic) | **201** SYN01 | **NOT_EXECUTED** | **FAIL** |
| 7 | GET that document | **200** SYN01 | **NOT_EXECUTED** | **FAIL** |
| 8 | GET `/api/client/workspace/HFD01` + `/api/pm/clients/HFD01/desk.json` | **403/404** | **NOT_EXECUTED** (unsigned: **401** each — routes exist) | **FAIL** |
| 9 | GET `/operator.json` (client session) | **403** | **NOT_EXECUTED** | **FAIL** |
| 10 | Staff GET `/client` | **403** | **NOT_EXECUTED** | **FAIL** |
| 11 | Replay same invite token on `101b1a7` | record remint behavior | **NOT_EXECUTED** | **FAIL** |

**D44 overall: FAIL** (0/11 live entitled steps executed)

### Unsigned corroboration only (not mission steps)

| Probe | Code |
|-------|------|
| POST `/api/client/invitations/redeem` `{}` (no Bearer) | **400** `invalid_token` |
| GET `/client.json` (no Bearer) | **401** |
| GET `/api/client/workspace` (no Bearer) | **401** |

---

## Client A vs Client B

**INCONCLUSIVE** — entitled cross-client isolation (steps 3–8) not independently proven on live Hub this cycle. Cannot assert Client A cannot read Client B.

---

## LIVE_P0 (SYNQA client session surface)

| Layer | RT-proven | Count |
|-------|-----------|-------|
| Unsigned unauth on client routes | partial (401/400 only) | **0** confirmed open P0 |
| Entitled SYNQA session isolation (steps 1–11) | **NO** | **cannot assert 0** |

**LIVE_P0_CONFIRMED_OPEN=0**  
**LIVE_P0_ENTITLED_UNVERIFIED=YES**

---

## PR #36 note (replay)

Directive notes PR #36 (`4c57e36`) makes redeem one-time. On live `101b1a7`, replay remint behavior was **not recorded** (step 11 not executed). Per directive: do not treat replay remint as a real-client leak when observed.

---

## Do-not / compliance

- Did not clone D39–D43 artifact review.
- Did not deploy Elite or redeploy OD-005.
- Did not write ACCG01 or grant Sites.Selected.
- Did not print tokens or secrets.
- Did not recreate durable worker or wake V2.

---

## Artifacts

- `docs/red-team/artifacts/directive44_live_probes.txt`
- `docs/red-team/artifacts/directive44_live_hub_health.json`
- `docs/red-team/artifacts/directive44_ATLAS_HUB_COMMIT.txt`
- `docs/red-team/artifacts/directive44_hub_build.json`
- `/opt/cursor/artifacts/d44_completion_status.txt`
