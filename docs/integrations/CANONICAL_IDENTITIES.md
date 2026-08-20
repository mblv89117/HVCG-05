# Canonical Identities

Authoritative typed references for High Value platform interoperability.
Product adapters may map local IDs; they must not redefine canonical meaning.

## Typed reference

Every cross-system payload that names an entity SHOULD use `typed-ref.v1.json`:

| Field | Rule |
| --- | --- |
| `system` | Owning product: `atlas`, `360`, `gcc`, `copilot`, `eva`, `website`, `hvcg-internal` |
| `entity` | Canonical entity name from the table below |
| `id` | Opaque ID **in that system's namespace** |
| `clientCode` | Atlas `ClientCode` only when the entity is Atlas-linked |

**Hard rule:** A GCC `organizations.id`, 360 tenant/org UUID, Copilot organization id, or marketing tenant id MUST NEVER be treated as an Atlas `ClientCode` (or the reverse) without an explicit mapping record.

## Entity authority

| Entity | Canonical authority | Stable key | Forbidden masquerade |
| --- | --- | --- | --- |
| Company | Atlas `HVCG_Clients` after commercial conversion; 360 owns pre-CRM GTM targets | Atlas: `ClientCode`; 360: `companyId` via `gtm-company-profile.v1` | 360/GCC org UUID ≠ `ClientCode` |
| Contact | Atlas `HVCG_Contacts` | SharePoint item ID + email | Marketing form email alone ≠ durable contact ID |
| Lead | Atlas `HVCG_Leads` | SP item ID + `HVCG_IdempotencyKey` | Source lead IDs are provenance, not Atlas Lead IDs until written |
| Opportunity | Atlas `HVCG_Opportunities` | SP item ID + `opp-from-lead\|{LeadId}` | Copilot MRI “opportunity” ≠ Atlas opportunity |
| Diagnostic | EVA / website funnel | `sessionId` / diagnostic id in source system | Not a Lead or Client |
| Assessment | Copilot / EVA | `assessmentId` (Copilot) or EVA `sessionId` | Not verified financial fact |
| Campaign | 360 Growth | `campaignId` (`campaign-spec.v1`) | Not an Atlas list ID |
| Engagement | Atlas engagements / projects | Atlas engagement ID + `engagement\|{opportunityId}` | Not GCC tenant |
| Client | Atlas `HVCG_Clients` with governed stage | `ClientCode`; Active Client only via activation event | Prospect ≠ Active Client ≠ GCC user |
| Capital Need | Atlas capital module | Capital opportunity ID / `cap-from-opp\|{OpportunityId}` | Not auto-submitted externally |
| Project | Atlas projects | Atlas project ID | Not a campaign |
| Booking | GTM/Atlas meetings | `bookingId` / `booking\|{bookingId}` | Retries must not duplicate |
| Proposal | Atlas proposals | `proposalId` (`proposal-context.v1`) | Draft ≠ sent commitment |
| Revenue Outcome | Atlas finance/commercial | `outcomeId` (`revenue-outcome.v1`) | Not a GCC ledger row |
| GTM Experiment | 360 Growth | `experimentId` (`experiment-spec.v1`) | Learning events must not spend ads |

## Product ID namespaces

| Product | Local root identity | Maps to Atlas via |
| --- | --- | --- |
| Atlas | `ClientCode` / `HVCG_*` item IDs | Native |
| 360 | `organizations` / brand / `companyId` / `leadId` | `360\|{leadId}` → `HVCG_Leads` then conversion |
| Agent Copilot | Organization + `assessmentId` | `copilot\|{assessmentId}` → `HVCG_Leads` (staged) |
| GCC | `organizations.id` | `gcc-activate\|{ClientCode}\|…` prepare_tenant_mapping only |
| EVA | `sessionId` | `eva\|{sessionId}` → `HVCG_Leads` |

## Naming conventions

- JSON Schema `$id`: `https://highvaluecapitalgroup.com/contracts/<name>.v1.json`
- Contract version string: kebab-case + `.vN`
- Idempotency keys: `{source-or-action}|{natural-id}` with `|` separators
