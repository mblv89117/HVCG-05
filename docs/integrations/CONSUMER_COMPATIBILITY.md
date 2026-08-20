# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning lineage SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged; `icp-studio.v1` + `outbound-dispatch.v1` additive)  
**Contracts self tip:** this D8 pack (pin follows; based-on `f2e27a0`)  
**Directive consumed:** **8**  
**Replacement worker:** `bc-0e3c9a74` · based-on D7 FINISHED `f2e27a0`  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **YES**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **100%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **40/40 OK**  
**Updated:** 2026-08-20T21:30:00Z

D7 left `icp_studio` + dry-run outbound PARTIAL because no Integration schema existed. This pack publishes those two schemas from **existing** GTM `f53e628` fields only. No GTM product depth invented. No live outbound authorized.

This train does not implement product runtime. Product adapters are allowed; consumers must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 8)

| Consumer | Repo | Branch | Declared tip | This-worker fetch | Joint evidence |
| --- | --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` | git remote **404** | GitHub MCP: tip still `f53e628`; opened `icp/model.ts` + `icp/studio.ts` + `outbound/orchestrator.ts` |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** | Unchanged vs D7 |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** (prior) | Unchanged vs D7 |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` | git remote **404** | Unchanged vs D7 |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only | Unchanged |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | this D8 pack | **This branch** | Based-on `f2e27a0`; Supervisor independently 36/36 @ `f2e27a0` |

No second Integration worker. Orchestrator control-plane was not pushed.

## Supervisor 2115Z — cited

| Claim | Disposition |
| --- | --- |
| `ICP_MODEL_VERSION='icp.hvcg.v1'` + `icpModelSchema` | **Opened.** `icp/model.ts` `06d1669f`. |
| `exclusions.sensitivePersonalTraits=true` | **Opened + schema const.** |
| SYN-GTM `icp.version === ICP_MODEL_VERSION` | **Cited + harness.** |
| Outbound adapter always dry-run / `dispatched=false` | **Opened.** `outbound/orchestrator.ts` `0e974d67`. |
| SYN-GTM `dry_run_record_only && recorded && !dispatched` | **Cited + harness.** Adapter throws otherwise. |
| Flags remain off @ `f53e628` | **Cited (D7).** |
| RT D28 `SECURITY_CERTIFIED=PASS` @ GTM `f53e628` | **Cited.** Independent; not this retest. |
| Harness 36/36 @ `f2e27a0` | **Cited.** This pack grew to 40/40. |

## Contract hold / no-fork confirmation

| ID | Holds? | Evidence |
| --- | --- | --- |
| **CC-001** | **YES** | camelCase SoT + harness. GTM `liveDispatch` remains false @ `f53e628`. |
| **CC-002** | **YES** | Revenue `85def0e` remains commercial SoR. |
| **CC-003** | **YES** | GCC `8d757cf` `autoProvisionAccess=false`. |
| **CC-006** | **YES** | `gcc-value-signal.v1` unchanged @ `8d757cf`. |

New schemas are additive. They do not change lead-intake, commercial authority, GCC provision, or value-signal meaning.

## New contracts (directive 8)

### `icp-studio.v1`

Maps GTM `IcpModel` / `ICP_MODEL_VERSION` only:

- `version` const `icp.hvcg.v1`
- `criteria` fields from `icpModelSchema`
- `verticalHypotheses` enum from `HVCG_VERTICAL_HYPOTHESES`
- `exclusions.sensitivePersonalTraits` required const true
- no sensitive personal profiling fields

### `outbound-dispatch.v1`

Maps GTM `OutboundDispatchResult` only, fail-closed:

- `mode` const `dry_run_record_only`
- `recorded` const true
- `dispatched` const false
- `liveDispatch` const false
- no live-send success shape (`mode=live` / `dispatched=true` rejected)

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| `mutatesPaidAds` | **false** |
| Hub / Elite production | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **YES** (GTM `f53e628` + current sibling tips) |
| `SYNTHETIC_CERTIFIED` | harness green |
| `SECURITY_CERTIFIED` | **Not this branch** (RT D28 is GTM-side, independent) |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security

XSYS-01/02 remain Hub LIVE_PRODUCTION_P0 on `940a484`. Candidate `9e5d10a` FIXED_REVALIDATED (RT D23). Not patched here. No `Sites.Manage.All`.
