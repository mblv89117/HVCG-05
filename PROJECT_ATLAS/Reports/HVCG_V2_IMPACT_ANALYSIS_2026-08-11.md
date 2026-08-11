# HVCG V2 Impact Analysis

**Date:** 2026-08-11  
**CR:** [CR-HVCG-BA-V2-001](../ChangeRequests/CR-HVCG-BA-V2-001.md)  
**Branch:** `cursor/hvcg-business-architecture-v2`  
**Method:** Repository evidence only (Atlas indexes + git + worktree deployment reports + SharePoint schemas + Revenue/commercial worktrees)

---

## 0. Status discrepancy (binding)

Root `PROJECT_ATLAS/CURRENT_STATE.md` (as of 2026-07-19) still reports Elite Production **NO-GO** / readiness 44% / RC1 tip `95ec0fa`.

**Verified later evidence:**

| Fact | Evidence |
|------|----------|
| Absolute GO **GO** 2026-07-22 | `.worktrees/atlas-integration-release/deployment/reports/ATLAS_V1_PRODUCTION_ABSOLUTE_GO.md` |
| Tag `atlas-v1.0.1-production` → `dceea798` | git tag + Absolute GO release record |
| Merged to `origin/main` | PR #2 merge `a3a945b` |
| Production SWA live | Absolute GO URLs; later usable-operating-layer redeploys |
| Written QA GO | Still **NOT ISSUED** as a formal QA artifact |
| Track 1 freeze + BL-C1 emails Off | Still in force |

**Reconciliation:** Treat Absolute GO + tags as Elite Production release SoR. Treat Jul-19 CURRENT_STATE as **stale for Production**. Update CURRENT_STATE on this branch. Do not assume Written QA GO was issued.

---

## 1. Gap matrix

| Requirement | Existing Atlas capability | Status | Reuse | Extend | New | Risk | Owner |
|-------------|---------------------------|--------|-------|--------|-----|------|-------|
| Service catalog | Free-text `ServicePackage`; TrainingCatalog only | Partial | Templates | Engagement types | ServiceLines + Offers entities | Medium | Revenue / Architect |
| Offer catalog (13) | SKUs in PRICING_REGISTER + conversion-engine | Partial | SKU map | Normalize to Offers | Offer records | Medium | Revenue |
| Pricing versioning | `HVCG-PRICE-2026-07-15-v1` markdown + payload field | Partial | BL-P1 | Price states + V2 proposed | PricingVersions list | High (legacy) | Owner + Revenue |
| Legacy price protection | BL-ACCG-PRICE; Section A register | Strong policy | Keep | Client migration UI | — | High if ignored | Owner |
| CRM / Opportunities | SP lists + Opportunity CRM module | Strong | Lists/flows | Commercial class + Offer lookup | — | Low | CRM |
| Revenue OS | Sprints 1–4 COMPLETE Dev/Staging | Strong | EVA/conversion | Offer/pricing/proposal types | — | Medium merge | Revenue |
| Capital | CapitalOpportunities/Sources/Lenders + Elite `/capital` | Partial | Lists | Capital Case model + readiness engine | Scoring store | Medium | Capital |
| CFO / Finance | Finance Ops / FI packages; Elite FI pending labels | Partial | Packages | Fractional CFO layer | — | Medium | Finance |
| Banking / Plaid | In Absolute GO lineage (Sandbox secrets historically gated) | Partial | API | — | — | Secrets | Owner |
| QuickBooks | Tip `c892215` unmerged historically | Partial | Tip | Merge gated | — | Medium | Accounting |
| Procurement | Missing | Gap | — | — | Contractor + Proc Opp | Medium | New |
| Risk / Claims | `HVCG_Risks` = ops risk | Gap for claims | Approvals | — | RiskMatters | High sensitivity | New |
| Growth OS | Ops Hub + SOPs + Tasks | Partial | Ops Hub | 90-day / KPI model | — | Dup risk | Ops |
| AI agents | AI lists + governance SPA | Partial | Registry | 18 agent configs | — | Autonomy | AI Gov |
| Second Brain | Knowledge platform + AI context lists | Partial | Knowledge | Permission-aware retrieval | — | Isolation | AI |
| Documents | Folder taxonomy 00–23 + DocumentRequests | Strong | SP | Map V2 categories | — | Legacy paths | Ops |
| Client Portal | Portal packages READY | Partial | Portal | Doc request UX | — | BL-C1 | Portal |
| Client 360 | Elite Live Client Detail (Prod Absolute GO) | Strong | Pages | Domain sections | — | Perms | Elite |
| Billing | Invoices / Collections lists | Partial | Lists | Revenue type dimensions | — | Mix proposed/$ | Finance |
| Referrals | ReferralPartners + Referrals lists | Partial | Lists | Payout on collected + approvals | — | Pay accuracy | Revenue |
| Executive reporting | Elite Analytics / ECC packages | Partial | Elite | Sourced metrics | — | Mock data | Exec |
| Microsoft 365 | Entra/Graph/SP/PA/Dataverse | Strong | Adapters | Hub endpoints | — | Over-coupling | Azure |

---

## 2. Duplication audit (avoid)

| Temptation | Existing home | Consolidation rule |
|------------|---------------|-------------------|
| New CRM | Opportunity CRM + Elite Clients | Extend Opportunities/Clients |
| Second pricing table in React | PRICING_REGISTER + config/business | Single versioned config → adapters |
| New proposal engine | `HVCG_Proposals` + Revenue OS | Extend proposal types |
| Second AI registry | `HVCG_AIWorkers` / ToolRegistry / AI SPA | Configure agents on existing plane |
| New Finance dashboard SPA as product | Finance Ops / FI / Elite FI | Elite adapter; no competing shell |
| New Portal | Client Portal packages | Integrate |
| New Client 360 | Elite Live Client 360 | Extend sections |
| New document vault | Clients SP libraries | Extend metadata; copy-first |
| New workflow engine | Power Automate + Approvals | Extend flows |
| New executive shell | Elite Command Center | Extend nav/metrics |
| Next.js + Postgres greenfield | Atlas stack | **Reject as default** |

---

## 3. Decision conflict audit

| Existing rule | New V2 requirement | Recommended reconciliation | Approval required? |
|---------------|--------------------|----------------------------|--------------------|
| `BL-P1` rate card v1 locked | New V2 rate ranges | Keep v1 as `CURRENT_RATE_CARD` until owner activates `HVCG-PRICE-2026-08-11-v2` as PROPOSED→CURRENT | **Yes — Owner** |
| `BL-ACCG-PRICE` $4,539/mo | Recommended future $10k–$20k examples | Show Contracted vs Recommended Migration; never auto-apply | **Yes — per client** to reprice |
| Never change existing-client pricing | Client migration Reprice action | Action = queue only; requires agreement + owner | **Yes** |
| BL-C1 outbound Off | Document reminders / proposals | Draft + human approve only; keep Off | No change |
| Track 1 freeze | Schema / flow activation | No Prod CRM extras under this CR | Separate PROD gate |
| Absolute GO Production live | “Do not prepare Production” (Jul-19 NEXT_ACTIONS) | Protect live Prod; Development-only for V2 foundation | Owner for any Prod BA deploy |
| Written QA GO not issued | Continue Elite evolution | Keep QA evidence discipline; Absolute GO ≠ Written QA GO | QA process |
| SKU-FCFO/EXIT/ACQ/MODEL OWNER REVIEW | V2 Fractional CFO / Capital offers | Map into Offer catalog as Draft until priced/approved | Owner |
| Data Rooms off in V1 | Capital data rooms | Extend portal data-rooms package when gated | Owner |
| External AI contact locks | 18 agents | Agents draft only; approvals required | No change |
| BL-PUBLISH-1 public web gated | Public positioning | Architecture may describe offers; no public publish | Owner |

---

## 4. Target Atlas architecture

### UI

Atlas Elite OS remains the unified shell. Approximate IA (adapt, do not bulldoze):

- **COMMAND** — Executive Home  
- **RELATIONSHIPS** — Clients, Contacts, Referral Partners  
- **REVENUE** — Opportunities, Offers, Proposals, Engagements, Billing  
- **CAPITAL** — Capital Cases, Lenders, Data Rooms  
- **ADVISORY** — Strategic Finance, Procurement, Risk & Claims, Growth OS  
- **OPERATIONS** — Tasks, Documents, Workflows, Client Success  
- **INTELLIGENCE** — AI Agents, Second Brain, Approvals, Reports  
- **ADMINISTRATION** — Users, Roles, Service Catalog, Pricing, Integrations, Audit, Settings  

### Data

SharePoint lists as primary operational store; Dataverse solution packaging as today; Integration Hub for Elite APIs. New catalog entities are additive.

### Integrations

Reuse Graph / SharePoint / Power Automate / Entra / QBO tip / Plaid tip. Business logic in services/adapters, not UI.

### AI

One governance plane. Agent configs + prompt versions + approval queues.

### Security

Entra auth, server-side authorization, client isolation, restricted Owner Support, audit logs. External-contact Off.

---

## 5. Data model plan (foundation)

| Object | Existing | Extension | New fields / tables | Relationships | Permissions | Migration | Hub |
|--------|----------|-----------|---------------------|---------------|-------------|-----------|-----|
| ServiceLine | None | — | `HVCG_ServiceLines` + `config/business/service-lines.json` | Offers N:1 | Staff read; Admin write | Seed from config | GET catalog |
| Offer | Free-text ServicePackage | Map SKUs | `HVCG_Offers` + offer-catalog.json | ServiceLine, PricingVersion | Staff read; Admin write | Seed 13 offers | GET offers |
| PricingVersion | PRICING_REGISTER v1 | Version entity | `HVCG_PricingVersions` + rate-card JSON | Offers fee bands | Admin; engines read active | v1 locked + v2 proposed | GET active card |
| PriceState on Engagement/Client | PricingSummary text | Explicit states | Fields or child PricingLedger (later) | Client, Engagement | Finance + Owner | Preserve contracted | — |
| OpportunityClass | Opportunity stages | Choice | `CommercialClass` | Offer lookup | Revenue | Backfill UNKNOWN | — |
| ClientMigration | Docs only | Operationalize | `HVCG_ClientMigrations` + seed JSON | Client | Owner / CS | Seed named roster | — |
| CapitalCase | CapitalOpportunities | Normalize | Readiness score fields (later track) | Opp, Client, Lender | Capital | — | Later |
| Procurement | Missing | — | Lists in Track BA-E | Client | Advisory | — | Later |
| RiskMatter | Not claims | — | Lists in Track BA-E | Client | Elevated | — | Later |

---

## 6. UI plan

| Area | Existing route / component | Proposed | Reuse | New |
|------|----------------------------|----------|-------|-----|
| Offers admin | None in Elite | `/admin/service-catalog` | AppShell | Catalog pages |
| Pricing admin | None | `/admin/pricing` | AppShell | Version viewer (read-only for non-admin) |
| Opportunity | Revenue / Opportunity detail (pipeline product) | Class + Offer pickers | Detail page | Classification control |
| Client 360 | LiveClientDetailPage | Sections for Migration / Offers / Capital / Risk | Page shell | Section panels |
| Capital | `/capital` | Case + readiness | CapitalPage | Readiness panel (later) |
| Referrals | Contextual | Partners + deals | Lists | Pages (later) |
| Navigation | AppShell groups | Align to IA above | Nav config | Items |

**No new competing shell.**

---

## 7. Sprint plan

| Sprint | Track | Deliverables | Production? |
|--------|-------|--------------|-------------|
| **S1** | BA-A Foundation | CR, BA doc, config SoR, Dev schemas, migration seeds, legacy-lock tests, Atlas SoR refresh | No |
| **S2** | BA-A/B | Opportunity CommercialClass + Offer lookup wiring (Dev); proposal type stubs | No |
| **S3** | BA-B | Pricing recommendation service (reads versioned card); proposal section templates | No |
| **S4** | BA-B/G | Client Migration UI (internal); Client 360 Revenue/Migration sections | No |
| **S5** | BA-C | Capital Case readiness engine v1 + disclaimer | No |
| **S6** | BA-D | Fractional CFO metrics contracts on Finance surfaces (provenance labels) | No |
| **S7** | BA-E | Procurement + Risk Matters schemas + Elite routes | No |
| **S8** | BA-F | 18 agent registry configs + approval matrix extensions | No |
| **S9** | BA-G | Document taxonomy mapping + Doc Request status model alignment | No |
| **S10** | BA-H | Executive metrics with sourced dollars | No |
| **Later** | Release | Owner-gated merge to Elite release line + optional Prod | Owner only |

---

## 8. Initial migration seed posture

| Client | Atlas evidence | Seed posture |
|--------|----------------|--------------|
| ACCG | Locked $4,539/mo | Contracted confirmed (owner lock); Recommended = REQUIRES VERIFICATION / not applied |
| Prodigy Games | Partial $7,500/mo CFO | PRESERVE; verify live |
| That’s Kava | Packet $1,000/mo bookkeeping path | REQUIRES VERIFICATION |
| Christie’s Place | Invoice-extracted ~$4,750 | PRESERVE; verify |
| Lien Partners | Partial $4,562/mo sprint | REQUIRES VERIFICATION |
| Final Installment | Not in Jul-15 register extract | UNKNOWN |
| Nabro Holdings | Not in Jul-15 register extract | UNKNOWN |
| Jay’s Landscaping | Not in Jul-15 register extract | UNKNOWN |
| Randy / Generational | Not in Jul-15 register extract | UNKNOWN |

Do not invent revenue.
