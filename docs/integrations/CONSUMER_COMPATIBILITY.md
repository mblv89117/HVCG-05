# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**SoT meaning SHA:** `773b5101032ccd5218d5563d2177c31722ecf575` (unchanged)  
**Contracts self tip (directive 3 based-on):** `a29c873729b0539505231c8b82e33b14f3ce2d49`  
**Directive consumed:** **3** (D2 consumed; not repeated)  
**Replacement worker:** `bc-0e3c9a74` · run `run-4497aaf8-2256-4d77-8905-2768cf566a61`  
**CURRENT_PRODUCT_TIPS_TESTED_TOGETHER:** **NO**  
**CROSS_SYSTEM_JOURNEY_PERCENT:** **71%** — see `CROSS_SYSTEM_JOURNEY_PERCENT.md`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **27/27 OK**  
**Updated:** 2026-08-20T19:50:00Z

This train does not implement product adapters. Consumers must consume these schemas; they must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 3)

| Consumer | Repo | Branch | Declared tip | Fetch from this worker |
| --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` | `cursor/360-gtm-agent-system` | `e0dd445d60161601bd573435c9536d0385a25bdf` | **404** — supervisor 1936Z cited |
| Revenue | `hvcg-05` | `cursor/atlas-revenue-engagement-os` | `85def0ef30eb7adc4bcf096f4fabd569c6817535` | **Fetched** — origin tip |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `8d757cf68157a6054432de7ca57f8431731b2d64` | **Fetched** — equals remote branch tip |
| Copilot | `hvcg-agent-copilot` | `cursor/copilot-production-completion` | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` | **404** — supervisor 1936Z + RT D26 cited |
| OD-005 | `hvcg-05` | `cursor/atlas-security-patch-od005` | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` | **Fetched** read-only (XSYS owner; not merged) |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | `a29c873729b0539505231c8b82e33b14f3ce2d49` | **This branch** |

D2 pins (Revenue `e9b3be8` / GCC `41a59b8` / Copilot `19a200e`) are **stale** and are replaced by the SHAs above.

No second Integration product train was created. Orchestrator control-plane branch `cursor/platform-orchestrator-b1fa` was not pushed.

## Contract hold / no-fork confirmation (current tips)

| ID | Canonical meaning | Holds vs current tips? | Evidence |
| --- | --- | --- | --- |
| **CC-001** | camelCase lead-intake SoT; PascalCase aliases optional and equal-only | **YES** | Harness @ `a29c873`. Revenue `src/revenue_os/compatibility.py` `reject_pascal_only` / `accept_gtm_lead` @ `85def0e`. SoT schemas unchanged vs `773b510`. GTM `e0dd445` not opened; supervisor 1936Z + SoT `liveDispatch:false` not contradicted. |
| **CC-002** | Revenue is commercial authority; Copilot/GTM offers stay `observationOnly` until operator accept | **YES** | `offer-recommendation.v1.json` const @ `a29c873`. Revenue `COPILOT_HAS_COMMERCIAL_AUTHORITY=false` + `ingest_copilot_recommendation` → `commercialAuthority=revenue-os` @ `85def0e`. Copilot RT D26: `observationOnly=true` / `liveDispatch=false` retained @ `2f02702` (cited). |
| **CC-003** | GCC handoff persist-only; `autoProvisionAccess=false` | **YES** | SoT consts @ `a29c873`. GCC `atlas-activation.ts` + route @ `8d757cf`. Revenue `AUTO_PROVISION_ACCESS=false` @ `85def0e`. |
| **CC-006** | Canonical signal = `gcc-value-signal.v1` | **YES** | Schema **byte-identical** GCC `8d757cf` vs SoT `a29c873`. Adapter still pins `INTEGRATION_SOT_SHA=773b510…`. Harness `test_cc006_adapter_maps_to_canonical`. |

Semantics were **not** forked. SoT meaning remains `773b510`.

## Per-consumer notes (current tips)

### GTM `e0dd445`

- Sibling remote **404** to this worker's token. SHA recorded.
- Supervisor 1936Z (orchestrator-declared, no in-repo 1936Z artifact): `liveDispatch` default false, paid ads default false, kill switch default true. **Cited, not independently re-opened.**
- Last RT-opened GTM source remains D19 `7b704111` (InquiryForm camelCase, receive `liveDispatch_must_remain_false`) — **stale vs this tip**.
- SoT for 360→Atlas stays observation-only / live Hub POST owner-gated.

### Revenue `85def0e`

- Origin tip. Consumes SoT meaning `@ 773b510` (`docs/revenue-os/INTEGRATION_SOT_PIN.md`). `git diff 773b510 85def0e -- docs/integrations/schemas` empty.
- CC-001 / CC-002 / CC-003 adapters still in `src/revenue_os/compatibility.py`. All production side-effect gates false in `src/revenue_os/gates.py`.
- Candidate-only adapters; `liveGraphWrites=false`; no production deploy.

### GCC `8d757cf`

- Remote branch tip equals declared SHA.
- Still pins Integration SoT `773b510` for CC-006. `gcc-value-signal.v1.json` byte-identical.
- CC-003 preserved. RT D25 SECURITY_CERTIFIED=PASS (cited). Live Atlas dispatch OFF.

### Copilot `2f02702`

- Sibling remote **404**. SHA recorded.
- Supervisor 1936Z: `jose.jwtVerify` + `/api/assessments` 401. **Corroborated by RT D26** (`src/middleware.ts`, fail-closed, assessments not public). Prior tip `19a200e` is stale for the SECURITY_CERTIFIED gate.
- Contract CC-001/002 SoT unchanged on this train.

### OD-005 `9e5d10a`

- Read-only. XSYS-01/02 candidate HMAC + prefix bind still present (`intakeAuth.ts`, `leads.ts`).
- RT D23: REGRESSION=PASS, FIXED_REVALIDATED. Live Hub `940a484` XSYS remains OPEN until owner-authorized deploy.
- **Not patched from this branch.**

### Contracts self `a29c873`

- Sole publisher of canonical meaning. Live adapters gated. No Hub/Elite runtime edits.

## Live / deploy gates

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| Hub / Elite production runtime | **Frozen** `940a484` / `75d0c59` |
| `CURRENT_PRODUCT_TIPS_TESTED_TOGETHER` | **NO** |
| `INTEGRATION_CERTIFIED` | **Open** (weakest release gate — tips not jointly source-tested here) |
| `SECURITY_CERTIFIED` | **Not this branch** — Atlas/OD-005 |
| `SYNTHETIC_CERTIFIED` (contracts harness) | **27/27** |
| `DEPLOYMENT_READY` | **Owner-gated** |

## Security regression (docs only)

XSYS-01/02 are **Hub-side LIVE_PRODUCTION_P0** on live `940a484`. Remediation lives on `cursor/atlas-security-patch-od005` @ `9e5d10a` (RT D23 FIXED_REVALIDATED). This contracts branch **did not** patch Hub.

| ID | Live Hub `940a484` | OD-005 candidate `9e5d10a` |
| --- | --- | --- |
| **XSYS-01** | Intake key only | Candidate HMAC-SHA256(`${timestamp}.${rawBody}`) fail-closed — FIXED_REVALIDATED |
| **XSYS-02** | Unbound `fullPayload.idempotencyKey` | Prefix bound to `submissionType` — FIXED_REVALIDATED |
