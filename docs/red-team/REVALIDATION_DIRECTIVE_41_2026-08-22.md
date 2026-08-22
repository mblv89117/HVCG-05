# Live Hub Client Portal Isolation — Orchestrator Directive 41 (2026-08-22)

**Train:** red-team / independent-validation  
**Directive:** 41  
**Status:** ISSUED — EXECUTE ONCE. **NOT a D39 clone.**  
**Mission:** `LIVE_CLIENT_PORTAL_ISOLATION` on Hub `e63279a8`  
**Published UTC:** 2026-08-22T07:10:00Z  
**Durable agent:** `bc-1d522892-3cbd-4c29-acd5-dd257acc866c`  
**Worker branch:** `hvcg-05` / `cursor/platform-red-team-866c`  
**PRIOR:** D39 CONSUMED=39 — not redone  

**Acknowledge:** Directive **41** consumed. Synthetic only. No deploy. No Elite deploy. No OD-005 redeploy. No secrets logged. No V3 bearer accepted. **Does not self-certify Hub as BUSINESS_USEFUL PASS.**

---

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| envVersion | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| buildId | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| `AZURE_CLIENT_ID` / `SECRET` / `TENANT_ID` / `SUBSCRIPTION_ID` | all **ABSENT** |
| AUTH_SESSION | **ABSENT** |
| SELF_MINT | **FAIL** (not attempted; no SP credentials) |

---

## Lineage gate

| Marker | Directive target | Live at probe (07:09Z) |
|--------|------------------|------------------------|
| `/health` commit | `e63279a8…` | `b707049c5cfaac1b0643327359a91200ac72879e` |
| `/ATLAS_HUB_COMMIT.txt` | `e63279a8…` | `b707049c…` |
| `/hub-build.json` gitSha / branch | `e63279a8…` | `b707049c…` / `cursor/hub-my-work-failclosed-7a6b` |
| OneDeploy cite (directive) | `66960454` | **not verified by RT** |

**LINEAGE_GATE=FAIL** — live Hub advanced past directive SHA between issuance and RT probe (~07:00Z `e63279a` → ~07:07Z `b707049c`, same feature branch). Probes below run against **current live** `b707049c`; entitled isolation on `e63279a8` was not reachable.

`authRequired=true`, `insecureDevAuth=false`.

---

## Probe results (exact status codes)

### 1) Unsigned fail-closed → **PASS**

All unsigned GET and POST probes returned **401** (Bearer required). Zero exceptions.

| Method | Path | Code |
|--------|------|------|
| GET | `/operator` | **401** |
| GET | `/desk` | **401** |
| GET | `/operator.json` | **401** |
| GET | `/api/pm/opportunities` | **401** |
| GET | `/api/pm/clients` | **401** |
| GET | `/api/pm/documents` | **401** |
| GET | `/api/pm/my-work` | **401** |
| GET | `/api/pm/clients/SYN01/portal` | **401** |
| GET | `/api/pm/clients/SYN01/workspace` | **401** |
| GET | `/api/pm/clients/SYN01/document-requests` | **401** |
| GET | `/api/pm/clients/{HFD01,ACCG01,CPL01,PDG01,KAVA01}/portal` | **401** each |
| GET | `/api/pm/clients/{HFD01,ACCG01,CPL01,PDG01,KAVA01}/workspace` | **401** each |
| GET | `/api/pm/clients/{HFD01,ACCG01}/document-requests` | **401** each |
| GET | `/api/pm/knowledge-ledger` | **401** |
| GET | `/api/pm/clients/SYN01/knowledge-ledger` | **401** |
| POST | `/api/pm/clients/{HFD01,ACCG01,CPL01,PDG01,KAVA01}/{portal,workspace,document-requests}` | **401** each (15 POSTs) |

**PROBE_1=PASS** (`PROBE1_FAIL_COUNT=0`)

### 2) SYN01-entitled non-staff `/operator` → **NOT_EXECUTED**

Expected: **403** staff-only. RT has no SYN01-entitled Bearer session (`AUTH_SESSION` absent). No staff mint. No `insecureDevAuth`.

**PROBE_2=NOT_EXECUTED**

### 3) SYN01 own portal vs foreign isolation → **NOT_EXECUTED**

Expected: SYN01 GET own `portal` / `workspace` / `document-requests` → **200**; foreign `HFD01` / `ACCG01` / `CPL01` / `PDG01` / `KAVA01` GET/POST → **404** or **403**. Not executed — no entitled session. No real client rows patched or mutated.

**PROBE_3=NOT_EXECUTED**

### 4) Knowledge ledger foreign invent → **NOT_EXECUTED**

Expected: ledger must not surface Hart / Prodigy / Christie / Kava / ACCG items for SYN01 scope. Not executed — no entitled session.

**PROBE_4=NOT_EXECUTED**

### 5) `/client` route → **NOT_LIVE** (does not fail Hub SHA)

| Path | Code | Record |
|------|------|--------|
| GET `/client` | **405** | **NOT_LIVE** per D41 rule 5 |

**PROBE_5=NOT_LIVE** (not a Hub SHA failure)

---

## LIVE_P0 (client portal surface only)

| Layer | RT-proven | Count |
|-------|-----------|-------|
| Unsigned unauth exposure (probe 1) | **YES** — all 401 | **0** open P0 |
| Entitled portal isolation (probes 2–4) | **NO** — AUTH_SESSION absent | **cannot assert 0**; no new P0 confirmed, no entitled leak disproven |

**LIVE_P0_CONFIRMED_OPEN (portal surface) = 0**  
**LIVE_P0_ENTITLED_UNVERIFIED = YES** (isolation not independently proven this cycle)

---

## D41 verdict

| Item | Result |
|------|--------|
| **D41 overall** | **FAIL** |
| Why | `LINEAGE_GATE=FAIL` on directive SHA `e63279a8`; probes 2–4 **NOT_EXECUTED** (no self-minted AUTH_SESSION) |
| Probe 1 unsigned | **PASS** |
| Probe 5 `/client` | **NOT_LIVE** (405) |
| BUSINESS_USEFUL / LIVE_CERT | **not claimed** |

---

## Do-not / compliance

- Did not redeploy Hub, Elite, or OD-005.
- Did not touch real client data (no entitled Bearer; no PATCH/POST with auth).
- Did not accept V3 bearer; did not log secrets.
- Did not enable `insecureDevAuth`.
- Did not self-certify Hub as BUSINESS_USEFUL PASS.

---

## Artifacts

- `docs/red-team/artifacts/directive41_live_probes.txt`
- `docs/red-team/artifacts/directive41_live_hub_health.json`
- `docs/red-team/artifacts/directive41_ATLAS_HUB_COMMIT.txt`
- `docs/red-team/artifacts/directive41_hub_build.json`
