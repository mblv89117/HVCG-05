# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged; no semantic fork)  
**Contracts self tip:** `5f177f0aeddbb258e288a97036a190cdeb5b968b` (based-on `516553f`)  
**Directive consumed:** **6**  
**Replacement worker:** `bc-0e3c9a74` · based-on D5 FINISHED `516553f`  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **81%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **34/34 OK**  
**Updated:** 2026-08-20T21:10:00Z

D5 published TESTED_TOGETHER=YES against current tips and added pre-call-brief harness. BOOKING and OPTIMIZATION VARIANT 2 remained PARTIAL because they were not in Journey A/B/C. This matrix keeps the **current** six SHAs and adds booking + Variant 2 harness evidence. Sibling git remotes still 404 here; GitHub MCP + Supervisor **2045Z** opened GTM `synthetic.ts` + `optimization/engine.ts` @ `14d8e4d`.

This train does not implement product runtime. Product adapters are allowed; consumers must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 6)

| Consumer | Repo | Branch | Declared tip | This-worker fetch | Joint evidence |
| --- | --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `14d8e4dac3945d91e404d055a68a2f925a736fb4` | git remote **404** | GitHub MCP `get_commit` confirms tip still `14d8e4d`; opened `journey/synthetic.ts` + `optimization/engine.ts` |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** | Unchanged vs D5 |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** (prior) | Unchanged vs D5 |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | git remote **404** | GitHub MCP + Red Team D27 `SECURITY_CERTIFIED=PASS` (not this retest) |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only | Unchanged |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | `5f177f0aeddbb258e288a97036a190cdeb5b968b` | **This branch** | D6 pack; Supervisor independently 30/30 @ `516553f` |

No second Integration worker. Orchestrator control-plane was not pushed.

## Supervisor 2045Z — cited (sibling remotes still 404 here)

| Claim | Disposition |
| --- | --- |
| GTM SYN-GTM booking `dryRun===true` @ `14d8e4d` | **Opened.** `packages/gtm-agent/src/journey/synthetic.ts` file SHA `c0a6d09`: `requestId: 'book-syn-1'`; `mark('booking', … dryRun === true)`. |
| GTM Variant 2 `campaignId -v2` + experiment `rolled_back` | **Opened.** Same file `optimization_variant2` mark. |
| GTM `runOptimizationCycle` Variant 2; live Level 4 refused | **Opened.** `packages/gtm-agent/src/optimization/engine.ts` file SHA `9b4572ad`. |
| GTM live outbound / paid ads remain off @ `14d8e4d` | **Opened (D5).** `.env.example`: `GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true`. |
| Harness 30/30 @ `516553f` | **Cited.** This directive extends coverage (booking + opt-v2). |
| Copilot RT D27 `SECURITY_CERTIFIED=PASS` @ `fe3db75` | **Cited.** Not this train's retest. |
| Revenue `85def0e` / GCC `8d757cf` / OD-005 `9e5d10a` unchanged | **Reconfirmed.** |

## Contract hold / no-fork confirmation

| ID | Holds? | Evidence |
| --- | --- | --- |
| **CC-001** | **YES** | camelCase SoT + harness. GTM `liveDispatch` remains false @ `14d8e4d`. |
| **CC-002** | **YES** | Revenue `85def0e` remains commercial SoR. Copilot `fe3db75` `commercialAuthority=revenue-os`. |
| **CC-003** | **YES** | GCC `8d757cf` `autoProvisionAccess=false` (unchanged). |
| **CC-006** | **YES** | `gcc-value-signal.v1` unchanged @ `8d757cf`. |

`nurture-plan.v1` and `pre-call-brief.v1` remain additive coverage. Booking / experiment / optimization adapters map GTM producer shapes onto existing SoT meaning (`773b510`); GTM experiment statuses (`rolled_back`, etc.) are adapter-only and do not fork SoT enums (`draft\|running\|paused\|completed\|abandoned`).

## Booking (directive 6)

GTM SYN-GTM dry-run calendar booking maps through `to_integration_booking_event` → SoT `booking-event.v1`:

- producer `requestId: 'book-syn-1'` + `dryRun===true` @ `14d8e4d`
- idempotency `booking|{bookingId}`
- `additionalProperties: false` (so `liveDispatch` cannot appear)
- `meetingProvider=microsoft-mock-dry-run`
- live dispatch remains impossible

## Optimization Variant 2 (directive 6)

GTM `runOptimizationCycle` Variant 2 maps through `to_integration_experiment_spec` / `to_integration_optimization_decision`:

- Variant `campaignId` ends with `-v2`
- GTM `rolled_back` → SoT experiment `abandoned` + optimization `decision=kill`
- `paidAdsEnabled` const false
- `mutatesPaidAds` const false
- live Level 4 refused — does not imply paid-ad spend

## Pre-call brief / nurture

Unchanged since D5 / D4. Journey A/B coverage kept. Copilot `toIntegrationPreCallBrief` @ `fe3db75`. GTM `createNurturePlan` @ `14d8e4d`.

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| `mutatesPaidAds` | **false** |
| Hub / Elite production | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** (current six SHAs; Supervisor 2045Z + GitHub MCP) |
| `SYNTHETIC_CERTIFIED` | harness green |
| `SECURITY_CERTIFIED` | **Not this branch** |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security

XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` FIXED_REVALIDATED (RT D23). Not patched here. No `Sites.Manage.All`.
