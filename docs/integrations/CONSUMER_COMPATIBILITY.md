# Consumer Compatibility Matrix

**Publisher:** Platform Integration / Contracts (sole publisher of canonical contract meaning)  
**Train:** integration  
**Branch:** `cursor/platform-integration-contracts`  
**Contracts self tip:** `773b5101032ccd5218d5563d2177c31722ecf575`  
**Directive consumed:** **2**  
**Replacement worker:** `bc-0e3c9a74` (does **not** reuse `bc-af57d6b6` / `run-8c5dc9cf` on `cursor/platform-orchestrator-b1fa`)  
**Refresh method:** read-only remote tip inspection; no semantic forks; live adapters remain gated  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **27/27 OK**  
**Updated:** 2026-08-20T14:55:00Z

This train does not implement product adapters. Consumers must consume these schemas; they must not redefine lead-intake, commercial authority, GCC provision, or value-signal meaning.

## Declared remote tips (directive 2)

| Consumer | Repo | Branch | Declared tip | Fetch from this worker |
| --- | --- | --- | --- | --- |
| GTM | `360-growth-solution` (expected) | `cursor/360-gtm-agent-system` | `e0dd445d60161601bd573435c9536d0385a25bdf` | **Not authorized** — `git ls-remote` / GitHub API **404** (same as prior single-repo environment) |
| Revenue | `hvcg-05` / `HVCG-05` | `cursor/atlas-revenue-engagement-os` | `e9b3be8c58a3ea20f8d73806c9dbd6258cec8c56` | **Fetched** — commit present on origin |
| GCC | `growth-command-center` | `cursor/gcc-client-value-os` | `41a59b84335d644effbd7bd84faa31f73a139531` | **Fetched** — detached checkout equals remote branch tip |
| Copilot | `hvcg-agent-copilot` (expected) | `cursor/copilot-production-completion` | `19a200e8af288ea0c81471b7c6235c002de45c7e` | **Not authorized** — `git ls-remote` / GitHub API **404** |
| Contracts self | `hvcg-05` | `cursor/platform-integration-contracts` | `773b5101032ccd5218d5563d2177c31722ecf575` | **This branch** |

No second Integration product train was created. Orchestrator control-plane branch `cursor/platform-orchestrator-b1fa` was not pushed.

## Contract hold / no-fork confirmation

| ID | Canonical meaning (this train) | Holds? | Evidence |
| --- | --- | --- | --- |
| **CC-001** | camelCase lead-intake SoT (`atlas-lead-intake.v1` / `360-atlas-lead.v1` / `atlas-lead-handoff.v1`). PascalCase aliases optional and equal-only. PascalCase-only payloads rejected. | **YES on SoT** | Harness `test_pascalcase_only_payload_rejected`, `test_copilot_canonical_without_pascalcase_still_valid`; Revenue consumer `accept_gtm_lead` @ `e9b3be8` (`tests/revenue_os/test_compatibility.py`). GTM source at `e0dd445` not fetchable here; last independent GTM source probe (Red Team D19) `7b704111` held InquiryForm camelCase + `liveDispatch:false` + `360\|` prefix. |
| **CC-002** | Revenue OS is commercial authority. Copilot/GTM offer/pricing stay `observationOnly` until Revenue operator accept. `COPILOT_HAS_COMMERCIAL_AUTHORITY=false`. | **YES** | SoT `offer-recommendation.v1` (`observationOnly` const true; `createsCommitment` false). Harness `test_offer_cannot_drop_observation_only` + Journey B. Revenue tip `e9b3be8`: `ingest_copilot_recommendation` returns `commercialAuthority=revenue-os`, `promoted=false`; gates.py all production side-effect flags false. |
| **CC-003** | GCC activation / Atlas→GCC handoff is persist-only. `autoProvisionAccess=false`. | **YES** | SoT `atlas-gcc-client-activation.v1` / `atlas-to-gcc-handoff.v1` const false. GCC tip `41a59b8`: `assertAtlasGccActivationContract` rejects true; route + CVOS `autoProvisionAccess: false`. Schema files **byte-identical** to this SoT. Revenue `emit_gcc_handoff` + `AUTO_PROVISION_ACCESS=false`. |
| **CC-006** | Canonical signal is `gcc-value-signal.v1`. Local `gcc-atlas-signal.v1` must adapt; no dual SoT. | **YES** | SoT schema + adapter map unchanged. Harness `test_cc006_adapter_maps_to_canonical`. GCC tip `41a59b8`: `value-signal-adapter.ts` pins `INTEGRATION_SOT_SHA=773b510…`; `gcc-value-signal.v1.json` **byte-identical**; journey test `CC-006`. |

Semantics were **not** forked on this refresh.

## Per-consumer notes

### GTM `e0dd445`

- Orch-declared tip recorded. This worker cannot clone or `cat-file` that SHA (sibling repo not in environment token scope).
- Last independently inspected GTM source (Red Team Directive 19, not this worker): `7b704111` on `cursor/360-gtm-agent-system` — GTM-RT-03/04 FIXED; SYN-GTM 28/28; `liveDispatch=false`; InquiryForm camelCase governance.
- Integration SoT for GTM remains `360-atlas-lead.v1` + `360-atlas-gtm-sync.v1` (`liveDispatch:false`, `observationOnly:true`, `paidAdsRequested:false`, idempotency `360|*`).
- Live Hub POST stays owner-gated.

### Revenue `e9b3be8`

- Inspected on `origin/cursor/atlas-revenue-engagement-os`.
- Consumes Integration SoT `@ 773b510` (`docs/revenue-os/INTEGRATION_SOT_PIN.md`). Claims no contract-meaning forks.
- Implements CC-001 / CC-002 / CC-003 adapters in `src/revenue_os/compatibility.py`.
- Candidate-only Dev SharePoint adapters; `liveGraphWrites=false`; ACCG01 writes refused; no production deploy.
- `COPILOT_HAS_COMMERCIAL_AUTHORITY=false` — CC-002 hold.

### GCC `41a59b8`

- Remote branch tip **equals** declared SHA (docs pin after `30388fd`).
- Consumes SoT `@ 773b510` for CC-006. Local richer `gcc-atlas-signal.v1` remains producer-local only.
- CC-003 preserved (`autoProvisionAccess=false`, persist-only mapping, no CRM duplicate).
- Live Atlas dispatch OFF. Lender outreach forbidden. No production deploy from that tip.

### Copilot `19a200e8`

- Orch-declared tip recorded. Sibling repo not fetchable from this worker.
- Last independent inspection of **this exact SHA** (Red Team Directive 12): COPILOT-RT-02 workspace isolation **FIXED**. That revalidation did **not** re-prove CC-001 field naming in source.
- Last Copilot **contract** conflict on record: tip `7e63a6d` required PascalCase dual fields — rejected as SoT (COP-INT-005 remains a Copilot product obligation until source-confirmed dropped).
- Integration SoT unchanged: camelCase required; matching aliases allowed; PascalCase-only rejected.

### Contracts self `773b510`

- Still the sole publisher of canonical meaning.
- Live adapters gated. No Hub/Elite runtime edits. No production deploy. No Hub thaw.

## Live / deploy gates (unchanged)

| Gate | State |
| --- | --- |
| Live outbound / paid ads / live Hub POST | **OFF** |
| `autoProvisionAccess` | **false** |
| Hub / Elite production runtime | **Frozen** `940a484` / `75d0c59` — not modified here |
| `DEPLOYMENT_READY` | **Owner-gated / open** |
| `SECURITY_CERTIFIED` | **Not this branch** — Atlas/OD-005 |
| `SYNTHETIC_CERTIFIED` (contracts harness) | **27/27** this refresh |

## Security regression (docs only)

XSYS-01/02 are **Hub-side LIVE_PRODUCTION_P0**. Remediation lives on `cursor/atlas-security-patch-od005` @ `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` (Red Team D21 candidate). This contracts branch **did not** patch Hub.

| ID | Live Hub `940a484` | OD-005 candidate `0bbfd87` (not this branch) |
| --- | --- | --- |
| **XSYS-01** | Intake key only (no body HMAC) | Candidate adds key-id + timestamp + HMAC-SHA256(`${timestamp}.${rawBody}`) fail-closed |
| **XSYS-02** | `fullPayload.idempotencyKey` accepted unbound | Candidate binds prefix to `submissionType` (`website\|` / `eva\|` / `copilot\|` / `360\|`); mismatch → 409 |

Independent Red Team must still PASS that exact candidate SHA. Owner must authorize any production security patch. Integration documents the requirement only (`ATLAS-INT-007`).
