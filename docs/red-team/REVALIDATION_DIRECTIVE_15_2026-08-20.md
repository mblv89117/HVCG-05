# Independent Red Team Revalidation — Directive 15

**Directive version:** 15  
**Train:** red-team  
**Based on SHA:** `97576c2bc23e3834ae1488e48422656cce894fa1`  
**Based on run:** `run-75ccd61c-6d51-406b-a509-7f245e4f86c1`  
**Published UTC:** 2026-08-20T06:42:00Z  
**Method:** Findings + regression probes only. No Hub deploy. No product feature implementation on frozen runtime.

---

## CURRENT SHAS TESTED

| System | Branch | Exact SHA | Role |
|--------|--------|-----------|------|
| Atlas OD-005 candidate | `cursor/atlas-security-patch-od005` | `bb7edae503d91e85fe8f5a6a69943aeed5579c3a` | Verify ATLAS-01/02/03 (+ XSYS residual) |
| GTM | `cursor/360-gtm-agent-system` | `bd720033a646a9b8775d6c5f17f001d182ad2632` | Verify GTM-03/04 |
| Revenue OS | `cursor/atlas-revenue-engagement-os` | `9c9c331d707e59c8e020f28bcaf75528bfe42927` | First-pass adversarial |

**Not retested (per directive):** GCC `41a59b8`, Copilot `19a200e`, Integration `773b510`, Hub `940a484`, Elite `75d0c59`.

---

## ATLAS / XSYS (OD-005 in scope — verify only)

| Finding ID | Frozen Hub `940a484` | OD-005 candidate `bb7edae` | Status |
|---|---|---|---|
| ATLAS-RT-20260820-01 | OPEN (unchanged; not redeployed) | **FIXED** | Staff short-circuit removed; harness exit 0 |
| ATLAS-RT-20260820-02 | OPEN on Hub | **FIXED** on candidate | Same entitlement path before patch |
| ATLAS-RT-20260820-03 | OPEN on Hub | **FIXED** on candidate | `jwtVerify` / `requireVerifiedPrincipal`; header-only → 401 |
| XSYS-RT-20260820-01 | OPEN | **OPEN** | OD-005 did **not** add intake body HMAC |
| XSYS-RT-20260820-02 | OPEN | **OPEN** | `fullPayload.idempotencyKey` still accepted unbound |

**Fail-safe:** Frozen live-cert remains PASS. OD-005 is **CANDIDATE ONLY — NOT DEPLOYED**. ATLAS P0s are closed on the security-patch tip for engineering gate purposes, but remain open against production Hub until OD-005 authorizes deploy. XSYS P0s block claiming full Hub security closure even on OD-005.

### Evidence / tests
- `node scripts/red-team/check-opportunity-staff-bypass.mjs <od005>` → exit **0**
- `npm test` in `apps/atlas-plaid-api` @ OD-005 → **PASS 6/6** (includes ATLAS-03 missing Bearer)
- `node scripts/red-team/check-d15-od005.mjs --od005 <od005>` → exit **3** (ATLAS fixed; XSYS still open)

---

## GTM-RT-03 / 04 @ `bd72003`

| ID | Claim | Independent result | Evidence |
|----|-------|--------------------|----------|
| GTM-RT-20260820-03 | Closed | **FIXED** | `packages/flags/src/pause.ts` unified SoT; desync fail-closed; publisher + atlas-handoff consume it |
| GTM-RT-20260820-04 | Closed | **FIXED** | `receive-inquiry.ts` validates camelCase governance; InquiryForm emits `governance.observationOnly` / `liveDispatch:false`; stager idempotent `360\|` |

### Tests
| Suite | Command | Result |
|-------|---------|--------|
| flags | `pnpm --filter @360gs/flags test` | **PASS 9/9** |
| atlas-handoff | `pnpm --filter @360gs/atlas-handoff test` | **PASS 5/5** |
| gtm-agent | `pnpm --filter @360gs/gtm-agent test` | **PASS 8/8** |

---

## REVENUE OS FIRST-PASS @ `9c9c331`

**Scope:** catalogs, pricing, proposals (`autoSend=false`), engagement economics, CC-001/002/003 adapters.

| Area | Result |
|------|--------|
| Hard gates (`gates.py`) | All production side-effect gates **false** (`liveDispatch`, `autoSendProposal`, `autoProvisionAccess`, `autonomousReferralPayout`, etc.) |
| Proposal auto-send | **Blocked** (BL-C1); tests assert `autoSend` false |
| Pricing | Observation-only recommendations; legacy ACCG lock preserved; `isApprovedPrice=false` |
| Referral | Collected-cleared only; autonomous payout forbidden |
| CC-001 | PascalCase-only rejected; camelCase accepted |
| CC-002 | Copilot advisory; commitment rejected |
| CC-003 | GCC handoff no auto-provision |

**New P0:** none  
**New P1:** none  
**P2 note (not inflated):** `accrue_success_fee(amount=…)` accepts caller float without band check — acceptable while `PRODUCTION_WRITES=false` / synthetic store; re-check if exposed on authenticated Hub APIs later.

### Tests
`python3 -m tests.revenue_os.run_revenue_os_suite` → **PASS 17/17** (after installing `jsonschema` in RT env).

---

## COUNT ROLLUP

| Metric | Value |
|--------|-------|
| PREVIOUS P0 (D12 status) | 5 (ATLAS×3 + XSYS×2) |
| ATLAS P0 FIXED on OD-005 candidate | **3** |
| ATLAS P0 still OPEN on frozen Hub | **3** (until authorized deploy) |
| XSYS P0 STILL OPEN | **2** (Hub + OD-005 tip) |
| PREVIOUS P1 | 2 (GTM-03/04) |
| P1 CLOSED this cycle | **2** (GTM-03/04 @ `bd72003`) |
| NEW P0 / NEW P1 | **0 / 0** |
| P2 | none filed (Revenue success-fee amount note only) |

**Independent P0/P1 before DEPLOYMENT_READY:** still **≠ 0** (XSYS-01/02; Hub ATLAS backlog pending OD-005 authorize).

---

## PREMIUM QA

**N/A** — Red Team docs/harness only; no RT UI changes.

---

## RESPONSIBLE TRAINS / RETEST

| Item | Owner |
|------|-------|
| Deploy OD-005 Hub/Elite security patch | Owner OD-005 authorization (not RT) |
| Close XSYS-01/02 (HMAC + idempotency prefix) | Atlas security patch follow-on |
| Revenue OS network/API auth if promoted beyond synthetic | Revenue OS |

---

## COMPLETION ATTESTATION

- LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED: **15**  
- Findings published with exact SHAs: **YES**  
- Status artifact updated: **YES**  
- Production deploy: **NONE**  
- Frozen Atlas not mutated: **YES**
