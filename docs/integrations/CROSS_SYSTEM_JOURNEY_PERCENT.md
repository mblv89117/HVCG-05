# Cross-System Journey Percent — Directive 8

**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**BASED ON CURRENT SHA:** `f2e27a0973592cf324704047edcca2e878ce59ec`  
**BASED ON CURRENT RUN ID:** D7 FINISHED (`followup-accepted-2026-08-20T2100Z` → `795bbe7` / pin `f2e27a0`)  
**LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED:** **8**  
**SoT meaning lineage:** `773b510` (unchanged; `icp-studio.v1` + `outbound-dispatch.v1` additive)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **100%** (weighted: PASS=1.0 → 24.0 / 24)  
**Strict PASS-only:** **100%** (24 / 24)  
**Weakest boundary:** Live Hub XSYS-01/02 remain OPEN on `940a484` (not this train). No remaining PARTIAL journey steps.  
**Updated:** 2026-08-20T21:30:00Z

Live adapters stay gated. No production writes. No Hub thaw. No paid ads. `outbound-dispatch.v1` does not authorize live send.

## Current tips pinned

| System | Exact SHA | Joint evidence |
| --- | --- | --- |
| GTM | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` | GitHub MCP `get_commit` + `icp/model.ts` `06d1669f` + `icp/studio.ts` `5452b0bc` + `outbound/orchestrator.ts` `0e974d67` |
| Revenue | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | Unchanged vs D7 |
| GCC | `8d757cf68157a6054432de7ca57f8431731b2d64` | Unchanged vs D7 |
| Copilot | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | Unchanged vs D7 |
| OD-005 | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | Fetched read-only — unchanged |
| Contracts | `778defd2f1bb7f80f02a58b8b9cef5bf21919c0e` | This branch D8 pack; Supervisor independently 36/36 @ `f2e27a0` |

`CURRENT_PRODUCT_TIPS_TESTED_TOGETHER=YES` remains against these six SHAs. GTM tip still `f53e628` (D14). Red Team D28 `SECURITY_CERTIFIED=PASS` @ GTM `f53e628` (independent; not this retest).

## Supervisor 2115Z (cited) + this-worker GitHub MCP

- `packages/gtm-agent/src/icp/model.ts` @ `f53e628` file SHA **`06d1669fbb76c42be51f805fa418a630c0a29668`**: `ICP_MODEL_VERSION='icp.hvcg.v1'`; `icpModelSchema` (version, name, description, criteria, verticalHypotheses, `exclusions.sensitivePersonalTraits=true`).
- `packages/gtm-agent/src/icp/studio.ts` file SHA **`5452b0bc06e076a4ce07bc6c2a75f5903e4d49ee`**: `createIcpStudio` / `getActiveIcp` / `registerIcpRevision`.
- SYN-GTM marks `icp_studio` when `icp.version === ICP_MODEL_VERSION`.
- `packages/gtm-agent/src/outbound/orchestrator.ts` file SHA **`0e974d673dcedab38b4ee5bde823c7fba98187c8`**: `OutboundDispatchResult`; `createOutboundAdapter` always returns `dry_run_record_only` / `dispatched=false` in engineering.
- SYN-GTM marks dry-run outbound when `mode==='dry_run_record_only' && dispatched===false && recorded===true`.
- Flags remain `GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true`.

## Scoring

| Result | Count | Weight |
| --- | --- | --- |
| PASS | 24 | 24.0 |
| PARTIAL | 0 | 0.0 |
| NOT TESTED | 0 | 0.0 |
| BLOCKED | 0 | 0.0 |
| **Total** | **24** | **24.0 → 100%** |

`icp_studio` and dry-run outbound moved **PARTIAL → PASS** after SoT publish + harness + GTM `f53e628` producer cites. No fields invented.

## PRIMARY journey table (delta vs D7)

| # | Step | Result | File + SHA evidence |
| --- | ---: | --- | --- |
| 1 | icp_studio | **PASS** | SoT `icp-studio.v1`. Adapter `to_icp_studio_v1`. Producer: `icp/model.ts` `06d1669f` + `icp/studio.ts` `5452b0bc` @ `f53e628`. `version=icp.hvcg.v1`. `exclusions.sensitivePersonalTraits` const true. |
| 2–8 | company → form | **PASS** | Unchanged D7 early-funnel SoT coverage. |
| 9 | dry-run outbound | **PASS** | SoT `outbound-dispatch.v1`. Adapter `to_outbound_dispatch_v1` throws unless `dry_run_record_only && recorded && !dispatched`. Producer: `outbound/orchestrator.ts` `0e974d67` @ `f53e628`. No live-send success shape. |
| 10 | NURTURE | **PASS** | Unchanged. |
| 11 | BOOKING | **PASS** | Unchanged D7 `toBookingEventV1` @ `f53e628`. |
| 12–13 | ATLAS LEAD / OPPORTUNITY | **PASS** | Unchanged (`85def0e` / `9e5d10a`). |
| 14 | PRE-CALL BRIEF | **PASS** | Unchanged D5 coverage @ `fe3db75`. |
| 15–23 | Offer → GTM learning | **PASS** | Unchanged. |
| 24 | OPTIMIZATION VARIANT 2 | **PASS** | Unchanged D7 `hold_for_owner` / `mutatesPaidAds=false`. |

## Weakest boundary

1. **Security (not this train):** XSYS-01/02 OPEN on live Hub `940a484`. Remediation stays on `cursor/atlas-security-patch-od005` @ `9e5d10a`.
2. **Integration:** No remaining PARTIAL 24-step items. Live outbound remains unauthorized by schema const.

## Live / deploy

Live GTM outbound = **off**. Paid ads = **off**. `liveDispatch` = **false**. `dispatched` = **false**. `mutatesPaidAds` = **false**. `autoProvisionAccess` = **false**. No Hub thaw. No production deploy.
