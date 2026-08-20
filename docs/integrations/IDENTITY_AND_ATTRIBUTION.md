# Identity and Attribution Contract

This document defines stable correlation across current High Value systems without forcing one database ID everywhere.

## Core identity

| Business object | Current source of authority | Correlation fields |
| --- | --- | --- |
| Company / account | Atlas `HVCG_Clients` | `ClientCode`, SharePoint item ID, display name |
| Contact | Atlas `HVCG_Contacts` | SharePoint item ID, `Email`, `ClientCode` / `ClientId` lookup |
| Lead | Atlas `HVCG_Leads` | SharePoint item ID, `HVCG_IdempotencyKey`, `Email`, `Source`, `LeadSourceDetail` |
| Opportunity | Atlas `HVCG_Opportunities` | SharePoint item ID, `LeadId`, `ClientId`, `ClientCode`, `HVCG_IdempotencyKey` |
| Client / engagement | Atlas `HVCG_Clients` plus activation/workspace records | `ClientCode`, `ClientStage`; activation is governed separately |
| Assessment | EVA / Agent Copilot source systems | `sessionId`, `assessmentId`, source payload provenance |
| GCC tenant | GCC Supabase | `organizations.id`; no Atlas mapping in current scope |

## Attribution fields

Preserve supplied values; do not invent missing values.

| Field class | Atlas current fields | Notes |
| --- | --- | --- |
| Source | `HVCG_Leads.Source` | Examples: `Website-EVA`, `Website-Funding`. |
| Source detail | `HVCG_Leads.LeadSourceDetail` | Usually `submissionType` or `website-intake`. |
| Campaign / UTM | Not formalized on `HVCG_Leads` today | Store only if a schema/migration explicitly adds fields or payload notes preserve raw provenance. |
| Assessment | `Notes` payload context for website/EVA; Copilot handoff `assessmentId` | Assessment output is source context until governed review. |
| Lead | `HVCG_Leads` item ID | Conversion writes lookup fields back to the lead. |
| Opportunity | `HVCG_Opportunities` item ID | Lead conversion idempotency is `opp-from-lead|{LeadId}`. |
| Client | `HVCG_Clients.ClientCode` | `Prospect` is not active client access. |

## Lifecycle mapping

1. 360 / referral / website / EVA produces an attributed intake event.
2. Atlas Hub writes or updates `HVCG_Leads`.
3. Atlas operator converts the lead into:
   - `HVCG_Clients` company/account with `ClientStage=Prospect`
   - `HVCG_Contacts`
   - `HVCG_Opportunities` with `Stage=Discovery`
4. Opportunity operations manage owner, stage, next action, attention, ETag, and win/loss outcome.
5. Won does not equal active client. Client activation is a separate governed event.
6. GCC handoff requires an explicitly activated client and a future approved tenant mapping.

## Product boundary warnings

- **Atlas Client 360** is M365/Hub entity resolution and is not **360 Growth Solution**.
- Agent Copilot AI observations are not verified financial, capital, legal, or client commitment facts.
- GCC owns financial/KPI/cash intelligence. Atlas should not copy GCC ledgers or dashboards into `HVCG_*`.
- Cross-system development environments do not imply shared production security domains.

## Current blocked contracts

| Contract | Current state |
| --- | --- |
| 360 Growth -> EVA / Atlas | 360 `@360gs/atlas-handoff` stages attributed leads locally. Live Hub POST is not enabled. |
| Agent Copilot -> Atlas lead handoff | Copilot stages `copilot|{assessmentId}` locally as observation-only. Live Hub POST is not enabled. |
| EVA runtime -> Atlas | Atlas-side website intake exists; EVA UI remains an external HVCG-site / Autonomous Marketing deployment. |
| Atlas -> GCC | Persist-only `atlas-gcc-client-activation.v1` receiver exists. Access is not auto-provisioned. |
