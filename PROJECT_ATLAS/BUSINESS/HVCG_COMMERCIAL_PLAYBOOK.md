# HVCG Commercial Playbook

**As of:** 2026-08-11  
**Authority:** CR-HVCG-BA-V2-001  
**Requirement:** HVCG-V2-TRN-001  
**Audience:** New employees, sales, AI agents (read-only guidance)

---

## What HVCG sells

HVCG is a premium **capital, strategic finance, risk-reduction, growth, and AI operating partner** for founder-led businesses — **not** generic consulting.

Canonical message:

> We help serious business owners access capital, clean up financial operations, win larger contracts, reduce liabilities, and build AI-powered operating systems.

Config SoR: `config/business/positioning.json`

---

## How to classify leads / opportunities

| Stage | Commercial rules |
|-------|------------------|
| Lead / Discovery | May remain unclassified |
| Qualified (Assessment+) | **CommercialClass required**: Structured Offer · Recurring Retainer · Premium Special Project |
| Proposal+ | Service Line + Offer + Pricing basis required |
| Won / Engagement | Approved scope + approved economics required |

Module: `config/business/commercial_rules.py`

---

## Which diagnostic to use

Prefer a **paid diagnostic front door**. Primary: Capital Readiness Diagnostic levels in `config/business/diagnostics.json`.  
Also domain diagnostics for CFO / Procurement / Risk / AI / Growth.

**Owner conflict:** BL-P1 SKU-FRA is FREE; V2 prefers paid diagnostics — do not activate paid-front-door as CURRENT without owner reconciliation.

---

## Which offer to recommend

Use the Offer Decision Engine / Offer Grid:

- `config/business/offer-decision-engine.json`
- `config/business/offer-grid.json`

**Stop quoting tasks.** Sell named offers (e.g., Lender-Ready Capital Package — not “loan help”).

---

## How to price

1. Read active selling card via `pricing_policy.active_selling_rate_card_id()` → currently **v1 (BL-P1)** unless owner activates V2.  
2. V2 ranges live in `pricing-rate-card-v2.json` as **PROPOSED**.  
3. Never apply rate cards to `HVS_LEGACY_CLIENT`.  
4. Never convert Recommended Future → Contracted Current without owner + agreement.

---

## What requires approval

- External client/lender/agency contact (BL-C1)
- Proposal send
- Lender submission / gov registration / bid submit
- Referral payouts
- Legacy reprice
- High-risk AI outputs
- Activating pricing V2 as CURRENT

---

## What cannot be promised

No guaranteed financing, contracts, recovery, legal/tax opinions, insurance coverage determinations, or AI autonomy over consequential actions.  
See `config/business/compliance-language.json` and agent absolute prohibitions.

---

## Proposals

Exactly three archetypes:

1. Structured Offer  
2. Monthly Retainer  
3. Premium Special Project  

Templates: `templates/proposals/`  
AI may draft; human approves; never auto-send.

---

## Out of scope

Structured: excluded services quoted separately / premium rate.  
Retainer: legal/tax/insurance/HR/lending/disputes/claims/executive concierge outside scope → special project / premium hourly / replenishing retainer.

---

## Migration

Use Client Migrations workflow. Actions: Retain / Reprice / Upsell / Re-engage / Archive / Transition / Decline.  
**Never auto-reprice.** ACCG $4,539/mo locked.

---

## What AI may / may not do

May: summaries, checklists, drafts, internal classification (permission-aware).  
May not: send externally, commit pricing, submit filings/bids, move money, guarantee outcomes.  
Agents: `config/business/hvcg-agents-v2.json`

---

## Services not to sell cheaply

See `config/business/do-not-sell-cheap.json` — bundle, premium project, refer out, or decline.

---

## Qualification checklist

Six questions in `config/business/qualification-checklist.json`.  
Weak answers → `DECLINE_OR_PREMIUM_PRICE_REVIEW` (human decision only).
