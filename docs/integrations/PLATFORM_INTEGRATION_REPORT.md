# Platform Integration Report

**Branch:** `cursor/platform-integration-contracts`  
**Coordination repo:** `hvcg-05`  
**Base:** `origin/cursor/atlas-hv-completion-52d1`  
**Frozen Atlas baseline:** Hub `940a484`, Elite `75d0c59`, P0 `0`, P1 `0`  
**Harness:** `python3 tests/integrations/run_integration_contracts.py` → **21/21 OK**

## Integration %

| Area | Status | % |
| --- | --- | --- |
| Canonical IDs | Defined + typed-ref schema | 100 |
| Attribution lineage | Schema + docs | 100 |
| Required mission schemas | All published under `docs/integrations/schemas/` | 100 |
| Idempotency registry | Expanded to all critical edges | 100 |
| Failure atomicity tests | Synthetic matrix covered | 95 |
| Identity / auth model | Documented; least privilege | 100 |
| Synthetic journeys A/B/C | Machine-verifiable harness | 100 |
| Security contract tests | Spoof/replay/injection/schema confusion | 95 |
| Live product adapters | Owner-gated / staging (unchanged) | 40 |
| **Weighted platform contract readiness** | Contracts + harness complete; live gates remain | **~82** |

Live Hub POST for 360/Copilot and GCC auto-provision remain intentionally gated (not defects of this contract branch).

## Canonical IDs

See `docs/integrations/CANONICAL_IDENTITIES.md`. Atlas `ClientCode` is never interchangeable with GCC `organizations.id` or 360 org/tenant UUIDs.

## Attribution

Canonical lineage Source → … → LTV in `IDENTITY_AND_ATTRIBUTION.md` + `attribution-lineage.v1.json`.

## Schemas

34 JSON Schema files in `docs/integrations/schemas/` including foundations, GTM, EVA, Copilot, Atlas commercial, GCC, learning.

## Idempotency

`idempotency-keys.v1.json` + required `write-envelope.v1` on writes. Retries must not duplicate leads/opps/engagements/bookings/clients/GCC handoffs.

## Failure Atomicity

Documented matrix + synthetic tests: receiver fail, response loss, duplicate retry, stale auth (no write), partial convert keys, no false-success.

## Identity

Six identity classes; no universal cross-platform super-admin (`IDENTITY_AUTH_MODEL.md`).

## Compatibility

| Train | Inspected branch | Compatibility |
| --- | --- | --- |
| Revenue OS / Atlas | `atlas-hv-completion-52d1` (+ revenue-os design docs) | Compatible; recommendations observation-only |
| GTM / 360 | `360-hv-completion-52d1` | Zod aligned to published JSON Schema; live dispatch off |
| GCC | `gcc-hv-completion-52d1` | Persist-only mirrored; value-signal contract added |
| Copilot | `copilot-hv-completion-52d1` | Dual-edge preserved (lead vs capital observation) |

Requested parallel names (`atlas-revenue-engagement-os`, `360-gtm-agent-system`, `gcc-client-value-os`, `copilot-production-completion`) were **not on remote**; substitutes above used.

## Synthetic journeys

| Journey | Coverage |
| --- | --- |
| A | GTM → campaign → funnel/form → Atlas lead → opp → offer → proposal → engagement → activation → GCC |
| B | Copilot assessment → Atlas lead → offer/pricing → engagement |
| C | GCC value signal → Atlas expansion opp → closed-won learning to 360 |

## Security

Tests cover ID/tenant/campaign spoof patterns, replay abuse, forged governance, oversized/prompt payloads, schema confusion, unsafe `liveDispatch`.

## Contract conflicts

Resolved in `CONTRACT_CONFLICTS.md` (Copilot dual schemas, Organization vs ClientCode, incomplete idempotency registry, missing peer schemas).

## Required product changes

See `requirements/PRODUCT_TRAIN_REQUIREMENTS.md` (ATLAS-INT-*, GTM-INT-*, COP-INT-*, GCC-INT-*, EVA-INT-*). No product business-logic merges in this PR.

## P0 / P1 / P2

| Sev | Items |
| --- | --- |
| P0 | Keep liveDispatch/paidAds/autoProvision false; ClientCode≠org UUID; dual Copilot edges; activation ≠ Won |
| P1 | Persist campaign/UTM on Atlas leads (ATLAS-INT-002); align 360 Zod continuously; GCC value signal consumption |
| P2 | Closed-won learning → 360 automation; experiment optimization loop |

## Owner Decisions

1. Approve live 360/Copilot Hub POST only after auth cert (unchanged gate).
2. Approve GCC access provisioning separately from persist-only handoff.
3. Approve paid ads enablement separately (`paidAdsEnabled` remains const false).
4. Confirm contract SoT branch is `cursor/platform-integration-contracts` for product trains.

## Next Milestone

Product trains implement adapters against published schemas; add Hub consumer compatibility tests for `360|*` / `copilot|*` keys without regressing Hub `940a484` / Elite `75d0c59`.
