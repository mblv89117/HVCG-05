# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged; nurture-plan.v1 is additive)  
**Contracts self tip:** `189281a07f407b93253d7b552569b2a814a8bfb7` (based-on `d57a780`)  
**Directive consumed:** **4**  
**Replacement worker:** `bc-0e3c9a74` · engineering run follows finished schema-probe `run-e9674448` (ignored)  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **75%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **28/28 OK**  
**Updated:** 2026-08-20T20:25:00Z

D3 recorded TESTED_TOGETHER=NO because this worker cannot fetch GTM/Copilot remotes (404). Supervisor V2 **2013Z** independently opened those tips in the four-repo environment. Orchestrator attestation `docs/integrations/ORCHESTRATOR_D3_SIBLING_TIP_ATTESTATION.md` @ `d57a780` already recorded YES. This SoT matrix now agrees.

This train does not implement product adapters. Consumers must consume these schemas; they must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 4)

| Consumer | Repo | Branch | Declared tip | This-worker fetch | Joint evidence |
| --- | --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `e0dd445d60161601bd573435c9536d0385a25bdf` | **404** | Supervisor V2 2013Z opened |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** | Unchanged vs D3 |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** | Unchanged vs D3 |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` | **404** | Supervisor V2 2013Z + RT D26 |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only | Unchanged |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | `189281a07f407b93253d7b552569b2a814a8bfb7` | **This branch** | D4 pack; Supervisor 2013Z independently 27/27 @ `d57a780` |

No second Integration worker. Orchestrator control-plane was not pushed.

## Supervisor V2 2013Z — cited (sibling remotes still 404 here)

| Claim | Disposition |
| --- | --- |
| GTM `GTM_LIVE_DISPATCH_ENABLED` default **false** | **Cited.** SoT `liveDispatch` const false unchanged. |
| GTM `PAID_ADS_ENABLED` default **false** | **Cited.** SoT `paidAdsEnabled` / `paidAdsRequested` const false. |
| GTM `GTM_KILL_SWITCH` default **true** | **Cited.** Live outbound remains forbidden. |
| InquiryForm + receive-inquiry + atlas-handoff `liveDispatch` literal false @ `e0dd445` | **Cited.** Matches SoT CC-001 gates. |
| `nurture/engine.ts` `createNurturePlan` exists @ `e0dd445` | **Cited.** Canonicalized as `nurture-plan.v1` this directive. |
| Copilot `jose.jwtVerify` in middleware + session @ `2f02702` | **Cited + RT D26 corroboration.** |
| Copilot `/api/assessments` GET/POST **401** | **Cited + RT D26.** |
| Revenue `85def0e` / GCC `8d757cf` unchanged | **Reconfirmed** this worker. |

## Contract hold / no-fork confirmation

| ID | Holds? | Evidence |
| --- | --- | --- |
| **CC-001** | **YES** | camelCase SoT + harness. GTM liveDispatch literal false per 2013Z. |
| **CC-002** | **YES** | Revenue `85def0e` `COPILOT_HAS_COMMERCIAL_AUTHORITY=false`. |
| **CC-003** | **YES** | GCC `8d757cf` `autoProvisionAccess=false`. |
| **CC-006** | **YES** | `gcc-value-signal.v1` byte-identical @ `8d757cf`. |

`nurture-plan.v1` is **additive** (P2 gap close). It does not change 773b510 meaning of lead-intake, commercial authority, GCC provision, or value-signal.

## Nurture contract

Published `docs/integrations/schemas/nurture-plan.v1.json` matching GTM Zod `nurturePlanSchema.strict()`:

- required: `planId`, `companyId`, `campaignId`, `goal`, `steps`, `createdAt`
- `goal` const `prepare_lead_before_manny_call`
- step `kind`: `executive_memo` | `industry_content` | `eva_invite` | `copilot_invite` | `case_study` | `readiness_checklist` | `faq` | `founder_content`
- optional SoT gates: `observationOnly=true`, `liveSend`/`liveDispatch`/`paidAdsEnabled=false`, `ownerSystem=360`
- idempotency `nurture|{planId}`

GTM `createNurturePlan` already emits this core shape (GTM-INT-007). GitHub MCP opened `packages/gtm-agent/src/nurture/engine.ts` `nurturePlanSchema` @ `e0dd445` (sibling git remote still 404 here; cite Supervisor 2013Z). Optional SoT gates (`observationOnly`/`liveSend`/`liveDispatch`/`paidAdsEnabled`) may be present and must stay observation-only / no live send.

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| Hub / Elite production | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** (Supervisor 2013Z + this-worker fetchable tips + `d57a780` attestation) |
| `SYNTHETIC_CERTIFIED` | harness green |
| `SECURITY_CERTIFIED` | **Not this branch** |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security

XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` FIXED_REVALIDATED (RT D23). Not patched here. No `Sites.Manage.All`.
