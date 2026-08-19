# PROPOSAL_TEMPLATE

**As of:** 2026-07-15 18:45 PT  
**Priority:** #8 — Automated Proposal Generation  
**Status:** SPEC + TEMPLATE — build artifact; no auto-send, no Prod  
**Rate card:** `PRICING_REGISTER.md` Section B · `HVCG-PRICE-2026-07-15-v1` (**BL-P1 CLOSED**)  
**Engine contract:** `funnel/PRICING_ENGINE_SPEC.md`

---

## Applicability

| Client class | Proposal generator |
|--------------|-------------------|
| `HVCG_PROSPECT` | **Allowed** — estimated pricing from rate card |
| `HVCG_NEW_CLIENT` | **Allowed** — owner-approved final price |
| `HVS_LEGACY_CLIENT` | **BLOCK** — preserve Section A; no HVCG rate card |
| `HVS_TRANSITIONING_CLIENT` | **BLOCK** until owner re-contract |
| `FORMER_CLIENT` | **BLOCK** |

---

## Automation output contract

Align with pricing engine JSON:

```json
{
  "proposal_id": "{UUID}",
  "opportunity_id": "{HVCG_Opportunities.Id}",
  "client_class": "HVCG_PROSPECT",
  "generated_at": "{ISO8601}",
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "owner_approval_required": true,
  "legacy_guard": "PASS",
  "sku_primary": "SKU-CAP-CORE",
  "sku_addons": ["SKU-SUCCESS-DEBT"],
  "proposed_price": {
    "setup_usd": 5000,
    "monthly_usd": 3500,
    "success_debt_pct": 1.5,
    "success_equity_pct": null,
    "hourly_overflow": "SKU-HR-SENIOR"
  },
  "price_status": "DRAFT_ESTIMATE",
  "disclaimers_version": "v1"
}
```

**Hard rule:** `owner_approval_required: true` on every generated proposal until owner sets `price_status: APPROVED` on `HVCG_Proposals` / Opportunity.

---

## Document outline (generated sections)

### 1. Cover

| Element | Source |
|---------|--------|
| Prospect legal name | Lead / Opportunity / EVA Q0.1 |
| HVCG entity | High Value Capital Group LLC |
| Date | Generation timestamp |
| Prepared for | Primary contact Q0.6 |
| Proposal ref | `{ClientCode or LeadId}-PROP-{seq}` |
| Status badge | **DRAFT — SUBJECT TO OWNER APPROVAL** |

### 2. Executive summary

- Restate capital / advisory objective (from EVA §12, discovery notes).  
- Recommended service path (non-binding; from EVA band + engine rules).  
- One-paragraph scope summary — no guaranteed outcomes.

### 3. Recommended package (SKU-driven)

Select **one primary** from rate card:

| SKU ID | Package | Setup | Monthly | When to recommend |
|--------|---------|-------|---------|-------------------|
| SKU-CAP-CORE | Capital Advisory — Core | **$5,000** | **$3,500/mo** | Single initiative; simpler profile |
| SKU-CAP-GROWTH | Capital Advisory — Growth | **$10,000** | **$7,500/mo** | Multi-initiative; ~$3–10M complexity |
| SKU-CAP-ENT | Capital Advisory — Enterprise | **from $20,000** | **from $12,500/mo** | Complex / enterprise; custom may exceed |

**Add-ons (as applicable):**

| SKU ID | Terms |
|--------|-------|
| SKU-SUCCESS-DEBT | **1.5%** of closed debt financing (success fee) |
| SKU-SUCCESS-EQUITY | **3%** of closed equity financing (success fee) |
| SKU-HR-ASSOC | **$250/hr** — overflow / discrete tasks |
| SKU-HR-SENIOR | **$350/hr** |
| SKU-HR-PRINCIPAL | **$500/hr** |

Enterprise “from” amounts may be exceeded — label **custom** and force owner approval.

### 4. Scope of work (template bullets)

Customize per SKU; keep non-guarantee language.

**SKU-CAP-CORE — illustrative scope**

- Capital readiness assessment and gap analysis  
- Lender / investor package preparation (baseline)  
- Financial narrative and management reporting support  
- Monthly advisory cadence (defined in SOW)  
- Success fee mechanics if capital close contemplated

**SKU-CAP-GROWTH / ENT — expand**

- Multi-tranche capital strategy  
- Deeper model / diligence support  
- Stakeholder coordination  
- Custom deliverable schedule (owner-defined)

### 5. Investment summary table

| Line item | Amount (USD) | Notes |
|-----------|--------------|-------|
| Setup fee | `{from SKU}` | Due per agreement |
| Monthly retainer | `{from SKU}` | Billed monthly |
| Success fee — debt | 1.5% of closed amount | If applicable |
| Success fee — equity | 3% of closed amount | If applicable |
| Hourly overflow | Per SKU-HR-* | Pre-approved only |
| **Total Year-1 estimate** | `{calc}` | **Estimate only** |

Display **“Final engagement price requires owner approval”** adjacent to totals.

### 6. Timeline & assumptions

- Engagement start window (from EVA Q17.7 / discovery).  
- Client document dependencies (from EVA ops readiness).  
- Assumption: client information verified before binding SOW.

### 7. Terms & next steps

1. Owner reviews and approves pricing.  
2. Client signs HVCG MSA + SOW.  
3. Setup fee invoiced per agreement.  
4. Onboarding triggered on Opportunity **Won** (see `onboarding/AUTOMATED_ONBOARDING_SPEC.md`).  
5. No work begins without executed agreement.

### 8. Disclaimers (required — full block)

> This proposal is **preliminary** and **non-binding** until accepted via a signed High Value Capital Group LLC agreement. HVCG does **not** guarantee any valuation range, financing approval, funding amount or timing, lender/investor outcome, tax result, legal result, or business performance. Fees shown are based on **self-reported** and internally reviewed information and may change after verification; you will be notified before material adjustments where practicable. Success fees apply only as defined in the executed agreement. Past client results (if any) are not indicative of future results. Providing inaccurate or incomplete information may result in revised recommendations and pricing.

---

## Owner approval workflow

| Step | Actor | CRM action |
|------|-------|------------|
| 1 | System | Generate draft → `HVCG_Proposals` linked to Opportunity |
| 2 | Sales / Ops | Review scope + SKU fit |
| 3 | **Owner (Manny)** | Approve or edit price → set `price_status: APPROVED` |
| 4 | Ops | Export PDF / Docx for client — **no auto-email** without BL-C1 |
| 5 | Client | Sign → Opportunity → **Won** |

---

## Legacy guard (generator pre-flight)

```
IF classification IN (HVS_LEGACY_CLIENT, HVS_TRANSITIONING_CLIENT, FORMER_CLIENT):
  STOP — legacy_guard = BLOCK
  MESSAGE: Use PRICING_REGISTER Section A; manual renewal only
```

---

## Build notes

- Wire to `HVCG_OpportunityWonCloseout` only after Won — not at proposal stage.  
- Store `rate_card_version` on every proposal row.  
- No payment processor connect.  
- No client email from generator until BL-C1.

**Related:** `sales/PIPELINE_STAGES.md` · `funnel/PRICING_ENGINE_SPEC.md` · `SALES_PIPELINE_STATUS.md`
