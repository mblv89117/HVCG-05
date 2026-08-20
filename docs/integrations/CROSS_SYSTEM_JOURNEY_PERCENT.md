# Cross-System Journey Percent — Directive 6

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `516553f18ac43085f704632f1b54ad94da5eed41`  
**BASED ON CURRENT RUN ID:** D5 FINISHED (`followup-accepted-2026-08-20T2030Z` → `516553f`)  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **6**  
**SoT meaning:** `773b510` (unchanged; no semantic fork)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **81%** (weighted: PASS=1.0, PARTIAL=0.5 → 19.5 / 24)  
**Strict PASS-only:** **63%** (15 / 24)  
**Weakest boundary:** Early-funnel remains PARTIAL (no new executable depth). Live Hub XSYS-01/02 remain OPEN on `940a484` (not this train).  
**Updated:** 2026-08-20T21:10:00Z

Live adapters stay gated. No production writes. No Hub thaw. No paid ads.

## Current tips pinned

| System | Exact SHA | Joint evidence |
| --- | --- | --- |
| GTM | `14d8e4dac3945d91e404d055a68a2f925a736fb4` | GitHub MCP `get_commit` on `cursor/360-gtm-agent-system` — tip still `14d8e4d` (D14 not landed) |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | This worker fetched — unchanged |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | Unchanged vs D5 |
| Copilot | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | GitHub MCP + Red Team D27 `SECURITY_CERTIFIED=PASS` (not this train's retest) |
| OD-005 | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | This worker fetched read-only — unchanged |
| Contracts | this D6 pack (pin follows) | Based-on `516553f`; Supervisor independently 30/30 @ `516553f` |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` is against these six SHAs — not the stale D4 pair `e0dd445` / `2f02702`.

## Supervisor 2045Z (cited) + this-worker GitHub MCP

- GTM `packages/gtm-agent/src/journey/synthetic.ts` @ `14d8e4d` file SHA `c0a6d09`: `mark('booking', booking.ok === true && booking.ok && booking.dryRun === true)` with `requestId: 'book-syn-1'`.
- Same file marks `optimization_variant2` when `opt.variant.campaignId.includes('-v2')` and `opt.experiment.status === 'rolled_back'`.
- GTM `packages/gtm-agent/src/optimization/engine.ts` @ `14d8e4d` file SHA `9b4572ad`: Variant 2 exists; live Level 4 refused (`rolled_back` when wins below promote threshold or kill switch / autonomy gate).
- Harness independently 30/30 @ `516553f` (D5). This pack adds booking + optimization-variant-2 coverage.
- Red Team D27 Copilot `SECURITY_CERTIFIED=PASS` @ `fe3db75` (not this train's retest).

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 15 | 15.0 |
| PARTIAL | 9 | 4.5 |
| NOT TESTED | 0 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **19.5 → 81%** |

BOOKING and OPTIMIZATION VARIANT 2 moved **PARTIAL → PASS** after Journey A/C fixtures + dedicated schema/adapter tests + GTM `14d8e4d` producer evidence. NURTURE and PRE-CALL BRIEF stay **PASS**. Early-funnel stays **PARTIAL**.

## PRIMARY journey table (delta vs D5)

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1–9 | Early GTM (target → dry-run) | **PARTIAL** | SoT + Journey A. Product @ `14d8e4d` via GitHub MCP (`.env.example` liveDispatch/paid ads/kill switch). No new executable early-funnel depth this directive. |
| 10 | NURTURE | **PASS** | Unchanged coverage. GTM `nurturePlanSchema` file SHA `0c1ed052` @ `14d8e4d`. Journey A + `test_nurture_plan_observation_only`. |
| 11 | BOOKING | **PASS** | SoT `booking-event.v1`. Harness: Journey A (`booking\|book-syn-1`) + `test_booking_event_dry_run_idempotent` + adapter `to_integration_booking_event`. Producer: GTM `synthetic.ts` SYN-GTM `requestId: 'book-syn-1'` `dryRun===true` @ `14d8e4d` (`c0a6d09`). `additionalProperties: false` rejects `liveDispatch`. |
| 12–13 | ATLAS LEAD / OPPORTUNITY | **PASS** | Unchanged (`85def0e` / `9e5d10a`). |
| 14 | PRE-CALL BRIEF | **PASS** | Unchanged D5 coverage. Copilot `toIntegrationPreCallBrief` @ `fe3db75`. |
| 15–23 | Offer → GTM learning | **PASS** | Unchanged on Revenue `85def0e` / GCC `8d757cf`. |
| 24 | OPTIMIZATION VARIANT 2 | **PASS** | SoT `experiment-spec.v1` + `optimization-decision.v1`. Harness: Journey C + `test_optimization_decision_cannot_mutate_paid_ads` + adapters `to_integration_experiment_spec` / `to_integration_optimization_decision`. Producer: `runOptimizationCycle` Variant 2 (`campaignId` `-v2`, experiment `rolled_back`, live Level 4 refused) @ `14d8e4d` (`engine.ts` `9b4572ad`). `mutatesPaidAds` const false. `paidAdsEnabled` const false. |

## Weakest boundary

1. **Integration:** Early-funnel (steps 1–9) still PARTIAL — no new executable depth invented this directive.
2. **Security (not this train):** XSYS-01/02 OPEN on live Hub `940a484`. Remediation stays on `cursor/atlas-security-patch-od005` @ `9e5d10a`.

## Live / deploy

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false**. `mutatesPaidAds` = **false**. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
