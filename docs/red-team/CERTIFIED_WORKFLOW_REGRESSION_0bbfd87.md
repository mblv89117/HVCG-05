# Certified Frozen-Workflow Regression — OD-005 candidate `0bbfd87`

**Directive:** 22  
**Train:** red-team  
**Candidate branch:** `cursor/atlas-security-patch-od005`  
**Exact SHA:** `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05`  
**Published UTC:** 2026-08-20T15:08:00Z  
**Method:** Executable Hub/API suites only. No Hub deploy. D21 finding probes not re-run as the sole evidence.

**Live baseline (unchanged):** Hub `940a484` / Elite `75d0c59` — five LIVE P0s remain **OPEN**.

---

## Overall

| Gate | Result |
|------|--------|
| Candidate P0 / P1 (D21) | **0 / 0** FIXED_REVALIDATED (cited; not re-probed as sole D22 evidence) |
| Certified workflow regression | **PARTIAL** |
| ROLLBACK_READY | **YES** |
| OWNER_GATE_PREREQS | `CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PARTIAL ROLLBACK_READY=YES` |
| Production deploy requested | **NO** |

**Blocking residual for full REGRESSION=PASS:** Lead→Opportunity post-convert GET returns **404** for ACCG01-entitled staff after convert creates a new ClientCode (`NORTH01`) with `entitlementProvisioned=false`. Same fixture **PASS** on live Hub `940a484` via staff short-circuit. This is the intended ATLAS-01 entitlement behavior colliding with a certified fixture that assumes post-convert opportunity visibility without entitlement grant.

---

## Per-workflow results

| ID | Workflow | Result | Command | Exit | Notes |
|----|----------|--------|---------|------|-------|
| a | Auth fail-closed | **PASS** | `npx tsx --test tests/hub-auth.test.ts` | **0** | 26/26; missing/invalid principal deny |
| a′ | Plaid JWT fail-closed | **PASS** | `npm test` in `apps/atlas-plaid-api` | **0** | 6/6 incl. ATLAS-03 missing Bearer |
| b | RBAC / tenant isolation | **PASS** | `npx tsx --test tests/hub-entitlements.test.ts` (+ D21 cite) | **0** | 20/20; D21 staff-bypass harness exit 0 on candidate |
| c | Website intake → HVCG_Leads signed | **PASS** | `npx tsx --test tests/hub-website-leads.test.ts` | **0** | 9/9; invalid/missing sig 401; Bearer not substitute |
| d | Lead → Prospect → Opportunity | **PARTIAL** | `npx tsx --test tests/hub-pm-sharepoint.test.ts` | **1** | Convert **200** + Prospect created; post-convert `GET /api/pm/opportunities/{id}` **404** (fixture expects 200). Hub `940a484` same test **PASS**. Artifact: `directive22_sharepoint_etag.txt` |
| e | Opportunity Operations | **PASS** | covered in sharepoint suite siblings + capital ops | **0** on capital; sharepoint suite overall exit 1 due to (d) only | 33/34 other sharepoint tests PASS |
| f | Closed Won does not auto-activate Client | **PASS** | `npx tsx --test tests/hub-pm-client-activation.test.ts` | **0** | 3/3; won prospect → activation required |
| g | Governed Client Activation required | **PASS** | same as (f) | **0** | `classifyClientActivation` / notes round-trip |
| h | Capital recorded-only submit | **PASS** | `npx tsx --test tests/hub-capital-operations.test.ts` | **0** | 7/7; audit `recordedOnly=true externalSubmit=false` |
| i | ETag / immutability | **PASS** | etag paths in `hub-pm-sharepoint.test.ts` + website MemoryGraph | suite exit 1 from (d) only | Converted PATCH deny / If-Match cases among 33 PASS |
| j | Search authorization | **PASS** | `npx tsx --test tests/hub-pm-search-redteam.test.ts` | **0** | 13/13 |
| k | No Sites.Manage.All / synthetic Graph off / no ACCG01 writes | **PASS** | `hub-pm-graph-transport-hardening` + `hub-capital-redteam` + `hub-security-config` | **0** | allowlist before Graph; SYN01↔ACCG01 isolation; capital redteam 12/12 |

### Full Hub API suite (aggregate)

| Command | Exit | Counts |
|---------|------|--------|
| `npm test` in `apps/atlas-integration-api` @ `0bbfd87` | **1** | **322 pass / 1 fail** (same convert+GET opportunity case) |

Artifacts: `docs/red-team/artifacts/directive22_*.txt`

---

## Rollback attestation (not executed)

| Artifact | Status |
|----------|--------|
| `deployment/scripts/Rollback-HVCGCapitalHub.ps1` | **EXISTS** on candidate tree |
| `deployment/artifacts/hub-rollback/pre-940a484-from-b6a3c9c.zip` | **MISSING** (path gitignored; directory absent in checkout — expected for agents) |
| Prior Hub SHA `b6a3c9c50747f3bc06b0de870d9906c4b9424152` | **RECORDED** in `docs/ATLAS_LIVE_RELEASE_2026-08-20.md` and `docs/ATLAS_PRODUCTION_CERTIFICATION_2026-08-20.md` |

**ROLLBACK_READY = YES** — script exists, prior Hub SHA recorded, steps describable without execution:

1. Ensure Azure CLI session is expected tenant/subscription (script-enforced).
2. Prefer WhatIf: `pwsh -File ./deployment/scripts/Rollback-HVCGCapitalHub.ps1` (default).
3. Supply `-RollbackZip` to `pre-940a484-from-b6a3c9c.zip` (or newest `pre-*.zip` under gitignored `deployment/artifacts/hub-rollback/`).
4. With explicit `-Apply`: `az webapp deploy` of that zip; delete `INTEGRATION_CAPITAL_*` app settings as a set.
5. Does **not** delete SharePoint lists/columns; does **not** revoke PM entitlements map by default.

**Not executed** in this run. Zip binary not present in this environment (gitignored).

---

## Dual-surface findings (unchanged from D21)

| ID | Live Hub `940a484` | Candidate `0bbfd87` |
|----|--------------------|---------------------|
| ATLAS-01/02/03 | OPEN | FIXED_REVALIDATED |
| XSYS-01/02 | OPEN | FIXED_REVALIDATED |

Live production P0 count remains **5**.

---

## Recommended owner follow-up (not implemented by RT)

Update certified convert fixture (or grant) so post-convert opportunity GET is asserted under an entitled principal for the **proposed** ClientCode, or explicitly expect 404 until governed entitlement provisioning — without reintroducing staff short-circuit.
