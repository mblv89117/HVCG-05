# PROPOSAL_GENERATOR

**As of:** 2026-07-15 19:00 PT  
**Owner:** Sales Ops (HVCG COO track)  
**ROI:** Shorten sales cycle · eliminate manual proposal assembly  
**Status:** OPERATIONAL SPEC — draft generation only; **no auto-send**  
**Rate card:** `../PRICING_REGISTER.md` Section B · `HVCG-PRICE-2026-07-15-v1`  
**Template contract:** `PROPOSAL_TEMPLATE.md` · **Samples:** `samples/`

---

## Purpose

Transform qualified opportunity inputs (EVA band + SKU selection) into a **complete draft proposal** with all sections pre-filled from Section B rates. Every output is a **DRAFT** pending owner approval — never client-facing until `price_status: APPROVED`.

**Forbidden:** Auto-email · payment connect · Prod CRM writes · applying Section B to legacy clients.

---

## Required inputs

| Field | Source | Required |
|-------|--------|----------|
| `opportunity_id` | `HVCG_Opportunities.Id` | Y |
| `client_class` | Lead / Opportunity classification | Y |
| `prospect_legal_name` | EVA Q0.1 / Opportunity | Y |
| `primary_contact` | EVA Q0.6 | Y |
| `eva_band` | EVA composite (`A`–`F`) | Y |
| `eva_composite_score` | EVA output | Soft |
| `capital_objective` | EVA §12 (Q12.1–Q12.4) | Y |
| `sku_primary` | Sales recommendation or engine | Y |
| `sku_addons` | Engine / discovery notes | N |
| `classification` | Q0.8 | Y (gate) |
| `legacy_roster_match` | `LEGACY_HVS_CLIENT_REGISTER` name check | Y (gate) |
| `discovery_call_date` | `HVCG_DiscoveryCalls` | Soft |
| `engagement_start_window` | EVA Q17.7 / discovery | Soft |

### Input JSON (generator call)

```json
{
  "opportunity_id": "{UUID}",
  "client_class": "HVCG_PROSPECT",
  "prospect_legal_name": "Example Holdings LLC",
  "primary_contact": "Jordan Example",
  "eva_band": "B",
  "eva_composite_score": 72,
  "capital_objective": "Debt refinancing and working-capital line; 6–9 month timeline",
  "sku_primary": "SKU-CAP-CORE",
  "sku_addons": ["SKU-SUCCESS-DEBT"],
  "classification": "HVCG_PROSPECT",
  "legacy_roster_match": false
}
```

---

## Pre-flight: legacy guard (hard BLOCK)

Run **before** any section fill or rate lookup.

```
IF classification IN (HVS_LEGACY_CLIENT, HVS_TRANSITIONING_CLIENT, FORMER_CLIENT):
  STOP — legacy_guard = BLOCK

IF prospect_legal_name MATCHES LEGACY_HVS_CLIENT_REGISTER (fuzzy legal-name):
  STOP — legacy_guard = BLOCK

IF client_class NOT IN (HVCG_PROSPECT, HVCG_NEW_CLIENT):
  STOP — legacy_guard = BLOCK
```

| Result | Action |
|--------|--------|
| `legacy_guard: PASS` | Continue to SKU + section fill |
| `legacy_guard: BLOCK` | **No proposal.** Route to `PRICING_REGISTER` Section A · manual renewal only. Message: *"Legacy HVS — preserve contracted pricing; Section B not applicable."* |

---

## EVA band → SKU recommendation matrix

Use when `sku_primary` is not pre-set on the Opportunity. Sales may override with documented reason.

| EVA band | Score | Default primary SKU | Rationale |
|----------|-------|---------------------|-----------|
| A | 80–100 | `SKU-CAP-ENT` | High readiness; enterprise / multi-entity / regulated complexity |
| A–B | 65–79 (upper) | `SKU-CAP-GROWTH` | Strong growth profile; multi-initiative capital path |
| B–C | 50–79 (mid) | `SKU-CAP-CORE` | Single initiative; standard advisory path |
| C | 50–64 | `SKU-CAP-CORE` or `SKU-FRA` | Conditional — strengthen reporting first if flags present |
| D–F | &lt;50 | **No proposal** | Nurture / FRA only unless owner override |

### Add-on rules (from EVA §12 + discovery)

| Condition | Add SKU |
|-----------|---------|
| Debt instrument preferred (Q12.3) | `SKU-SUCCESS-DEBT` (1.5%) |
| Equity / hybrid raise | `SKU-SUCCESS-EQUITY` (3%) |
| Reporting score ≤2 or books remediation | `SKU-HR-SENIOR` or `SKU-HR-PRINCIPAL` (overflow) |
| Discrete task overflow | `SKU-HR-ASSOC` / `SKU-HR-SENIOR` / `SKU-HR-PRINCIPAL` |

---

## Section B rate lookup

Read **only** from `PRICING_REGISTER.md` Section B. Never invent amounts.

| SKU ID | Package | Setup (USD) | Monthly (USD) | Other |
|--------|---------|-------------|---------------|-------|
| SKU-FRA | Funding Readiness Assessment | FREE | — | Lead only |
| SKU-CAP-CORE | Capital Advisory — Core | **$5,000** | **$3,500** | |
| SKU-CAP-GROWTH | Capital Advisory — Growth | **$10,000** | **$7,500** | |
| SKU-CAP-ENT | Capital Advisory — Enterprise | **from $20,000** | **from $12,500** | Custom may exceed |
| SKU-SUCCESS-DEBT | Debt success fee | — | — | **1.5%** of closed debt |
| SKU-SUCCESS-EQUITY | Equity success fee | — | — | **3%** of closed equity |
| SKU-HR-ASSOC | Associate hourly | — | — | **$250/hr** |
| SKU-HR-SENIOR | Senior hourly | — | — | **$350/hr** |
| SKU-HR-PRINCIPAL | Principal hourly | — | — | **$500/hr** |

Enterprise “from” amounts: label line items **custom — owner sets final** and keep `owner_approval_required: true`.

---

## Section fill map (inputs → output document)

| # | Section | Fill logic |
|---|---------|------------|
| 1 | **Cover** | `prospect_legal_name`, `primary_contact`, generation date, ref `{LeadId}-PROP-{seq}`, badge **DRAFT — SUBJECT TO OWNER APPROVAL** |
| 2 | **Executive summary** | Restate `capital_objective`; cite `eva_band` + non-binding service path; one-paragraph scope — no guaranteed outcomes |
| 3 | **Recommended package** | `sku_primary` name + Setup/Monthly from Section B; list `sku_addons` with terms |
| 4 | **Scope of work** | SKU-specific bullet template (see `PROPOSAL_TEMPLATE.md` §4); expand for GROWTH/ENT |
| 5 | **Investment summary** | Table: setup, monthly, success fees, hourly overflow; **Year-1 estimate** = setup + (monthly × 12); footnote *Final engagement price requires owner approval* |
| 6 | **Timeline & assumptions** | `engagement_start_window`; EVA ops-readiness doc gaps; assumption: verified info before binding SOW |
| 7 | **Terms & next steps** | Owner review → MSA/SOW → setup invoice → Won triggers onboarding |
| 8 | **Disclaimers** | Full block from `PROPOSAL_TEMPLATE.md` §8 — verbatim |

### Year-1 estimate (illustrative)

| Primary SKU | Setup | Monthly | Year-1 estimate (no success fee) |
|-------------|-------|---------|----------------------------------|
| SKU-CAP-CORE | $5,000 | $3,500 | **$47,000** |
| SKU-CAP-GROWTH | $10,000 | $7,500 | **$100,000** |
| SKU-CAP-ENT (floor) | $20,000 | $12,500 | **$170,000** |

Success fees and hourly overflow are **not** included in Year-1 estimate unless owner approves.

---

## Output contract (every generation)

```json
{
  "proposal_id": "{UUID}",
  "opportunity_id": "{UUID}",
  "client_class": "HVCG_PROSPECT",
  "generated_at": "{ISO8601}",
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "owner_approval_required": true,
  "legacy_guard": "PASS",
  "eva_band": "B",
  "sku_primary": "SKU-CAP-CORE",
  "sku_addons": ["SKU-SUCCESS-DEBT"],
  "proposed_price": {
    "setup_usd": 5000,
    "monthly_usd": 3500,
    "success_debt_pct": 1.5,
    "success_equity_pct": null,
    "hourly_overflow": null
  },
  "price_status": "DRAFT_ESTIMATE",
  "disclaimers_version": "v1",
  "artifact_path": "sales/samples/SAMPLE_PROPOSAL_CORE.md"
}
```

**Hard rule:** `owner_approval_required` is **always `true`** on every generated proposal. No exception until owner sets `price_status: APPROVED` on `HVCG_Proposals`.

---

## Operator workflow

| Step | Actor | Action |
|------|-------|--------|
| 1 | System / Sales Ops | Run pre-flight `legacy_guard` |
| 2 | System / Sales Ops | Resolve `sku_primary` (band matrix or Opportunity field) |
| 3 | Generator | Fill all 8 sections → markdown or PDF stub |
| 4 | System | Write `HVCG_Proposals` row · link Opportunity |
| 5 | Sales Ops | Review SKU fit + scope accuracy (~5 min) |
| 6 | **Owner (Manny)** | Approve or edit → `price_status: APPROVED` |
| 7 | Sales Ops | Export for client delivery — **manual only** (BL-C1 gate) |

**Not in scope:** Sending proposals · CRM Prod writes · payment processor.

---

## Sample outputs

| File | Prospect (fictional) | SKU | Setup / Monthly |
|------|---------------------|-----|-----------------|
| `samples/SAMPLE_PROPOSAL_CORE.md` | Example Holdings LLC | SKU-CAP-CORE | $5,000 / $3,500 |
| `samples/SAMPLE_PROPOSAL_GROWTH.md` | Meridian Peak Industries LLC | SKU-CAP-GROWTH | $10,000 / $7,500 |

Use samples as format reference only. **Never** use legacy roster legal names in drafts or samples.

---

## Related

`PROPOSAL_TEMPLATE.md` · `PIPELINE_STAGES.md` · `../PRICING_REGISTER.md` · `../funnel/PRICING_ENGINE_SPEC.md` · `../LEGACY_HVS_CLIENT_REGISTER.md` · `SALES_OPS_OUTCOME.md`
