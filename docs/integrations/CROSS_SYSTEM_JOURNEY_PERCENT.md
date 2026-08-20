# Cross-System Journey Percent — Directive 4

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `d57a780d6e1b2240b7797393980bcd0429746489`  
**Schema-probe run (ignore):** `run-e9674448-8c8c-4b01-b09a-edafa99bb6a9`  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **4**  
**SoT meaning:** `773b510` (unchanged; `nurture-plan.v1` additive)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **75%** (weighted: PASS=1.0, PARTIAL=0.5 → 18.0 / 24)  
**Strict PASS-only:** **50%** (12 / 24)  
**Weakest boundary:** Early-funnel product depth still PARTIAL (GTM tree not opened **on this worker**; Supervisor 2013Z cited). Live Hub XSYS-01/02 remain OPEN on `940a484` (not this train).  
**Updated:** 2026-08-20T20:25:00Z

Live adapters stay gated. No production writes. No Hub thaw.

## Current tips pinned

| System | Exact SHA | Joint evidence |
| --- | --- | --- |
| GTM | `e0dd445d60161601bd573435c9536d0385a25bdf` | Supervisor V2 2013Z opened (this worker 404) |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | This worker fetched |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | This worker fetched |
| Copilot | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` | Supervisor V2 2013Z + RT D26 (this worker 404) |
| OD-005 | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | This worker fetched read-only |
| Contracts | `189281a07f407b93253d7b552569b2a814a8bfb7` | This branch D4 pack; Supervisor 2013Z harness 27/27 @ `d57a780` |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` reconciles the D3 SoT matrix (`NO`) with Supervisor 2013Z + attestation `ORCHESTRATOR_D3_SIBLING_TIP_ATTESTATION.md` @ `d57a780`.

## Supervisor V2 2013Z (cited)

- GTM: `GTM_LIVE_DISPATCH_ENABLED` default false; `PAID_ADS_ENABLED` default false; `GTM_KILL_SWITCH` default true; InquiryForm + receive-inquiry + atlas-handoff `liveDispatch` literal false; `nurture/engine.ts` `createNurturePlan` exists.
- Copilot: `jose.jwtVerify` in middleware + session; `/api/assessments` GET/POST 401.
- Revenue / GCC / OD-005 unchanged vs D3.

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 12 | 12.0 |
| PARTIAL | 12 | 6.0 |
| NOT TESTED | 0 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **18.0 → 75%** |

NURTURE moved **NOT TESTED → PASS** after `nurture-plan.v1` + Journey A fixture + Supervisor 2013Z `createNurturePlan`.

## PRIMARY journey table (delta vs D3)

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1–9 | Early GTM (target → dry-run) | **PARTIAL** | SoT schemas + Journey A @ this branch. Product files @ `e0dd445` cited via Supervisor 2013Z (`liveDispatch`/`paidAds`/kill switch). |
| 10 | NURTURE | **PASS** | SoT: `docs/integrations/schemas/nurture-plan.v1.json` matching GTM `nurturePlanSchema.strict()` (GitHub MCP opened `packages/gtm-agent/src/nurture/engine.ts` @ `e0dd445`). Harness: Journey A + `test_nurture_plan_observation_only`. `goal=prepare_lead_before_manny_call`; observation-only; no live send. |
| 11 | BOOKING | **PARTIAL** | `booking-event.v1.json` published; not in Journey A/B/C. |
| 12–13 | ATLAS LEAD / OPPORTUNITY | **PASS** | Unchanged vs D3 (`a29c873`/`85def0e`/`9e5d10a`). |
| 14 | PRE-CALL BRIEF | **PARTIAL** | Schema published; not in Journey A/B/C. |
| 15–23 | Offer → GTM learning | **PASS** | Unchanged vs D3 on Revenue `85def0e` / GCC `8d757cf`. |
| 24 | OPTIMIZATION VARIANT 2 | **PARTIAL** | `experiment-spec.v1` / `optimization-decision.v1`; not in harness. |

Full D3 file+SHA rows for PASS commercial/GCC steps still apply (`85def0e`, `8d757cf`, `9e5d10a`).

## Weakest boundary

1. **Integration:** Early-funnel product source still citation-only on this worker (404). Joint TESTED_TOGETHER is YES via Supervisor 2013Z.
2. **Security (not this train):** XSYS-01/02 OPEN on live Hub `940a484`.

## Live / deploy

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false**. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
