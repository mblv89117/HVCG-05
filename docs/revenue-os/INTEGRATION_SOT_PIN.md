# Revenue OS — Integration SoT pin

**Consumed SHA:** `773b5101032ccd5218d5563d2177c31722ecf575`  
**Source branch:** `cursor/platform-integration-contracts`  
**Consumed at:** 2026-08-20T06:30:00Z  
**Consumer:** Revenue Engagement OS (`cursor/atlas-revenue-engagement-os`)

This train copies canonical schemas and adapters from Integration SoT. It does not redefine GTM lead-intake, Copilot observation semantics, or GCC persist-only handoff.

| Contract | Use on this train |
| --- | --- |
| `atlas-lead-intake.v1` / `360-atlas-lead.v1` | CC-001 GTM commercial interface — camelCase SoT |
| `offer-recommendation.v1` | Observation until operator accept (CC-002 / ATLAS-INT-006) |
| `pricing-recommendation.v1` | Observation; not a quote or invoice |
| `proposal-context.v1` | `autoSend=false` |
| `opportunity-commercial-context.v1` | Atlas-owned commercial state |
| `engagement-created.v1` | Distinct from Won and from GCC tenant |
| `revenue-outcome.v1` | Closed commercial outcome |
| `closed-won-learning-event.v1` | Learning only; `mutatesPaidAds=false` |
| `atlas-to-gcc-handoff.v1` | CC-003 `autoProvisionAccess=false` |
| `write-envelope.v1` / `idempotency-keys.v1` | Replay-safe commercial writes |

Live Hub POST, paid ads, and entitlement provisioning remain owner-gated and off.
