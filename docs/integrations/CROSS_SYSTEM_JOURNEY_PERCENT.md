# Cross-System Journey Percent — Directive 5

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `8fb9af7cafe905c29f8277bfe5959d3c29d8e505`  
**BASED ON CURRENT RUN ID:** `run-b871ffb0-643b-4bee-ac4e-25d48d5584c1` (D4 FINISHED)  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **5**  
**SoT meaning:** `773b510` (unchanged; `nurture-plan.v1` additive)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **77%** (weighted: PASS=1.0, PARTIAL=0.5 → 18.5 / 24)  
**Strict PASS-only:** **54%** (13 / 24)  
**Weakest boundary:** Early-funnel / booking / optimization-variant-2 remain PARTIAL (no new executable product evidence this directive). Live Hub XSYS-01/02 remain OPEN on `940a484` (not this train).  
**Updated:** 2026-08-20T20:40:00Z

Live adapters stay gated. No production writes. No Hub thaw.

## Current tips pinned

| System | Exact SHA | Joint evidence |
| --- | --- | --- |
| GTM | `14d8e4dac3945d91e404d055a68a2f925a736fb4` | GitHub MCP opened (this worker git remote 404) |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | This worker fetched — unchanged |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | Unchanged vs D4 |
| Copilot | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | GitHub MCP + Supervisor V2 2030Z |
| OD-005 | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | This worker fetched read-only — unchanged |
| Contracts | `8fb9af7cafe905c29f8277bfe5959d3c29d8e505` | This branch based-on; Supervisor 28/28 @ 2030Z |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` is against these six SHAs — not the stale D4 pair `e0dd445` / `2f02702`.

## Supervisor V2 2030Z (cited)

- Copilot `fe3db75`: enrichment GET/POST 401 without session; `observationOnly=true`; `liveDispatch=false`; `commercialAuthority=revenue-os`.
- Harness independently 28/28 @ `8fb9af7` (pre-D5). This pack adds pre-call-brief coverage.
- GTM `14d8e4d` / Revenue / GCC / OD-005 as table above.

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 13 | 13.0 |
| PARTIAL | 11 | 5.5 |
| NOT TESTED | 0 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **18.5 → 77%** |

PRE-CALL BRIEF moved **PARTIAL → PASS** after Journey B fixture + `test_pre_call_brief_observation_only` + Copilot `toIntegrationPreCallBrief` @ `fe3db75`. NURTURE stays **PASS**.

## PRIMARY journey table (delta vs D4)

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1–9 | Early GTM (target → dry-run) | **PARTIAL** | SoT + Journey A. Product @ `14d8e4d` via GitHub MCP (`.env.example` liveDispatch/paid ads/kill switch). No new executable early-funnel depth. |
| 10 | NURTURE | **PASS** | Unchanged coverage. GTM `nurturePlanSchema` file SHA `0c1ed052` @ `14d8e4d` matches D4. Journey A + `test_nurture_plan_observation_only`. |
| 11 | BOOKING | **PARTIAL** | `booking-event.v1.json` published; not in Journey A/B/C. |
| 12–13 | ATLAS LEAD / OPPORTUNITY | **PASS** | Unchanged (`85def0e` / `9e5d10a`). |
| 14 | PRE-CALL BRIEF | **PASS** | SoT `pre-call-brief.v1`. Harness: Journey B + `test_pre_call_brief_observation_only` + adapter `to_integration_pre_call_brief`. Product: Copilot `toIntegrationPreCallBrief` + `docs/copilot/pre-call-brief-fixture-d26.json` @ `fe3db75`. `observationOnly=true`; `ownerSystem=copilot`; no commercial authority. |
| 15–23 | Offer → GTM learning | **PASS** | Unchanged on Revenue `85def0e` / GCC `8d757cf`. |
| 24 | OPTIMIZATION VARIANT 2 | **PARTIAL** | `experiment-spec.v1` / `optimization-decision.v1`; not in harness. |

## Weakest boundary

1. **Integration:** Early-funnel / booking / optimization-variant-2 still PARTIAL (no new executable evidence).
2. **Security (not this train):** XSYS-01/02 OPEN on live Hub `940a484`.

## Live / deploy

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false**. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
