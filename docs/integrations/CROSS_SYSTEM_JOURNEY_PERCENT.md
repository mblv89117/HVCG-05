# Cross-System Journey Percent — Directive 3

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `a29c873729b0539505231c8b82e33b14f3ce2d49`  
**BASED ON CURRENT RUN ID:** `run-4497aaf8-2256-4d77-8905-2768cf566a61`  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **3**  
**SoT meaning:** `773b510` (unchanged; no semantic fork found)  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **27/27 OK**  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **NO**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **71%** (weighted: PASS=1.0, PARTIAL=0.5, BLOCKED/NOT TESTED=0 → 17.0 / 24)  
**Strict PASS-only:** **46%** (11 / 24)  
**Weakest boundary:** GTM `e0dd445` + Copilot `2f02702` sibling remotes **404** on this worker — early-funnel and Copilot product trees were not jointly source-executed with Revenue/GCC/OD-005/Contracts. Secondary (not this train): live Hub XSYS-01/02 still OPEN on `940a484`.  
**Updated:** 2026-08-20T19:50:00Z

This is an evidence pack. Live adapters stay gated. No production writes. No Hub thaw.

## Current tips pinned (read-only; not merged)

| System | Repo / branch | Exact SHA | This-worker source |
| --- | --- | --- | --- |
| GTM | `360-growth-solution` / `cursor/360-gtm-agent-system` | `e0dd445d60161601bd573435c9536d0385a25bdf` | **404** — cite supervisor 1936Z + last RT opened GTM files @ `7b704111` |
| Revenue | `hvcg-05` / `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Opened** — `git show 85def0e:…` |
| GCC | `growth-command-center` / `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Opened** — detached checkout equals remote tip |
| Copilot | `hvcg-agent-copilot` / `cursor/copilot-production-completion` | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` | **404** — cite supervisor 1936Z + RT D26 (`origin/cursor/platform-red-team-866c`) |
| OD-005 | `hvcg-05` / `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Opened** (read-only; XSYS live-P0 owner) |
| Contracts | `hvcg-05` / `cursor/platform-integration-contracts` | `a29c873729b0539505231c8b82e33b14f3ce2d49` | **This branch** |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=NO` because this environment did not jointly check out all six trees. Supervisor 1936Z independently source-inspected current tips; this pack cites that claim and independently confirms the four fetchable SHAs.

## Supervisor 1936Z — cite or correct

| Claim (directive) | This-worker result |
| --- | --- |
| GTM `liveDispatch` default **false** / paid ads default **false** / kill switch default **true** @ `e0dd445` | **Cited, not contradicted.** GTM tree not open here. SoT consts remain `liveDispatch:false` / `paidAdsEnabled:false` (`360-atlas-lead.v1.json`, `campaign-spec.v1.json` @ `a29c873`). Last RT-opened GTM files (`packages/flags/src/pause.ts`, `apps/web/app/_components/InquiryForm.tsx`, `packages/gtm-agent/src/atlas/receive-inquiry.ts`) @ `7b704111` (D19; **stale vs e0dd445**). |
| Copilot `jose.jwtVerify` + `/api/assessments` **401** @ `2f02702` | **Cited and corroborated by RT D26** (this repo): `src/middleware.ts` jose swap; `PUBLIC_API_PREFIXES` excludes `/api/assessments`; missing/invalid token → API 401. This worker did not open the Copilot tree. |
| GCC `autoProvisionAccess=false` @ `8d757cf` | **Confirmed.** `src/lib/handoff/atlas-activation.ts:62-63`, `src/app/api/handoff/atlas-activation/route.ts:18,71`. |
| `Sites.Manage.All` grant-like hits absent on Revenue / OD-005 **runtime** path | **Confirmed.** No grant assignment under `src/revenue_os/**` or `apps/atlas-integration-api/src/**` @ `85def0e` / `9e5d10a`. Deny-test: `apps/atlas-integration-api/tests/hub-capital-graph-allowlist.test.ts:166` (both SHAs). |

No semantic fork vs SoT `773b510`. `git diff 773b510 85def0e -- docs/integrations/schemas` is empty.

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 11 | 11.0 |
| PARTIAL | 12 | 6.0 |
| NOT TESTED | 1 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **17.0 → 71%** |

## PRIMARY journey table

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1 | TARGET ACCOUNT | **PARTIAL** | Contract: `docs/integrations/schemas/gtm-company-profile.v1.json` @ `a29c873`. Harness fixture: `tests/integrations/harness/journeys.py:61-70` Journey A. Product GTM @ `e0dd445` not opened (404). Supervisor 1936Z cited for GTM gates only. |
| 2 | GTM DISCOVERY | **PARTIAL** | No dedicated discovery schema. Implied by company profile + 360 ownership (`CROSS_SYSTEM_CONTRACTS.md` @ `a29c873`). GTM tree 404. |
| 3 | COMPANY RESEARCH | **PARTIAL** | Same schema/fixture as step 1 (`gtm-company-profile.v1.json` @ `a29c873`; `journeys.py:61-70`). GTM `e0dd445` 404. |
| 4 | PAIN HYPOTHESIS | **PARTIAL** | Schema published: `docs/integrations/schemas/pain-hypothesis.v1.json` @ `a29c873`. Journey A only carries `painHypotheses` strings on the company object (`journeys.py:67`) — standalone schema **not** exercised. GTM 404. |
| 5 | SCORE | **PARTIAL** | Schema: `docs/integrations/schemas/gtm-lead-score.v1.json` @ `a29c873`. **Not** in Journey A/B/C. GTM 404. |
| 6 | CAMPAIGN | **PARTIAL** | Schema+harness: `campaign-spec.v1.json` + `journeys.py:72-82` (`paidAdsEnabled: False`) @ `a29c873`. GTM product @ `e0dd445` 404; supervisor 1936Z paid-ads default false **cited**. Last RT file: `packages/flags/src/pause.ts` @ `7b704111` (stale). |
| 7 | FUNNEL | **PARTIAL** | Schema+harness: `funnel-spec.v1.json` + `journeys.py:84-96` @ `a29c873`. GTM 404. |
| 8 | FORM | **PARTIAL** | Schema+harness: `form-spec.v1.json` + `journeys.py:98-109` @ `a29c873`. Last RT camelCase form: `apps/web/app/_components/InquiryForm.tsx` + `packages/gtm-agent/src/atlas/receive-inquiry.ts` @ `7b704111` (stale vs `e0dd445`). |
| 9 | DRY-RUN OUTREACH | **PARTIAL** | No dedicated outreach schema. SoT forbids live dispatch (`360-atlas-lead.v1.json` `governance.liveDispatch` const false @ `a29c873`). Supervisor 1936Z: kill switch default **true** @ `e0dd445` (cited). Live GTM outbound **not** executed (forbidden). |
| 10 | NURTURE | **NOT TESTED** | No nurture contract in the registry. Not in Journey A/B/C. GTM tree 404. No current-tip file to cite. |
| 11 | BOOKING | **PARTIAL** | Schema: `docs/integrations/schemas/booking-event.v1.json` @ `a29c873` (envelope + idempotency). **Not** in Journey A/B/C. GTM 404. |
| 12 | ATLAS LEAD | **PASS** | SoT: `360-atlas-lead.v1.json`, `atlas-lead-intake.v1.json` @ `a29c873`. Harness: `journeys.py:111-144` + CC-001 tests in `tests/integrations/test_compatibility_adapters.py`. Revenue consumer: `src/revenue_os/compatibility.py` `accept_gtm_lead` / CC-001 @ `85def0e`. `liveDispatch` remains const false. |
| 13 | PROSPECT / OPPORTUNITY | **PASS** | SoT: `opportunity-commercial-context.v1.json` @ `a29c873`. Harness convert keys: `journeys.py:146-149`. Revenue commercial workspace / journey @ `src/revenue_os/journey.py:60+` @ `85def0e`. OD-005 convert residual: `apps/atlas-integration-api/tests/hub-pm-sharepoint.test.ts` @ `9e5d10a` (NORTH01, `entitlementProvisioned=false`; RT D23 34/0). |
| 14 | PRE-CALL BRIEF | **PARTIAL** | Schema: `docs/integrations/schemas/pre-call-brief.v1.json` @ `a29c873` (observation; not a CRM create). **Not** in Journey A/B/C. |
| 15 | REVENUE OFFER | **PASS** | SoT: `offer-recommendation.v1.json` (`observationOnly` const true) @ `a29c873`. Harness A/B: `journeys.py:151-163`, `310-320`. Revenue: `src/revenue_os/journey.py` `recommend_offer_observation` / `accept_offer` @ `85def0e`. CC-002: `compatibility.py:109-126` `commercialAuthority=revenue-os`. |
| 16 | PRICING | **PASS** | SoT: `pricing-recommendation.v1.json` @ `a29c873`. Harness B: `journeys.py:322-332`. Revenue: `src/revenue_os/pricing.py` via `journey.py:122-137` @ `85def0e`. |
| 17 | PROPOSAL | **PASS** | SoT: `proposal-context.v1.json` (`autoSend` false) @ `a29c873`. Harness A: `journeys.py:165-175`. Revenue: `src/revenue_os/proposals.py` via `journey.py:142-158` — SENT remains blocked (`AUTO_SEND_PROPOSAL=false` in `gates.py` @ `85def0e`). |
| 18 | CLOSED WON | **PASS** | SoT: `revenue-outcome.v1.json` @ `a29c873`. Harness C: `journeys.py:408-419`. Revenue synthetic journey docstring + `WON_ACTIVATES_CLIENT=false` / `WON_CREATES_GCC_TENANT=false` in `src/revenue_os/gates.py` @ `85def0e`. |
| 19 | ENGAGEMENT | **PASS** | SoT: `engagement-created.v1.json` @ `a29c873`. Harness A/B: `journeys.py:191-202`, `346-355`. Revenue: `src/revenue_os/engagements.py` @ `85def0e`. Distinct from Won and GCC tenant. |
| 20 | GOVERNED CLIENT ACTIVATION | **PASS** | SoT: `client-activation-event.v1.json` @ `a29c873`. Harness A: `journeys.py:217-227` (`provisionsEntitlements: False`, `autoProvisionsGcc: False`). Won ≠ Active (`gates.py` @ `85def0e`). |
| 21 | GCC HANDOFF | **PASS** | SoT: `atlas-to-gcc-handoff.v1.json` / `atlas-gcc-client-activation.v1.json` (`autoProvisionAccess` const false) @ `a29c873`. Harness A: `journeys.py:241-253`. GCC current tip: `src/lib/handoff/atlas-activation.ts` + route @ `8d757cf`. Revenue: `emit_gcc_handoff` @ `85def0e`. |
| 22 | GCC VALUE SIGNAL | **PASS** | SoT: `gcc-value-signal.v1.json` @ `a29c873` **byte-identical** to GCC `schemas/gcc-value-signal.v1.json` @ `8d757cf`. Adapter: `src/lib/cvos/value-signal-adapter.ts` `INTEGRATION_SOT_SHA=773b510…` (CC-006). Harness C + `test_cc006_adapter_maps_to_canonical`. RT D25 fixture: `canonical=gcc-value-signal.v1`, `autoProvisionAccess=false`. |
| 23 | GTM LEARNING | **PASS** | SoT: `closed-won-learning-event.v1.json` (`mutatesPaidAds` false) @ `a29c873`. Harness C: `journeys.py:433-447`. Revenue: `emit_closed_won_learning` in `src/revenue_os/compatibility.py` @ `85def0e`. GTM **consume** path @ `e0dd445` not opened; learning emit contract holds. |
| 24 | OPTIMIZATION VARIANT 2 | **PARTIAL** | Schemas: `experiment-spec.v1.json` (variants[]), `optimization-decision.v1.json` @ `a29c873`. **Not** in Journey A/B/C. GTM 404. Live paid-ads mutation forbidden (`mutatesPaidAds=false`). |

## Weakest boundary

1. **Integration (this pack):** `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=NO` — GTM + Copilot remotes unauthorized; early-funnel steps stay PARTIAL; NURTURE NOT TESTED.
2. **Security (not this train):** XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` is FIXED_REVALIDATED (RT D23) and must not be patched from this branch.

## Live / deploy (unchanged)

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false** in published contracts. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
