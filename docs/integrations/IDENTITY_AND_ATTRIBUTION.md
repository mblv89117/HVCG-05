# Identity and Attribution Contract

Stable correlation across High Value systems without forcing one database ID everywhere.
Companion: `CANONICAL_IDENTITIES.md`.

## Core identity

| Business object | Source of authority | Correlation fields |
| --- | --- | --- |
| Company / account | Atlas `HVCG_Clients` (post-conversion); 360 `companyId` pre-CRM | `ClientCode`, SP item ID, display name; never swap with GCC org UUID |
| Contact | Atlas `HVCG_Contacts` | SP item ID, `Email`, `ClientCode` |
| Lead | Atlas `HVCG_Leads` | SP item ID, `HVCG_IdempotencyKey`, `Email`, `Source`, `LeadSourceDetail` |
| Opportunity | Atlas `HVCG_Opportunities` | SP item ID, `LeadId`, `ClientCode`, `HVCG_IdempotencyKey` |
| Client / engagement | Atlas clients + activation + engagements | `ClientCode`, `ClientStage`; activation governed separately |
| Assessment / diagnostic | EVA / Copilot | `sessionId`, `assessmentId`, provenance |
| Campaign / content / funnel / form | 360 | `campaignId`, `contentId`, `funnelId`, `formId` |
| Booking / meeting | GTM + Atlas meetings | `bookingId` |
| Proposal | Atlas | `proposalId` |
| Revenue outcome | Atlas | `outcomeId` |
| Client value / LTV | GCC | `signalId` + mapped `ClientCode` |
| GCC tenant | GCC Supabase | `organizations.id`; explicit mapping only |

## Canonical attribution lineage

Preserve supplied values; **never invent** missing links.

```
Source
  → Campaign
  → Content / Message
  → Funnel
  → Form
  → Diagnostic
  → Lead
  → Meeting
  → Opportunity
  → Proposal
  → Client
  → Engagement
  → Revenue
  → Client Value / LTV
```

Machine schema: `schemas/attribution-lineage.v1.json`.

| Field class | Atlas / contract fields | Notes |
| --- | --- | --- |
| Source | `HVCG_Leads.Source` | `Website-EVA`, `Website-Funding`, `360-growth`, `agent-copilot` |
| Source detail | `LeadSourceDetail` | `submissionType` / intake channel |
| Campaign / UTM | `attribution-lineage.utm` + `campaignId` | Formalized in contracts; Atlas list columns may lag — preserve in payload notes until migration |
| Content / message | `contentId` / `messageId` | 360-owned |
| Funnel / form | `funnelId` / `formId` | 360/EVA |
| Diagnostic | EVA `sessionId` | Source context only |
| Assessment | Copilot `assessmentId` | Observation until governed review |
| Lead | `HVCG_Leads` item ID | Conversion writes lookups back |
| Meeting | `bookingId` | Idempotent `booking\|{bookingId}` |
| Opportunity | `HVCG_Opportunities` item ID | `opp-from-lead\|{LeadId}` |
| Proposal | `proposalId` | No auto-send |
| Client | `ClientCode` | Prospect ≠ Active Client |
| Engagement | engagement ID | After governed acceptance |
| Revenue | `outcomeId` | Atlas-owned |
| LTV / value | `gcc-value-signal.v1` | No ledger copy into `HVCG_*` |

## Lifecycle mapping

1. 360 / referral / website / EVA / Copilot produces an attributed intake event.
2. Atlas Hub writes or updates `HVCG_Leads` (or product stages locally until owner gate).
3. Atlas operator converts lead → Prospect `HVCG_Clients` + `HVCG_Contacts` + Discovery `HVCG_Opportunities`.
4. Revenue OS / Copilot may emit offer/pricing **recommendations** (observation-only).
5. Proposal / engagement are Atlas-governed; no silent external send.
6. Won ≠ Active Client. Activation is a separate governed event.
7. Atlas → GCC handoff is persist-only mapping prep after Active Client.
8. GCC value signals may inform Atlas renewal/expansion review; Atlas remains CRM SoR.
9. Closed-won learning may flow to 360 without mutating paid ads.

## Identity classes (auth)

| Class | Use | Privilege |
| --- | --- | --- |
| `hvcg_human` | Internal HVCG staff | Least privilege by Hub/Elite role; no universal super-admin |
| `client_user` | Atlas client portal user | Own `ClientCode` scope only |
| `system_service` | Cross-system service principal | Edge-scoped keys/scopes only |
| `marketing_tenant` | 360 tenant | Own tenant campaigns/leads only |
| `assessment_session` | Copilot/EVA session | Session-scoped; observation-only |
| `gcc_client_user` | GCC end user | Own GCC org only; never Atlas admin |

See `IDENTITY_AUTH_MODEL.md`.

## Product boundary warnings

- **Atlas Client 360** ≠ **360 Growth Solution**.
- Copilot MRI “opportunities” ≠ Atlas `HVCG_Opportunities`.
- GCC owns financial/KPI/cash intelligence — do not copy ledgers into `HVCG_*`.
- Cross-system dev environments do not imply shared production security domains.

## Current blocked / gated contracts

| Contract | State |
| --- | --- |
| 360 → Atlas live POST | Staging only; owner approval required |
| Copilot → Atlas live POST | Staging / observation only |
| EVA UI runtime | External deployment; Hub intake exists |
| Atlas → GCC access grant | Persist-only; no auto-provision |
| Paid ads enablement | Always owner-gated (`paidAdsEnabled: false` in contracts) |
