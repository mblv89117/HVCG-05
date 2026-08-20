# Cross-System Contracts

Canonical contract registry for High Value platform handoffs.
Owned on branch `cursor/platform-integration-contracts` in **hvcg-05**.

Product trains implement adapters; they must not independently redefine canonical meaning.

**Frozen Atlas baseline (do not regress):** Hub `940a484`, Elite `75d0c59`, P0 `0`, P1 `0`.

## Product boundaries

| Product | Owns | Must not own |
| --- | --- | --- |
| 360 Growth | GTM (campaigns, funnels, forms, experiments, lead scoring) | Atlas CRM state, GCC ledgers |
| Atlas | CRM / commercial / engagement / capital OS | GCC KPI ledgers, 360 ad spend |
| Agent Copilot | AI MRI assessments | Second CRM / opportunity SoR |
| GCC | Client-value intelligence | Atlas ClientCode authority |
| EVA | Broad diagnostic funnel intake | Client entitlements |

Contracts connect products; they do not erase these boundaries.

## Authoritative identity anchors

See `CANONICAL_IDENTITIES.md`. Summary:

| Entity | Authority | Stable key |
| --- | --- | --- |
| Company / account | Atlas `HVCG_Clients` | `ClientCode` |
| Contact | Atlas `HVCG_Contacts` | SP item ID + email |
| Lead | Atlas `HVCG_Leads` | SP item ID + `HVCG_IdempotencyKey` |
| Opportunity | Atlas `HVCG_Opportunities` | SP item ID + `opp-from-lead\|{LeadId}` |
| Capital opportunity | Atlas capital | `cap-from-opp\|{OpportunityId}` |
| GCC tenant | GCC Supabase | `organizations.id` (explicit mapping only) |
| Campaign / experiment | 360 | `campaignId` / `experimentId` |
| Assessment | Copilot / EVA | `assessmentId` / `sessionId` |

## Handoff registry

| Edge | Transport | Auth | Idempotency | Identity anchor | Status | Owner gate |
| --- | --- | --- | --- | --- | --- | --- |
| EVA / website → Atlas lead | `POST /api/website/leads` | `x-website-intake-key` | `eva\|{sessionId}`, `website\|{leadId}` | `HVCG_Leads` | Hub implemented | Intake key |
| Atlas lead → opportunity | `POST /api/pm/leads/{LeadId}/convert` | Staff bearer + ETag | `client-from-lead\|…`, `contact-from-lead\|…`, `opp-from-lead\|…` | `ClientCode` after conversion | Hub/Elite implemented | Microsoft auth cert |
| EVA → Atlas capital | `POST /api/capital/handoffs/eva` | Bearer + client scope | Capital keys | `ClientCode` required | Implemented | Capital gates |
| Copilot → Atlas capital observation | `POST /api/capital/handoffs/agent-copilot` | Bearer + optional client scope | Handoff record ID | Optional `ClientCode` | Observation-only | Non-fact |
| 360 nurture plan | Contract `nurture-plan.v1` | Local / staging | `nurture\|{planId}` | 360 lead | Schema + harness | No live send |
| 360 → Atlas lead | `@360gs/atlas-handoff` stage | Intake key when live | `360\|{leadId}` | `HVCG_Leads` | Staging only | Owner before live |
| Copilot → Atlas lead | Copilot `/api/atlas/leads` | Local / future Entra | `copilot\|{assessmentId}` | `HVCG_Leads` | Staging only | Non-fact |
| Copilot → pre-call brief | Contract `pre-call-brief.v1` | Local / staging | `precall\|{briefId}` | Booking + MRI | Schema + harness | Observation-only |
| Atlas client activation | `POST /api/pm/clients/{ClientCode}/activation` | Staff + Manny authorize | `client-activate\|{ClientCode}\|{OpportunityId}` | `ClientCode` | Implemented | Won ≠ Active |
| Atlas → GCC | GCC `/api/handoff/atlas-activation` | `platform_admin` | `gcc-activate\|{ClientCode}\|{event}` | Mapping later | Persist-only | No auto-access |
| GCC → Atlas value signal | Contract `gcc-value-signal.v1` | Service identity | `gcc-signal\|{signalId}` | `ClientCode` + GCC org | Schema + harness | No ledger copy |
| Atlas → 360 learning | Contract `closed-won-learning-event.v1` | Service identity | `learn-won\|{outcomeId}` | Campaign attribution | Schema + harness | No ad spend |
| 360 dry-run booking | Contract `booking-event.v1` | Local / staging | `booking\|{bookingId}` | 360 lead / meeting | Schema + harness (`toBookingEventV1` @ `f53e628`) | Dry-run only |
| 360 optimization Variant 2 | Contract `experiment-spec.v1` / `optimization-decision.v1` | Local / staging | `experiment\|{experimentId}`, `optimize\|{decisionId}` | Campaign | Schema + harness (`toOptimizationDecisionV1` hold_for_owner @ `f53e628`) | `mutatesPaidAds=false` |

## Contract rules

1. Do not turn a handoff into a second CRM, second opportunity model, or parallel client database.
2. Do not infer verified financial, legal, credit, tax, or capital facts from AI assessments or marketing attribution.
3. Do not create external commitments silently.
4. Preserve attribution fields when supplied; never invent missing history.
5. Replays must be idempotent and must not duplicate clients/opportunities/engagements/bookings/messages/handoffs.
6. `Won` opportunities do not activate clients. Client activation is a separate governed event.
7. GCC financial intelligence stays in GCC; Atlas links only after an explicit bridge contract.
8. Every cross-system write carries a `write-envelope.v1` (idempotency key, source, destination, entity, operation, version, replay semantics, trace).
9. Breaking schema changes require a new `.vN` and consumer compatibility tests — no silent drift. Current consumer matrix: `CONSUMER_COMPATIBILITY.md`. Current-tip journey pack: `CROSS_SYSTEM_JOURNEY_PERCENT.md`.

## Machine-readable schemas

### Foundations
- `schemas/typed-ref.v1.json`
- `schemas/trace-context.v1.json`
- `schemas/write-envelope.v1.json`
- `schemas/attribution-lineage.v1.json`
- `schemas/idempotency-keys.v1.json`

### Intake / GTM / EVA
- `schemas/website-lead-upsert.v1.json`
- `schemas/eva-crm-payload.v1.json`
- `schemas/atlas-lead-intake.v1.json`
- `schemas/360-atlas-lead.v1.json`
- `schemas/360-atlas-gtm-sync.v1.json`
- `schemas/gtm-company-profile.v1.json`
- `schemas/gtm-lead-score.v1.json`
- `schemas/pain-hypothesis.v1.json`
- `schemas/campaign-spec.v1.json`
- `schemas/funnel-spec.v1.json`
- `schemas/form-spec.v1.json`
- `schemas/nurture-plan.v1.json`
- `schemas/booking-event.v1.json`
- `schemas/pre-call-brief.v1.json`
- `schemas/experiment-spec.v1.json`
- `schemas/optimization-decision.v1.json`

### Copilot
- `schemas/agent-copilot-handoff.v1.json` (capital observation)
- `schemas/atlas-lead-handoff.v1.json` (MRI → lead)
- `schemas/agent-copilot-assessment-handoff.v1.json` (mission canonical)

### Atlas commercial / Revenue OS
- `schemas/opportunity-commercial-context.v1.json`
- `schemas/offer-recommendation.v1.json`
- `schemas/pricing-recommendation.v1.json`
- `schemas/proposal-context.v1.json`
- `schemas/engagement-created.v1.json`
- `schemas/client-activation.v1.json`
- `schemas/client-activation-event.v1.json`
- `schemas/revenue-outcome.v1.json`
- `schemas/closed-won-learning-event.v1.json`

### GCC
- `schemas/atlas-gcc-client-activation.v1.json`
- `schemas/atlas-to-gcc-handoff.v1.json`
- `schemas/gcc-value-signal.v1.json` (canonical; peer `peers/gcc-atlas-signal.v1.json` + adapter)
- `schemas/gcc-gtm-feedback.v1.json`
- `schemas/adapters/gcc-atlas-signal-to-value-signal.md`
- `schemas/adapters/copilot-lead-handoff-aliases.md`

Runtime source remains authoritative where Atlas Hub behavior is already implemented.
Synthetic journey harness: `tests/integrations/`.
