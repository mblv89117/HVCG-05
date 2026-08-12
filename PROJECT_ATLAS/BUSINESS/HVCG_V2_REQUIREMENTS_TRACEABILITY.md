# HVCG V2 Requirements Traceability

| Field | Value |
|-------|--------|
| **As of** | 2026-08-11 (Sprint 13 Documents / Portal / M365 mid-program) |
| **Authority** | CR-HVCG-BA-V2-001 |
| **Machine SoR** | `config/business/hvcg-v2-requirements.json` |
| **Coverage report** | [../Reports/HVCG_V2_REQUIREMENTS_COVERAGE.md](../Reports/HVCG_V2_REQUIREMENTS_COVERAGE.md) |
| **Total requirements** | 131 |
| **Master plan source** | OneDrive `Master Prompt Services and Pricing for HVCG.docx` (extracted for audit) |

## Status vocabulary

Allowed: `IMPLEMENTED`, `EXISTING_REUSED`, `IN_PROGRESS`, `PLANNED`, `DEFERRED_OWNER_GATE`, `NOT_APPLICABLE`, `REJECTED_BY_OWNER`

Forbidden: `IGNORED`, `FORGOTTEN`.

## Source documents

- Master Prompt Services and Pricing for HVCG.docx
- Owner HVCG V2 Full Implementation Control Prompt 2026-08-11
- CR-HVCG-BA-V2-001
- PROJECT_ATLAS/BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md

## Status summary (mid-program · Sprint 13)

| Status | Count |
|--------|------:|
| `IMPLEMENTED` | 58 |
| `EXISTING_REUSED` | 10 |
| `IN_PROGRESS` | 45 |
| `PLANNED` | 16 |
| `DEFERRED_OWNER_GATE` | 2 |
| **Coverage (Implemented+Reused)** | **51.9%** |

**Corrections this review:** Sprint 13 added DOC-004/005/006; DOC-002/003 → IN_PROGRESS with document_os evidence. Coverage % fell honestly (new reqs + demotions). AGT-DOC-CHECKLIST / AGT-SECOND-BRAIN deepened but remain PRODUCTION_GATED — never PRODUCTION_READY from Dev alone. Portal/M365 Production gates recorded.

**Prior:** Sprint 12 added REV-008. AGT-INVOICE/REFERRAL FULL_DEV_RUNTIME (PRODUCTION_GATED). GROW/RISK/AI notes from S9–S11 retained.

## Acceptance checklist coverage (Control §47)

| Checklist item | Requirement IDs | Status(es) |
|----------------|-----------------|------------|
| Seven service lines | HVCG-V2-SVC-001…HVCG-V2-SVC-007 | `IMPLEMENTED` |
| Public/private distinction | HVCG-V2-POS-005 | `IMPLEMENTED` |
| 13 offers | HVCG-V2-OFF-001…HVCG-V2-OFF-013 | `IMPLEMENTED` |
| Diagnostics | HVCG-V2-DIAG-001…HVCG-V2-DIAG-004 | `IMPLEMENTED`, `PLANNED` |
| Layered pricing | HVCG-V2-PRC-001 | `IMPLEMENTED` |
| Success fees | HVCG-V2-PRC-006 | `PLANNED` |
| Premium hourly | HVCG-V2-PRC-002 | `IMPLEMENTED` |
| Referral economics | HVCG-V2-PRC-007 | `PLANNED` |
| Three commercial buckets | HVCG-V2-REV-001 | `IN_PROGRESS` |
| Outcome selling | HVCG-V2-OFF-017 | `PLANNED` |
| Paid diagnostic front door | HVCG-V2-DIAG-001 | `PLANNED` |
| Offer grid | HVCG-V2-OFF-016 | `IMPLEMENTED` |
| Three proposal templates | HVCG-V2-PROP-001 | `IMPLEMENTED` |
| Out-of-scope policy | HVCG-V2-PROP-005 | `IMPLEMENTED` |
| Client migration | HVCG-V2-MIG-001 | `IN_PROGRESS` |
| Existing pricing protection | HVCG-V2-PRC-005 | `IMPLEMENTED` |
| 18 AI agents | HVCG-V2-AI-001…HVCG-V2-AI-018 | `IN_PROGRESS` |
| AI governance | HVCG-V2-AI-019 | `EXISTING_REUSED` |
| M365 workflows | HVCG-V2-WF-001…HVCG-V2-WF-010 | `EXISTING_REUSED`, `PLANNED` |
| Document architecture | HVCG-V2-DOC-001…006 | `IMPLEMENTED` / `IN_PROGRESS` |
| Capital Readiness | HVCG-V2-CAP-002 | `PLANNED` |
| CFO system | HVCG-V2-CFO-001 / CFO-004 | `EXISTING_REUSED` / `IN_PROGRESS` |
| Procurement | HVCG-V2-PROC-001 | `PLANNED` |
| Risk / Claims | HVCG-V2-RISK-001 / RISK-002 | `IN_PROGRESS` |
| Growth OS | HVCG-V2-GROW-001 | `EXISTING_REUSED` |
| Executive Owner Support | HVCG-V2-OWN-001 | `IMPLEMENTED` |
| Second Brain | HVCG-V2-AI-021 | `PLANNED` |
| Compliance language | HVCG-V2-COMP-001 | `IMPLEMENTED` |
| Services not to sell cheaply | HVCG-V2-PRC-008 | `IMPLEMENTED` |
| Referral Partner Pipeline | HVCG-V2-OFF-013 | `IMPLEMENTED` |
| Revenue reconciliation | HVCG-V2-REV-007 | `PLANNED` |
| Content → Diagnostic funnel | HVCG-V2-MKT-001 | `PLANNED` |
| Five content pillars | HVCG-V2-MKT-002 | `IMPLEMENTED` |
| High Value Founder strategy | HVCG-V2-POS-004 | `DEFERRED_OWNER_GATE` |
| Lead magnets | HVCG-V2-MKT-003 | `PLANNED` |
| Acquisition attribution | HVCG-V2-REV-006 | `PLANNED` |
| Website messaging | HVCG-V2-MKT-005 | `IN_PROGRESS` |
| Offer one-pagers | HVCG-V2-OFF-018 | `PLANNED` |
| Intake forms | HVCG-V2-TRN-002 | `PLANNED` |
| Sales playbook | HVCG-V2-TRN-001 | `IMPLEMENTED` |
| Employee training | HVCG-V2-TRN-001 | `IMPLEMENTED` |
| Executive dashboard | HVCG-V2-RPT-001 | `PLANNED` |

## Ambiguities / conflicts requiring owner attention

| Topic | Detail |
|-------|--------|
| Paid diagnostic vs BL-P1 SKU-FRA FREE | V2 paid front door vs locked FREE assessment |
| Activate pricing V2 | Remains PROPOSED until supersedes BL-P1 |
| High Value Founder public launch | Brand relationship documented; launch owner-gated |
| Master plan HR line | Preserved via SVC-008 + AGT-HR-DOCS; not 8th public service line |

## Requirements ledger

| ID | Requirement | Category | Module | Sprint | Priority | Status | Evidence |
|----|-------------|----------|--------|--------|----------|--------|----------|
| `HVCG-V2-AI-001` | Agent configuration for Client Intake Agent with purpose/trigger/IO/tools/approvals/ris… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-002` | Agent configuration for Document Checklist Agent with purpose/trigger/IO/tools/approval… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-003` | Agent configuration for Capital Readiness Agent with purpose/trigger/IO/tools/approvals… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-004` | Agent configuration for Financial Package Agent with purpose/trigger/IO/tools/approvals… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-005` | Agent configuration for Contract Procurement Agent with purpose/trigger/IO/tools/approv… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-006` | Agent configuration for Government Registration Agent with purpose/trigger/IO/tools/app… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-007` | Agent configuration for Regulatory/Tax Appeal Agent with purpose/trigger/IO/tools/appro… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-008` | Agent configuration for Unemployment Claim Agent with purpose/trigger/IO/tools/approval… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-009` | Agent configuration for Risk/Insurance Review Agent with purpose/trigger/IO/tools/appro… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-010` | Agent configuration for Claims & Recovery Agent with purpose/trigger/IO/tools/approvals… | AI | AI Governance | BA-H | P0 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-011` | Agent configuration for HR/Workforce Docs Agent with purpose/trigger/IO/tools/approvals… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-012` | Agent configuration for Proposal & Pricing Agent with purpose/trigger/IO/tools/approval… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-013` | Agent configuration for CRM Update Agent with purpose/trigger/IO/tools/approvals/risk/p… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-014` | Agent configuration for Invoice & Payment Reconciliation Agent with purpose/trigger/IO/… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-015` | Agent configuration for Referral Partner Agent with purpose/trigger/IO/tools/approvals/… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-016` | Agent configuration for Client Success Agent with purpose/trigger/IO/tools/approvals/ri… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-017` | Agent configuration for Executive Concierge Agent with purpose/trigger/IO/tools/approva… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-018` | Agent configuration for AI Second Brain Agent with purpose/trigger/IO/tools/approvals/r… | AI | AI Governance | BA-H | P1 | `IN_PROGRESS` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-019` | Single AI governance plane — no competing system | AI | AI Governance | BA-H | P0 | `EXISTING_REUSED` | docs/ai/AI_GOVERNANCE.md |
| `HVCG-V2-AI-020` | Absolute prohibited AI autonomy list enforced | AI | AI Governance | BA-A S1 | P0 | `IMPLEMENTED` | config/business/hvcg-agents-v2.json |
| `HVCG-V2-AI-021` | Permission-aware Second Brain knowledge model covering strategy/offers/pricing/clients/… | AI / Knowledge | Knowledge / AI | BA-H | P1 | `PLANNED` |  |
| `HVCG-V2-AI-022` | Agent priority order: Intake→Checklist→Capital→Financial/Lender→Proposal→CRM→Referral→I… | AI | AI | BA-H | P0 | `PLANNED` |  |
| `HVCG-V2-C360-001` | Extend Elite Client 360 with Revenue/Capital/Procurement/Risk/Migration/AI sections | Client Experience | Elite Client 360 | BA-J | P0 | `EXISTING_REUSED` | Absolute GO Client 360 |
| `HVCG-V2-CAP-001` | Capital Case domain extending CapitalOpportunities | Capital | Capital | BA-C | P0 | `EXISTING_REUSED` | src/sharepoint/lists/HVCG_CapitalOpportunities.json |
| `HVCG-V2-CAP-002` | Configurable capital readiness scoring engine + disclaimer | Capital | Capital | BA-C | P0 | `PLANNED` |  |
| `HVCG-V2-CAP-003` | Lender pipeline, submissions, term sheets, closing — human approval before lender submit | Capital | Capital | BA-C | P1 | `PLANNED` |  |
| `HVCG-V2-CAP-004` | Capital data rooms via existing portal/data-room packages | Capital / Portal | Portal data-rooms | BA-C/J | P1 | `PLANNED` |  |
| `HVCG-V2-CFO-001` | Fractional CFO layer on Finance Ops/FI/QBO/Plaid — no new Finance SPA | CFO | Finance | BA-D | P0 | `EXISTING_REUSED` | Elite `/financials` extended |
| `HVCG-V2-CFO-002` | Financial metric provenance: Live/Verified/Pending/Imported/Mock/Estimated/Client Provided | CFO | Finance / Elite | BA-D | P0 | `IN_PROGRESS` | Authority classes in policy/engine |
| `HVCG-V2-CFO-003` | Integrate QBO tip and Plaid after gates | CFO | Finance | BA-D | P1 | `DEFERRED_OWNER_GATE` |  |
| `HVCG-V2-CFO-004` | Fractional CFO monthly operating OS (engagement→report→Capital continuity) | CFO | Finance / Elite | BA-D | P0 | `IN_PROGRESS` | Not full product IMPLEMENTED |
| `HVCG-V2-COMP-001` | Versioned compliance language library (general/financing/legal/tax/insurance/mortgage/e… | Compliance | Business Catalog | BA-A S2 | P0 | `IMPLEMENTED` | config/business/compliance-language.json |
| `HVCG-V2-COMP-002` | External communications remain draft+approve; BL-C1 locked | Compliance | Platform | Standing | P0 | `EXISTING_REUSED` | PROJECT_ATLAS/DECISIONS.md |
| `HVCG-V2-DIAG-001` | Paid diagnostic front door architecture (avoid free complex strategy work) | Diagnostics | Revenue OS | BA-B | P0 | `PLANNED` |  |
| `HVCG-V2-DIAG-002` | Capital Readiness Diagnostic levels: Starter ~2500 / Full ~5000 / Executive ~10000 | Diagnostics | Revenue | BA-A S2 | P0 | `IMPLEMENTED` | config/business/diagnostics.json |
| `HVCG-V2-DIAG-003` | Domain diagnostics: CFO/Procurement/Risk/AI/Growth/Institutional | Diagnostics | Revenue | BA-B | P1 | `PLANNED` |  |
| `HVCG-V2-DIAG-004` | Need → Diagnostic → Findings → Offer → Proposal mapping | Diagnostics / Revenue | Revenue OS | BA-B | P0 | `PLANNED` |  |
| `HVCG-V2-DOC-001` | Reconcile client folder taxonomy with V2 00-13 model; preserve legacy 00-23 | Documents | SharePoint | BA-A S2 | P1 | `IMPLEMENTED` | config/business/folder-taxonomy-map.json |
| `HVCG-V2-DOC-002` | Email attachment intake: identify→classify→SP→checklist→audit; no unsafe auto-file | Documents | Integration Hub / SP | BA-J/H S13 | P1 | `IN_PROGRESS` | document_os ingest + client-match |
| `HVCG-V2-DOC-003` | Extend Document Request statuses and completion %; checklist ≠ document | Documents | Portal / SP | BA-J S13 | P1 | `IN_PROGRESS` | DocumentRequests + document_os |
| `HVCG-V2-DOC-004` | Canonical Document Record metadata; SharePoint bytes SoR | Documents | Documents / SP | BA-J S13 | P0 | `IN_PROGRESS` | HVCG_DocumentRecords + document_os |
| `HVCG-V2-DOC-005` | Client Portal documents with server-side isolation (Prod gated) | Documents | Client Portal | BA-J S13 | P0 | `IN_PROGRESS` | DocumentLifecycleWorkbench + GATE-CLIENT-PORTAL-PROD |
| `HVCG-V2-DOC-006` | Second Brain document retrieval + citations (Prod gated) | AI / Documents | Second Brain / SP | BA-J/H S13 | P1 | `IN_PROGRESS` | second_brain_document_query + GATE-M365-SECOND-BRAIN-PROD |
| `HVCG-V2-GROW-001` | Growth OS via Ops Hub + Revenue — 90-day plans/KPIs/SOPs/cadence | Growth | Operations Hub | BA-G | P1 | `EXISTING_REUSED` |  |
| `HVCG-V2-MIG-001` | Client migration workflow with full state fields (not just seed table) | Client Migration | Migration | BA-A/J | P0 | `IN_PROGRESS` | config/business/client-migration-seed.json; src/sharepoint/lists/HVCG_ClientMigr |
| `HVCG-V2-MIG-002` | Never auto-reprice legacy clients | Client Migration | Migration | BA-A S1 | P0 | `IMPLEMENTED` | tests/unit/business/test_business_architecture_v2.py |
| `HVCG-V2-MIG-003` | Migration priority queue: ACCG, Prodigy, Lien, Final Installment, Nabro, Jay's, That's … | Client Migration | Migration | BA-A S2 | P0 | `IN_PROGRESS` | config/business/client-migration-seed.json |
| `HVCG-V2-MIG-004` | Separate confirmed vs proposed revenue; UNKNOWN when unverified | Client Migration | Migration | BA-A S1 | P0 | `IMPLEMENTED` | tests/unit/business/test_business_architecture_v2.py |
| `HVCG-V2-MIG-005` | ACCG multi-line opportunity (Capital+CFO+Procurement+Growth+AI) with contracted price p… | Client Migration | Migration | BA-J | P1 | `PLANNED` |  |
| `HVCG-V2-MKT-001` | Business Development / Content operating plan in Atlas (strategy/campaigns/CTA/attribut… | Marketing / Content | Marketing OS | BA-L | P1 | `PLANNED` |  |
| `HVCG-V2-MKT-002` | Five content pillars: Capital, Control, Risk, Systems, AI | Marketing / Content | Marketing | BA-A S2 | P1 | `IMPLEMENTED` | config/business/content-and-acquisition.json |
| `HVCG-V2-MKT-003` | Lead magnets backlog: Capital Readiness Checklist; Lender-Ready Docs; Founder OS Scorec… | Marketing | Marketing | BA-L | P2 | `PLANNED` |  |
| `HVCG-V2-MKT-004` | BD partner types: owners/lenders/SBA/CPAs/attorneys/insurance/govcon/RE/fractional/AI p… | Referrals / BD | Referrals | BA-I | P1 | `PLANNED` |  |
| `HVCG-V2-MKT-005` | Canonical website messaging prepared; publish gated | Marketing / Website | Website | BA-L | P1 | `IN_PROGRESS` | config/business/website-messaging.json |
| `HVCG-V2-OFF-001` | Offer catalog includes: Capital Readiness Diagnostic | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-002` | Offer catalog includes: Lender-Ready Capital Package | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-003` | Offer catalog includes: Fractional CFO Operating Partner | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-004` | Offer catalog includes: Contract Procurement Readiness Package | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-005` | Offer catalog includes: Government Contractor Setup Package | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-006` | Offer catalog includes: Risk Reduction & Liability Review | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-007` | Offer catalog includes: Employer Tax / Unemployment Appeal Support | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-008` | Offer catalog includes: Business Recovery & Claims Support | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-009` | Offer catalog includes: Growth Operating System | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-010` | Offer catalog includes: Executive Owner Support Program | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-011` | Offer catalog includes: AI Second Brain for Business Owners | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-012` | Offer catalog includes: AI Operations Agent System | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-013` | Offer catalog includes: Referral Partner Pipeline Engine | Offers | Business Catalog | BA-A S1-S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-014` | Every offer record includes who/problem/deliverables/fees/retainer/success/term/inputs/… | Offers | Business Catalog | BA-A S2 | P0 | `IMPLEMENTED` | config/business/offer-catalog.json |
| `HVCG-V2-OFF-015` | Deterministic Offer Decision Engine (need → offer) before AI recommendations | Offers / Revenue | Revenue OS | BA-B S2-S3 | P0 | `IN_PROGRESS` | config/business/offer-decision-engine.json; config/business/commercial_rules.py |
| `HVCG-V2-OFF-016` | One-page Offer Grid (need → offer → price model → next step) usable in Atlas/sales/AI/t… | Sales Enablement | Revenue / Training | BA-A S2 | P0 | `IMPLEMENTED` | config/business/offer-grid.json |
| `HVCG-V2-OFF-017` | Outcome selling: discourage task quotes; recommend named offers | Sales Enablement | Revenue OS / Proposals | BA-B | P0 | `PLANNED` |  |
| `HVCG-V2-OFF-018` | Offer one-pagers backlog for core offers using catalog pricing | Sales Enablement | Business Catalog | BA-L | P2 | `PLANNED` |  |
| `HVCG-V2-OWN-001` | Executive Owner Support private/restricted/high-trust; not marketed like public lines | Executive Support | Elite / Security | BA-A/F | P0 | `IMPLEMENTED` | config/business/service-lines.json; config/business/commercial_rules.py |
| `HVCG-V2-OWN-002` | Restricted SharePoint locations and restricted AI processing for owner docs | Executive Support | Security / SP | BA-F | P1 | `PLANNED` |  |
| `HVCG-V2-POS-001` | Canonical premium positioning: capital, strategic finance, risk reduction, growth, AI o… | Positioning | Business Catalog / Second Brain | BA-A S1 | P0 | `IN_PROGRESS` | PROJECT_ATLAS/BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md; config/business/positio |
| `HVCG-V2-POS-002` | One-sentence commercial message: help serious owners access capital, clean up financial… | Positioning | Business Catalog | BA-A S2 | P0 | `IN_PROGRESS` | config/business/positioning.json |
| `HVCG-V2-POS-003` | Website headline/config prepared but not published | Positioning / Marketing | Website / Track 3 | BA-L | P1 | `PLANNED` |  |
| `HVCG-V2-POS-004` | High Value Founder = content/authority identity; HVCG = business; podcast=voice; music=… | Positioning / Brand | Business Catalog / Marketing | BA-L | P1 | `DEFERRED_OWNER_GATE` |  |
| `HVCG-V2-POS-005` | Public vs private service distinction enforced in catalog and UI | Positioning | Elite / Catalog | BA-A S2 | P0 | `IMPLEMENTED` | config/business/service-lines.json; config/business/positioning.json; config/bus |
| `HVCG-V2-PRC-001` | Versioned layered pricing: Diagnostic/Setup/Retainer/Success/Hourly/Replenishing/Referr… | Pricing | Revenue / Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/pricing-rate-card-v2.json; src/sharepoint/lists/HVCG_PricingVers |
| `HVCG-V2-PRC-002` | Preserve V2 diagnostic/build/retainer/hourly ranges in configuration | Pricing | Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/pricing-rate-card-v2.json |
| `HVCG-V2-PRC-003` | Current selling rate card remains HVCG-PRICE-2026-07-15-v1 until owner activates V2 | Pricing | Revenue | BA-A | P0 | `EXISTING_REUSED` | config/business/pricing_policy.py; PROJECT_ATLAS/DECISIONS.md |
| `HVCG-V2-PRC-004` | Price states: Contracted/Historical/RateCard/Recommended/Proposed/ApprovedFuture/Effective | Pricing | Revenue / Migration | BA-A S1-S2 | P0 | `IN_PROGRESS` | config/business/pricing_policy.py |
| `HVCG-V2-PRC-005` | ACCG contracted $4539/mo protected; never overwritten by V2 ranges | Pricing / Migration | Migration | BA-A S1 | P0 | `IMPLEMENTED` | config/business/client-migration-seed.json; tests/unit/business/test_business_ar |
| `HVCG-V2-PRC-006` | Success-fee structures with base/%/trigger/causation/exclusions/tail/due/collected/comp… | Pricing | Revenue / Capital | BA-B/I | P1 | `PLANNED` |  |
| `HVCG-V2-PRC-007` | Referral payouts: 10% diagnostic collected; 10% first 3 retainer months; 10-20% collect… | Referrals | Referrals | BA-I | P1 | `PLANNED` |  |
| `HVCG-V2-PRC-008` | Services not to sell cheaply guidance encoded | Pricing / Sales | Sales Enablement | BA-A S2 | P1 | `IMPLEMENTED` | config/business/do-not-sell-cheap.json |
| `HVCG-V2-PROC-001` | Contractor Profile + Procurement Opportunity domains | Procurement | Procurement | BA-E | P1 | `IN_PROGRESS` | Sprint 8 Dev engine + lists + Elite |
| `HVCG-V2-PROC-002` | AI may prepare but NEVER auto-submit bids | Procurement / AI | Procurement / AI | BA-E/H | P0 | `IN_PROGRESS` | Submission gate + BL-C1 |
| `HVCG-V2-PROP-001` | Three proposal archetypes only: Structured / Retainer / Premium Special | Proposals | Revenue / Proposals | BA-B | P0 | `IMPLEMENTED` | config/business/proposal-archetypes.json; templates/proposals/ |
| `HVCG-V2-PROP-002` | Structured Offer required sections 1-10 | Proposals | Proposals | BA-A S2 | P0 | `IMPLEMENTED` | templates/proposals/STRUCTURED_OFFER.md |
| `HVCG-V2-PROP-003` | Monthly Retainer required sections 1-11 | Proposals | Proposals | BA-A S2 | P0 | `IMPLEMENTED` | templates/proposals/MONTHLY_RETAINER.md |
| `HVCG-V2-PROP-004` | Premium Special Project required sections 1-12 | Proposals | Proposals | BA-A S2 | P0 | `IMPLEMENTED` | templates/proposals/PREMIUM_SPECIAL_PROJECT.md |
| `HVCG-V2-PROP-005` | Out-of-scope standard clause in structured/retainer proposals | Proposals / Compliance | Proposals | BA-A S2 | P0 | `IMPLEMENTED` | config/business/compliance-language.json; templates/proposals/ |
| `HVCG-V2-PROP-006` | AI may draft proposals; human approval required; never auto-send | Proposals / AI | AI Governance / Proposals | BA-H | P0 | `PLANNED` |  |
| `HVCG-V2-REV-001` | Qualified opportunities require CommercialClass STRUCTURED_OFFER\|RECURRING_RETAINER\|P… | Revenue OS | Revenue OS | BA-A S2 | P0 | `IN_PROGRESS` | src/sharepoint/lists/HVCG_Opportunities.json; config/business/commercial_rules.p |
| `HVCG-V2-REV-002` | Progressive validation: Lead optional; Qualified requires class; Proposal requires Serv… | Revenue OS | Revenue OS | BA-A S2 | P0 | `IN_PROGRESS` | config/business/commercial_rules.py; tests/unit/business/test_commercial_sprint2 |
| `HVCG-V2-REV-003` | Internal sales qualification checklist with DECLINE_OR_PREMIUM_PRICE_REVIEW flag (human… | Revenue OS | Revenue / Sales | BA-A S2 | P0 | `IMPLEMENTED` | config/business/qualification-checklist.json; config/business/commercial_rules.p |
| `HVCG-V2-REV-004` | Reuse existing Revenue OS EVA/conversion rather than rebuild | Revenue OS | Revenue OS | BA-B | P0 | `EXISTING_REUSED` | PROJECT_ATLAS/Tracks/Track2_RevenueOS.md |
| `HVCG-V2-REV-005` | Sales ladder: Authority → Paid Diagnostic → Package → Retainer → Success → Premium/Ente… | Revenue / Reporting | Revenue / Exec | BA-K | P1 | `PLANNED` |  |
| `HVCG-V2-REV-006` | Acquisition source attribution (podcast/linkedin/youtube/.../referral/etc.) | Revenue / Marketing | CRM / Leads | BA-B/L | P1 | `PLANNED` |  |
| `HVCG-V2-REV-007` | Distinguish historical/billed/collected/outstanding/proposed/pipeline revenue types | Revenue | Finance / Revenue | BA-I/K | P1 | `PLANNED` |  |
| `HVCG-V2-RISK-001` | Risk & Claims Matters domain (distinct from ops HVCG_Risks) | Risk | Risk | BA-F | P1 | `IN_PROGRESS` | Sprint 9 Dev engine + lists + Elite |
| `HVCG-V2-RISK-002` | Elevated access for sensitive risk/claims/owner matters | Risk / Security | Security | BA-F | P0 | `IN_PROGRESS` | Elevated flags; full ACL productization incomplete |
| `HVCG-V2-RPT-001` | Executive commercial dashboard views (acquisition/diagnostics/offers/revenue/expansion/… | Reporting | Elite / Exec | BA-K | P1 | `PLANNED` |  |
| `HVCG-V2-RPT-002` | Never fabricate unavailable metrics | Reporting | Exec | Standing | P0 | `EXISTING_REUSED` |  |
| `HVCG-V2-SVC-001` | Service line SL-CAPITAL: Capital Advisory & Lender Readiness (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-002` | Service line SL-FCFO: Fractional CFO & Strategic Finance (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-003` | Service line SL-PROCUREMENT: Contract Procurement & Government Readiness (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-004` | Service line SL-RISK: Risk, Claims & Liability Reduction (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-005` | Service line SL-GROWTH: Growth & Operating Systems (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-006` | Service line SL-AI: Agentic AI & Second Brain Systems (public) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-007` | Service line SL-OWNER: Executive Owner Support (PRIVATE/RESTRICTED) | Service Architecture | Business Catalog | BA-A S1 | P0 | `IMPLEMENTED` | config/business/service-lines.json; src/sharepoint/lists/HVCG_ServiceLines.json |
| `HVCG-V2-SVC-008` | HR & Workforce advisory capability preserved (master plan category 6) mapped into Risk/… | Service Architecture | Risk / Growth / AI | BA-F/H | P1 | `PLANNED` |  |
| `HVCG-V2-SYS-001` | Formal CR-HVCG-BA-V2-001 and impact analysis | Governance | Atlas | BA-A S1 | P0 | `IMPLEMENTED` | PROJECT_ATLAS/ChangeRequests/CR-HVCG-BA-V2-001.md |
| `HVCG-V2-SYS-002` | Requirements traceability ledger + JSON + coverage report | Governance | Atlas | BA-A S2 | P0 | `IMPLEMENTED` | PROJECT_ATLAS/BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md; config/business/hvc |
| `HVCG-V2-SYS-003` | No Production schema mutation / deploy under this CR without owner | Governance | Platform | Standing | P0 | `EXISTING_REUSED` |  |
| `HVCG-V2-TRN-001` | HVCG commercial playbook so new employees can sell/classify/price/scope/AI safely | Training | Atlas Docs | BA-A S2 | P0 | `IMPLEMENTED` | PROJECT_ATLAS/BUSINESS/HVCG_COMMERCIAL_PLAYBOOK.md |
| `HVCG-V2-TRN-002` | Intake form specs: General/Capital/CFO/Procurement/Risk/AI/Owner(restricted) | Training / Revenue | Revenue / Forms | BA-B/L | P1 | `PLANNED` |  |
| `HVCG-V2-WF-001` | Workflow: Intake→Lead→workspace→internal alert | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `EXISTING_REUSED` | HVCG_EvaFormCreateLead / CreateClientWorkspace |
| `HVCG-V2-WF-002` | Workflow: Opportunity→checklist→tasks | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-003` | Workflow: Document upload→checklist→review | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `EXISTING_REUSED` | DocumentRequests + flows |
| `HVCG-V2-WF-004` | Workflow: Proposal approved→doc gen→human review | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-005` | Workflow: Invoice→revenue tracker→aging | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-006` | Workflow: Referral→partner→deal attribution | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-007` | Workflow: Monthly retainer→recurring review tasks | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-008` | Workflow: Capital package complete→lender submission approval | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-009` | Workflow: Missed milestone→client-success alert | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `PLANNED` |  |
| `HVCG-V2-WF-010` | Workflow: AI request→governance/approval queue | Microsoft 365 | Power Automate / Hub | BA-B/C/I/H | P1 | `EXISTING_REUSED` | HVCG_AIApprovals / AIJobs |

## Update rule

Update `config/business/hvcg-v2-requirements.json` first, then regenerate this file and the coverage report. Status changes require evidence paths.

