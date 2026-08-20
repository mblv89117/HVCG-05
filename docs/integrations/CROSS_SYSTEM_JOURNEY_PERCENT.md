# Cross-System Journey Percent — Directive 7

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `d6aff599569a23b6d3501c361925a15c83e0826d`  
**BASED ON CURRENT RUN ID:** D6 FINISHED (`followup-accepted-2026-08-20T2045Z` → `d6aff59`)  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **7**  
**SoT meaning:** `773b510` (unchanged; no semantic fork)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **96%** (weighted: PASS=1.0, PARTIAL=0.5 → 23.0 / 24)  
**Strict PASS-only:** **92%** (22 / 24)  
**Weakest boundary:** `icp_studio` and dry-run outbound remain PARTIAL (no Integration SoT schema; depth not invented). Live Hub XSYS-01/02 remain OPEN on `940a484` (not this train).  
**Updated:** 2026-08-20T21:15:00Z

Live adapters stay gated. No production writes. No Hub thaw. No paid ads.

## Current tips pinned

| System | Exact SHA | Joint evidence |
| --- | --- | --- |
| GTM | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` | GitHub MCP `get_commit` on `cursor/360-gtm-agent-system` — D14 landed; do not pin `14d8e4d` |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | This worker fetched — unchanged |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | Unchanged vs D6 |
| Copilot | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | Unchanged vs D6 |
| OD-005 | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | This worker fetched read-only — unchanged |
| Contracts | `795bbe7d9d03673bd39eba1bb2d423a14c4e30af` | This branch D7 pack; Supervisor independently 34/34 @ `d6aff59` |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` is against these six SHAs — GTM **must** be `f53e628`, not `14d8e4d`.

## Supervisor 2100Z (cited) + this-worker GitHub MCP

- GTM `packages/gtm-agent/src/atlas/journey-sot.ts` @ `f53e628` file SHA **`6d8d5410c31527af61d77bb80301a12fc9600ba3`**.
- `toBookingEventV1` throws unless `dryRun===true`; idempotency `booking|{bookingId}`; liveDispatch impossible.
- `toExperimentSpecV1` maps Variant 2; `paidAdsEnabled` const false; `rolled_back` → SoT `abandoned`.
- `toOptimizationDecisionV1` `decision=hold_for_owner`; `mutatesPaidAds` const false.
- Flags: `GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true` (`.env.example` file SHA `8e92dfa6`).
- SYN-GTM marks: `icp_studio`, `company_discovered`, `researched`, `pain_hypotheses`, `score`, `campaign`, `personalized_funnel`, `form`.
- Harness independently 34/34 @ `d6aff59` (D6). This pack retargets adapters to `f53e628` and adds early-funnel schema/adapter tests.

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 22 | 22.0 |
| PARTIAL | 2 | 1.0 |
| NOT TESTED | 0 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **23.0 → 96%** |

BOOKING and OPTIMIZATION VARIANT 2 stay **PASS**, now cited against landed `journey-sot.ts` @ `f53e628` (not D6 `14d8e4d` marks). Early-funnel marks with existing SoT schemas moved **PARTIAL → PASS**. `icp_studio` and dry-run outbound stay **PARTIAL**.

## PRIMARY journey table (delta vs D6)

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1 | icp_studio | **PARTIAL** | SYN-GTM marks `icp.version === ICP_MODEL_VERSION` @ `f53e628`. **No Integration SoT schema** on meaning `773b510`. Depth not invented. |
| 2 | company_discovered | **PASS** | SoT `gtm-company-profile.v1`. Adapter `to_gtm_company_profile_v1` + `test_syn_gtm_early_funnel_marks_map_to_sot`. Producer: SYN-GTM `SYN-GTM-001` + `toGtmCompanyProfileV1` in `integration-sot.ts` `82a37dc6` @ `f53e628`. |
| 3 | researched | **PASS** | Same SoT/adapter. Producer `researchCompany` profile → `toGtmCompanyProfileV1` (no invented `atlasClientCode`). |
| 4 | pain_hypotheses | **PASS** | SoT `pain-hypothesis.v1`. SYN-GTM `status === 'HYPOTHESIS'`. `test_early_funnel_marks_stay_observation_only` rejects `observationOnly=false`. |
| 5 | score | **PASS** | SoT `gtm-lead-score.v1`. Mirror `toGtmLeadScoreV1` @ `f53e628`. `observationOnly=true`. |
| 6 | campaign | **PASS** | SoT `campaign-spec.v1`. GTM producer `running_dry` maps to SoT `ready` (never `live`). `paidAdsEnabled` const false. |
| 7 | personalized_funnel | **PASS** | SoT `funnel-spec.v1`. SYN-GTM `compiled.pages.length > 0`. Journey A + adapter test. |
| 8 | form | **PASS** | SoT `form-spec.v1`. SYN-GTM `generateDynamicForm` mark. Journey A + adapter test. |
| 9 | dry-run outbound | **PARTIAL** | SYN-GTM marks `dry_run_record_only`. **No Integration outbound-dispatch SoT**. Flags remain off. Depth not invented. |
| 10 | NURTURE | **PASS** | Unchanged D4/D6 coverage. |
| 11 | BOOKING | **PASS** | Landed `toBookingEventV1` @ `f53e628` `6d8d541`. Harness mirrors throw-unless-dryRun; idempotency `booking\|{meetingId}`. |
| 12–13 | ATLAS LEAD / OPPORTUNITY | **PASS** | Unchanged (`85def0e` / `9e5d10a`). |
| 14 | PRE-CALL BRIEF | **PASS** | Unchanged D5 coverage @ `fe3db75`. |
| 15–23 | Offer → GTM learning | **PASS** | Unchanged on Revenue `85def0e` / GCC `8d757cf`. |
| 24 | OPTIMIZATION VARIANT 2 | **PASS** | Landed `toExperimentSpecV1` / `toOptimizationDecisionV1` @ `f53e628` `6d8d541`. `decision=hold_for_owner`; `mutatesPaidAds` const false. |

## Weakest boundary

1. **Integration:** `icp_studio` (no SoT schema) and dry-run outbound (no outbound-dispatch SoT). Not invented this directive.
2. **Security (not this train):** XSYS-01/02 OPEN on live Hub `940a484`. Remediation stays on `cursor/atlas-security-patch-od005` @ `9e5d10a`.

## Live / deploy

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false**. `mutatesPaidAds` = **false**. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
