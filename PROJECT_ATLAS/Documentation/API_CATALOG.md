# Project Atlas API and Interface Catalog

| Field | Value |
|---|---|
| Purpose | Catalog repository-evidenced interfaces without claiming live availability |
| Audience | Developers, architects, QA, and integration owners |
| Owner | Documentation & Knowledge Manager; interface facts owned by implementing tracks |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| External dependency policy | MOCKED for this review |

## Catalog

| ID | Interface | Producer → Consumer | Evidence | Environment/status |
|---|---|---|---|---|
| ATLAS-IF-001 | EVA CRM payload schema v1 | EVA assessment → CRM lead intake | `PROJECT_ATLAS/Sprints/Sprint2.md`; Revenue commit `0073bf4` | Development evidence; schema contract |
| ATLAS-IF-002 | EVA lead-create HTTP/Forms path | Staging EVA → `HVCG_EvaFormCreateLead` | `PROJECT_ATLAS/ARCHITECTURE.md`; Sprint 1 | Dev path proven; live UI callback optional/not fully wired |
| ATLAS-IF-003 | Revenue conversion engine | EVA answers → conversion model | `PROJECT_ATLAS/Tracks/Track2_RevenueOS.md` | Complete in Dev/Staging |
| ATLAS-IF-004 | Revenue activation engine | Conversion result → pricing/qualification/proposal/pipeline/exec data | `PROJECT_ATLAS/Architecture/RevenueSprint4SalesEngine.md` | Complete in Dev/Staging at `7e4eb10` |
| ATLAS-IF-005 | Power Platform connection references | Solution flows → SharePoint/Outlook/Teams/Approvals | `PROJECT_ATLAS/ARCHITECTURE.md`; release package connection docs | External/mock; binding governed by Deployment |
| ATLAS-IF-006 | Agent communications bus | Agents → repository JSON inbox/outbox | `docs/agents/AGENT_COMMUNICATIONS.md` | Local repository interface |
| ATLAS-IF-007 | Project Atlas proposal handoff | Specialist track → Atlas owner | `PROJECT_ATLAS/OWNERSHIP.md` | Documentation-only interface |

## ATLAS-IF-001: EVA CRM payload

- Version: v1.
- Schema authority: Revenue Sprint 2–3 evidence at commit `0073bf4`.
- Compatibility rule: locked `schemaOnly` keys must not change without a versioned interface proposal and contract tests.
- Security: no real client payloads in documentation or fixtures.
- Mock behavior: synthetic payload accepted/rejected against repository contract tests; no live CRM call.

## ATLAS-IF-002: Lead-create callback

- Intended transport: Forms/HTTP.
- Intended target: `HVCG_EvaFormCreateLead`.
- Current documented limitation: callback URL is optional/not fully wired for live UI POST.
- Mock behavior: return a synthetic success/failure response; do not call Dynamics or Power Automate.
- Required owner track: Revenue + CRM/Automation interface review.

## ATLAS-IF-004: Sales engine modules

Repository evidence lists:

- `HVCG_EVA_CONVERSION.build()`
- `HVCG_EVA_ACTIVATION.build()`
- `HVCG_EVA_PRICING.build(config)`
- `HVCG_EVA_SALES_QUAL.build(config)`
- `HVCG_EVA_PROPOSAL.build()`
- `HVCG_EVA_PIPELINE.build(config)` — Draft shells only
- `HVCG_EVA_EXEC_REVENUE` data model

Configuration owns pricing, SKU, threshold, and trigger rules. This catalog does not redefine those contracts.

## Missing interface specifications

| Gap | Owning track | Required specification |
|---|---|---|
| Public website/DNS | Website/Deployment | publish, rollback, DNS ownership, validation |
| Client outbound/portal invite | Portal/Operations | consent, approval, audit, failure handling |
| Payment/bank integrations | Finance | provider-neutral contract and mock |
| Canvas publication | CRM/Deployment | solution version, environment binding, rollback |
| Full Production SharePoint schema | Data/Deployment | inventory, migration, validation |

No general public REST API was evidenced in authoritative Atlas. Do not invent one.

