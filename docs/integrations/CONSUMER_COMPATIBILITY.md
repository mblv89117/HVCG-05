# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged; no semantic fork)  
**Contracts self tip:** this D7 pack (pin follows; based-on `d6aff59`)  
**Directive consumed:** **7**  
**Replacement worker:** `bc-0e3c9a74` · based-on D6 FINISHED `d6aff59`  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **96%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **36/36 OK**  
**Updated:** 2026-08-20T21:15:00Z

D6 published TESTED_TOGETHER=YES against GTM `14d8e4d`. GTM D14 has landed; tip is now `f53e628`. This matrix **must** pin GTM `f53e628` and consume landed `journey-sot.ts` adapters. Sibling git remotes still 404 here; GitHub MCP + Supervisor **2100Z** opened the new tip.

This train does not implement product runtime. Product adapters are allowed; consumers must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 7)

| Consumer | Repo | Branch | Declared tip | This-worker fetch | Joint evidence |
| --- | --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` | git remote **404** | GitHub MCP `get_commit` + `atlas/journey-sot.ts` `6d8d541` + `.env.example` |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** | Unchanged vs D6 |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** (prior) | Unchanged vs D6 |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | git remote **404** | Unchanged vs D6 |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only | Unchanged |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | this D7 pack | **This branch** | Based-on `d6aff59`; Supervisor independently 34/34 @ `d6aff59` |

No second Integration worker. Orchestrator control-plane was not pushed. Do not revert to `14d8e4d` / `516553f` / `2f02702`.

## Supervisor 2100Z — cited (sibling remotes still 404 here)

| Claim | Disposition |
| --- | --- |
| GTM tip moved `14d8e4d` → `f53e628` | **Opened.** `get_commit` on `cursor/360-gtm-agent-system` = `f53e628`. |
| `toBookingEventV1` throws unless `dryRun===true` | **Opened.** `journey-sot.ts` `6d8d541`. Harness mirrors the throw. |
| Idempotency `booking|{bookingId}`; liveDispatch impossible | **Opened + harness.** `additionalProperties: false`. |
| `toOptimizationDecisionV1` `decision=hold_for_owner` | **Opened + harness.** D6 `kill` mapping retired in favor of landed adapter. |
| `mutatesPaidAds` / `paidAdsEnabled` const false | **Opened + schema const.** |
| Flags remain off @ `f53e628` | **Opened.** `.env.example` `8e92dfa6`. |
| SYN-GTM early-funnel marks | **Cited.** Adapter tests for marks that already have SoT schemas. |
| Harness 34/34 @ `d6aff59` | **Cited.** This pack grew to 36/36. |
| Revenue / GCC / Copilot / OD-005 unchanged | **Reconfirmed.** |

## Contract hold / no-fork confirmation

| ID | Holds? | Evidence |
| --- | --- | --- |
| **CC-001** | **YES** | camelCase SoT + harness. GTM `liveDispatch` remains false @ `f53e628`. |
| **CC-002** | **YES** | Revenue `85def0e` remains commercial SoR. Copilot `fe3db75` `commercialAuthority=revenue-os`. |
| **CC-003** | **YES** | GCC `8d757cf` `autoProvisionAccess=false` (unchanged). |
| **CC-006** | **YES** | `gcc-value-signal.v1` unchanged @ `8d757cf`. |

Landed GTM adapters cite Integration meaning `773b510`. `toOptimizationDecisionV1` emits SoT-legal `hold_for_owner` (not a new enum). Experiment status map is adapter-only.

## Booking / optimization (directive 7 — landed adapters)

Producer: `packages/gtm-agent/src/atlas/journey-sot.ts` @ `f53e628` file SHA `6d8d541`.

- `toBookingEventV1` — dry-run required; `booking|{meetingId}`; `operation=stage`; `meetingProvider=microsoft_calendar_mock`
- `toExperimentSpecV1` — Variant 2 `campaignId` `-v2`; `paidAdsEnabled=false`; `rolled_back` → `abandoned`
- `toOptimizationDecisionV1` — `decisionId=dec-{experimentId}`; `decision=hold_for_owner`; `mutatesPaidAds=false`

## Early-funnel (directive 7)

Executable SoT coverage added only for SYN-GTM marks that already have schemas: company profile, pain hypothesis, lead score, campaign, funnel, form. `icp_studio` has no SoT schema — left PARTIAL. Dry-run outbound has no outbound-dispatch SoT — left PARTIAL.

## Pre-call brief / nurture

Unchanged since D5 / D4. Journey A/B coverage kept.

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| `mutatesPaidAds` | **false** |
| Hub / Elite production | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** (GTM `f53e628` + current sibling tips) |
| `SYNTHETIC_CERTIFIED` | harness green |
| `SECURITY_CERTIFIED` | **Not this branch** |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security

XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` FIXED_REVALIDATED (RT D23). Not patched here. No `Sites.Manage.All`.
