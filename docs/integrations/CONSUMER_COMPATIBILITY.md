# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged; `nurture-plan.v1` additive)  
**Contracts self tip:** `8f46a89ff06149eb7becf6ced02777b60c7a7f2b` (based-on `8fb9af7`)  
**Directive consumed:** **5**  
**Replacement worker:** `bc-0e3c9a74` · based-on D4 run `run-b871ffb0-643b-4bee-ac4e-25d48d5584c1`  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **77%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **30/30 OK**  
**Updated:** 2026-08-20T20:40:00Z

D4 published TESTED_TOGETHER=YES against stale GTM `e0dd445` / Copilot `2f02702`. Those tips moved. This matrix pins the **current** six SHAs. Sibling git remotes still 404 here; GitHub MCP + Supervisor V2 **2030Z** opened the new GTM/Copilot tips.

This train does not implement product runtime. Product adapters are allowed; consumers must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 5)

| Consumer | Repo | Branch | Declared tip | This-worker fetch | Joint evidence |
| --- | --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `14d8e4dac3945d91e404d055a68a2f925a736fb4` | git remote **404** | GitHub MCP opened `.env.example` + `nurture/engine.ts` |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** | Unchanged vs D4 |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** (prior) | Unchanged vs D4 |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | git remote **404** | GitHub MCP + Supervisor V2 2030Z |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only | Unchanged |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | `8f46a89ff06149eb7becf6ced02777b60c7a7f2b` | **This branch** | D5 pack; Supervisor independently 28/28 @ `8fb9af7` |

No second Integration worker. Orchestrator control-plane was not pushed.

## Supervisor V2 2030Z — cited (sibling remotes still 404 here)

| Claim | Disposition |
| --- | --- |
| Copilot enrichment GET/POST **401** without session @ `fe3db75` | **Cited.** GitHub MCP opened `tests/pre-call-brief.test.ts` assessments 401. |
| Copilot `observationOnly=true` | **Cited + opened.** Producer + SoT fixture. |
| Copilot `liveDispatch=false` | **Cited + opened.** Fixture top-level + staged handoff. |
| Copilot `commercialAuthority=revenue-os` | **Cited + opened.** `toIntegrationPreCallBrief` / producer const. |
| GTM live outbound / paid ads remain off @ `14d8e4d` | **Opened.** `.env.example`: `GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true`. |
| GTM `nurturePlanSchema` unchanged | **Opened.** File SHA `0c1ed052` same as D4 `e0dd445`. |
| Harness 28/28 @ `8fb9af7` | **Cited.** This directive extends coverage (pre-call-brief). |
| Revenue `85def0e` / GCC `8d757cf` / OD-005 `9e5d10a` unchanged | **Reconfirmed.** |

## Contract hold / no-fork confirmation

| ID | Holds? | Evidence |
| --- | --- | --- |
| **CC-001** | **YES** | camelCase SoT + harness. GTM `liveDispatch` remains false @ `14d8e4d`. |
| **CC-002** | **YES** | Revenue `85def0e` remains commercial SoR. Copilot `fe3db75` `commercialAuthority=revenue-os`. |
| **CC-003** | **YES** | GCC `8d757cf` `autoProvisionAccess=false` (unchanged). |
| **CC-006** | **YES** | `gcc-value-signal.v1` unchanged @ `8d757cf`. |

`nurture-plan.v1` remains additive. `pre-call-brief.v1` meaning is unchanged (773b510); this directive adds harness coverage + Copilot producer adapter evidence only.

## Pre-call brief (directive 5)

Copilot producer `gtm.pre-call-brief.v1` maps through `toIntegrationPreCallBrief` → SoT `pre-call-brief.v1`:

- `ownerSystem` const/enum includes `copilot`
- `observationOnly` const true
- `additionalProperties: false` (so `liveDispatch` cannot appear)
- commercial authority stays Revenue OS
- fixture: `docs/copilot/pre-call-brief-fixture-d26.json` @ `fe3db75`
- idempotency `precall|{briefId}`

## Nurture contract

Unchanged since D4. GTM `createNurturePlan` @ `14d8e4d` still matches published `nurture-plan.v1`. Journey A coverage kept.

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| Hub / Elite production | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** (current six SHAs; Supervisor 2030Z + GitHub MCP) |
| `SYNTHETIC_CERTIFIED` | harness green |
| `SECURITY_CERTIFIED` | **Not this branch** |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security

XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` FIXED_REVALIDATED (RT D23). Not patched here. No `Sites.Manage.All`.
