# HVCG Business Architecture V2

| Field | Value |
|-------|--------|
| **Status** | Canonical (owner-directed) — integration via [CR-HVCG-BA-V2-001](../ChangeRequests/CR-HVCG-BA-V2-001.md) |
| **Version** | 2.0 |
| **Effective for selling** | **CURRENT for new HVCG clients** (`HVCG-PRICE-2026-08-11-v2` per ADR-BA-V2-002); does not change executed agreements |
| **As of** | 2026-08-11 |
| **Authority** | High Value Capital Group LLC · Project Atlas |
| **Config SoR** | `config/business/` |

---

## 1. Positioning

High Value Capital Group is a premium **capital, strategic finance, growth, risk-reduction, and AI operating partner** for founder-led companies.

HVCG is **not** modeled as a generic consulting company. The commercial system is organized around business outcomes:

- Access capital and become lender-ready
- Improve financial visibility
- Win larger contracts / become government-contract-ready
- Reduce liabilities; manage claims and recovery
- Improve operations and install accountability systems
- Automate workflows and build AI Second Brain systems
- Turn institutional knowledge into scalable processes

**Atlas remains the operating system.** This document defines the business architecture Atlas must operationalize.

---

## 2. Commercial classification rule

```
No custom consulting without a category.
No category without an offer.
No offer without a price.
No price without a signed scope.
```

Every opportunity classifies as:

| Class | Meaning |
|-------|---------|
| **STRUCTURED_OFFER** | Defined result, scope, deliverables, price |
| **RECURRING_RETAINER** | Ongoing leadership / finance / capital / operating / AI / executive support |
| **PREMIUM_SPECIAL_PROJECT** | Urgent, sensitive, complex, disputed, custom, or high-risk work |

---

## 3. Seven service lines

| Code | Name | Public | Notes |
|------|------|--------|-------|
| `SL-CAPITAL` | Capital Advisory & Lender Readiness | Yes | Capital Cases, readiness, lenders, data rooms |
| `SL-FCFO` | Fractional CFO & Strategic Finance | Yes | Finance Ops / FI / QBO / Plaid |
| `SL-PROCUREMENT` | Contract Procurement & Government Readiness | Yes | New domain |
| `SL-RISK` | Risk, Claims & Liability Reduction | Yes | Elevated access for sensitive matters |
| `SL-GROWTH` | Growth & Operating Systems | Yes | Ops Hub / Revenue OS cadence |
| `SL-AI` | Agentic AI & Second Brain Systems | Yes | Extends AI Governance |
| `SL-OWNER` | Executive Owner Support | **Restricted** | Need-to-know; not broadly public-facing |

---

## 4. Offer catalog (13)

Configuration SoR: `config/business/offer-catalog.json`

1. Capital Readiness Diagnostic  
2. Lender-Ready Capital Package  
3. Fractional CFO Operating Partner  
4. Contract Procurement Readiness Package  
5. Government Contractor Setup Package  
6. Risk Reduction & Liability Review  
7. Employer Tax / Unemployment Appeal Support  
8. Business Recovery & Claims Support  
9. Growth Operating System  
10. Executive Owner Support Program (**private**)  
11. AI Second Brain for Business Owners  
12. AI Operations Agent System  
13. Referral Partner Pipeline Engine  

Do **not** hard-code the catalog into presentation components.

---

## 5. Pricing architecture

### Fee types

1. Diagnostic Fee  
2. Setup / Implementation Fee  
3. Monthly Retainer  
4. Success Fee  
5. Premium Hourly  
6. Replenishing Retainer  
7. Referral Compensation  
8. Enterprise / Negotiated Pricing  
9. Pass-through Costs  
10. Optional Add-On  

### Price states (never conflate)

| State | Meaning |
|-------|---------|
| `CONTRACTED_CURRENT` | What the client is legally/operationally paying |
| `HISTORICAL` | What prior work was charged |
| `CURRENT_RATE_CARD` | What HVCG presently sells to **new** clients |
| `RECOMMENDED_FUTURE` | Migration recommendation (not contracted) |
| `PROPOSED` | Unsigned proposal amount |
| `APPROVED_FUTURE` | Owner-approved reprice not yet effective |
| `EFFECTIVE_NEW` | Price after executed agreement/change |

**Never** silently convert `RECOMMENDED_FUTURE` → `CONTRACTED_CURRENT`.

### Versioning

| Version ID | Status | Notes |
|------------|--------|-------|
| `HVCG-PRICE-2026-07-15-v1` | **HISTORICAL** (`BL-P1` preserved) | Prior new-client card; not deleted |
| `HVCG-PRICE-2026-08-11-v2` | **CURRENT_RATE_CARD** for new HVCG clients | Owner ADR-BA-V2-002 |

### Legacy protection

- Section A / `HVS_LEGACY_CLIENT` preserve contracted economics  
- `BL-ACCG-PRICE`: ACCG Access Plus **$4,539/mo** locked  
- Auto-apply of V2 ranges to legacy clients is **forbidden**

---

## 6. Client migration

Model: `config/business/client-migration-model.json`  
Operational list (Dev): `HVCG_ClientMigrations` (proposed)

Actions: Retain · Reprice · Upsell · Re-engage · Archive · Transition · Decline  

No automatic execution of repricing.

---

## 7. Revenue OS integration

Extend existing Revenue OS lifecycle:

Lead → Qualification → Diagnostic → Opportunity Classification → Service Line → Offer → Pricing Recommendation → Proposal → Approval → Signature → Engagement → Delivery → Invoice → Payment → Success Fee → Referral Payout → Renewal / Expansion → Client Migration

Do not rebuild functioning conversion logic.

### Proposal types

1. Structured Offer Proposal  
2. Monthly Retainer Proposal  
3. Premium Special Project  

AI may draft; human must approve; never send automatically.

---

## 8. Domain architecture (Atlas mapping)

| Domain | Atlas home | Rule |
|--------|------------|------|
| Capital | Capital lists + Elite `/capital` + templates | Extend Capital Case / readiness |
| Fractional CFO | Finance Ops / FI / QBO / Plaid | No new Finance SPA |
| Procurement | New lists + Elite Advisory nav | AI never auto-submits bids |
| Risk / Claims | New Risk Matters (not ops `HVCG_Risks`) | Elevated access |
| Growth OS | Operations Hub + Revenue OS | No duplicate Ops Hub |
| AI / Second Brain | AI Governance + Knowledge | One governance plane |
| Referrals | `HVCG_ReferralPartners` / `HVCG_Referrals` | Pay on collected revenue only |
| Documents | Existing SP + Document Requests | Copy-first legacy migration |
| Client 360 | Elite Live Client Detail | Extend sections; permission filter |
| Executive | Elite Command / Analytics | Sourced dollars only |

---

## 9. AI platform

Eighteen HVCG agents are **configurations** on the shared orchestration engine (see Impact Analysis). Risk levels: LOW / MEDIUM / HIGH. Absolute prohibitions on autonomous financing guarantees, legal/tax opinions, government submissions, pricing commitments, money movement, and unauthorized external contact remain **LOCKED**.

---

## 10. Compliance language (reusable)

**General:** High Value Capital Group provides advisory, documentation, preparation, coordination, and strategic support services. HVCG is not a law firm, CPA firm, insurance agency, mortgage broker, real estate brokerage, investment bank, securities broker-dealer, or licensed lender unless separately stated in writing.

**Financing:** Financing outcomes are determined by third-party lenders and capital providers. HVCG does not guarantee approval, terms, or funding.

**AI:** AI-generated information is provided for workflow and decision-support purposes. Authorized human review is required for legal, financial, tax, HR, insurance, lending, investor, government, contractual, or other consequential decisions.

Use contextually; do not spam irrelevant disclaimers.

---

## 11. Public vs restricted

| Surface | Policy |
|---------|--------|
| Service lines 1–6 | May appear in staff catalog / qualified marketing (subject to BL-PUBLISH-1 for public web) |
| Executive Owner Support | Restricted · need-to-know · separate SP locations where warranted · restricted AI processing |
| Legacy contracted pricing | Internal · never auto-publish as “current rate” for that client |

---

## 12. Atlas wins

Repository evidence overrides chat memory. Extend Atlas Elite OS. Prefer adapters over rewrites. Protect Production. Protect institutional knowledge. Document everything important.
