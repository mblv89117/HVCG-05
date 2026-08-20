# Product Train Integration Requirements

Contract ownership: **hvcg-05** / `cursor/platform-integration-contracts`.
Product agents implement adapters; do not fork canonical meaning.

Frozen Atlas baseline: Hub `940a484`, Elite `75d0c59` — do not regress.

## Atlas (Revenue OS / CRM train)

Branch inspected (directive 3): `cursor/atlas-revenue-engagement-os` @ `85def0e` (consumes SoT meaning `773b510`; schema diff empty).
Frozen Atlas baseline remains Hub `940a484` / Elite `75d0c59` — do not regress.

| ID | Requirement | Priority |
| --- | --- | --- |
| ATLAS-INT-001 | Accept website-compatible intakes whose `fullPayload.idempotencyKey` matches `360\|*`, `copilot\|*`, `eva\|*`, `website\|*` without remapping meaning | P0 |
| ATLAS-INT-002 | Persist attribution lineage fields (campaign/UTM) when present; do not invent | P1 |
| ATLAS-INT-003 | Emit `client-activation-event.v1` / GCC handoff only after Active Client authorize | P0 |
| ATLAS-INT-004 | Consume `gcc-value-signal.v1` as review signals — do not copy GCC ledgers into `HVCG_*` | P1 |
| ATLAS-INT-005 | Emit `closed-won-learning-event.v1` to 360 without enabling paid ads | P2 |
| ATLAS-INT-006 | Treat offer/pricing recommendation contracts as observation-only until operator accept | P0 |
| ATLAS-INT-007 | XSYS-01/02: Hub intake HMAC + idempotency prefix↔source bind — **owned by Atlas security patch train** (`cursor/atlas-security-patch-od005` @ `9e5d10a`, RT D23 FIXED_REVALIDATED); Integration documents only (no Hub churn on this branch) | P0 |

## 360 Growth (GTM train)

Branch declared (directive 7): `cursor/360-gtm-agent-system` @ `f53e628` — sibling git remote **404** here. GitHub MCP `get_commit` confirms tip `f53e628`. Opened `packages/gtm-agent/src/atlas/journey-sot.ts` (file SHA `6d8d541`: `toBookingEventV1` / `toExperimentSpecV1` / `toOptimizationDecisionV1`) and `.env.example` (`GTM_LIVE_DISPATCH_ENABLED=false`, `PAID_ADS_ENABLED=false`, `GTM_KILL_SWITCH=true`).

| ID | Requirement | Priority |
| --- | --- | --- |
| GTM-INT-001 | Keep Zod `360-atlas-lead.v1` aligned with canonical JSON Schema `360-atlas-lead.v1.json` | P0 |
| GTM-INT-002 | Emit `campaign-spec` / `funnel-spec` / `form-spec` / `experiment-spec` version fields | P1 |
| GTM-INT-003 | Never send live Hub POST until owner gate; `liveDispatch:false` | P0 |
| GTM-INT-004 | Consume `closed-won-learning-event.v1` as learning only; `mutatesPaidAds:false` | P1 |
| GTM-INT-005 | Do not present 360 org UUID as Atlas `ClientCode` | P0 |
| GTM-INT-006 | Keep additive sync aligned to ratified `360-atlas-gtm-sync.v1.json` | P0 |
| GTM-INT-007 | Emit `nurture-plan.v1` from `createNurturePlan` (`goal=prepare_lead_before_manny_call`, `observationOnly=true`, `liveSend=false`) | P2 |
| GTM-INT-008 | Emit SoT `booking-event.v1` via landed `toBookingEventV1` (`dryRun===true` required, idempotency `booking\|{bookingId}`). No live dispatch. | P2 |
| GTM-INT-009 | Emit SoT `experiment-spec.v1` + `optimization-decision.v1` via landed `toExperimentSpecV1` / `toOptimizationDecisionV1` (`campaignId -v2`, `decision=hold_for_owner`, `mutatesPaidAds=false`). | P2 |

## Agent Copilot

Branch declared (directive 7): `cursor/copilot-production-completion` @ `fe3db75` — sibling git remote **404** here. Unchanged vs D6. `observationOnly=true`; `liveDispatch=false`; `commercialAuthority=revenue-os`.

| ID | Requirement | Priority |
| --- | --- | --- |
| COP-INT-001 | Prefer `atlas-lead-handoff.v1` for lead intake; use `agent-copilot-handoff.v1` only for capital observation edge | P0 |
| COP-INT-002 | Label MRI opportunities as non-Atlas (`mriOpportunities`); never write `HVCG_Opportunities` directly | P0 |
| COP-INT-003 | Keep `observationOnly:true`, `liveDispatch:false` | P0 |
| COP-INT-004 | Align assessment handoff with `agent-copilot-assessment-handoff.v1` mission name | P1 |
| COP-INT-005 | **Remove mandatory PascalCase dual fields** from Copilot schema/required[]; camelCase is SoT; PascalCase aliases optional only if equal (CC-001) | P0 |
| COP-INT-006 | Emit Integration SoT `pre-call-brief.v1` via `toIntegrationPreCallBrief` (`ownerSystem=copilot`, `observationOnly=true`). No commercial authority. No CRM create. | P2 |

## Growth Command Center

Branch inspected (directive 3): `cursor/gcc-client-value-os` @ `8d757cf` on `growth-command-center` (equals remote tip; SoT `773b510`; schema byte-identical).

| ID | Requirement | Priority |
| --- | --- | --- |
| GCC-INT-001 | Keep persist-only activation receiver; `autoProvisionAccess:false` | P0 |
| GCC-INT-002 | Emit canonical `gcc-value-signal.v1` (adapt from local `gcc-atlas-signal.v1` via published map) with both `clientCode` and `gccOrganizationId` — never conflate | P0 |
| GCC-INT-003 | Do not create Atlas CRM duplicates from handoffs | P0 |
| GCC-INT-004 | Align `gcc-gtm-feedback.v1` to Integration-ratified schema | P1 |

## EVA

| ID | Requirement | Priority |
| --- | --- | --- |
| EVA-INT-001 | Continue specializing `eva-crm-payload.v1` over website lead upsert | P0 |
| EVA-INT-002 | Always supply `sessionId` → `eva\|{sessionId}` | P0 |
| EVA-INT-003 | Treat scores/bands as source context, not verified Atlas facts | P0 |
