# PRICING_ENGINE_SPEC

**As of:** 2026-07-15 18:25 PT  
**Owner track:** Finance + Funnel  
**Scope:** **New HVCG clients only**  
**Status:** SPEC READY — rates loaded from canonical `PRICING_REGISTER.md` v1 (**BL-P1 CLOSED**)  
**Rule:** Engine may show estimates; **final engagement price requires owner approval**

## Purpose

Propose package + price/range for `HVCG_PROSPECT` / `HVCG_NEW_CLIENT`. Legacy HVS pricing frozen.

## Forbidden

1. Apply Section B rates to Legacy / Transitioning without owner re-contract  
2. Change existing-client prices without owner  
3. Connect payment processors / auto-charge  
4. Guarantee financing, valuation, or ROI  

## Canonical rate card (v1)

| sku_id | Offer | Setup | Monthly / rate |
|--------|-------|-------|----------------|
| SKU-FRA | Funding Readiness Assessment | FREE | — |
| SKU-EVA-FREE | Enterprise Value Assessment (lead) | FREE | — |
| SKU-CAP-CORE | Capital Advisory — Core | $5,000 | $3,500/mo |
| SKU-CAP-GROWTH | Capital Advisory — Growth | $10,000 | $7,500/mo |
| SKU-CAP-ENT | Capital Advisory — Enterprise | from $20,000 | from $12,500/mo |
| SKU-SUCCESS-DEBT | Debt success fee | — | 1.5% |
| SKU-SUCCESS-EQUITY | Equity success fee | — | 3% |
| SKU-HR-ASSOC | Associate hourly | — | $250/hr |
| SKU-HR-SENIOR | Senior hourly | — | $350/hr |
| SKU-HR-PRINCIPAL | Principal hourly | — | $500/hr |

`rate_card_version`: `HVCG-PRICE-2026-07-15-v1`

## Output contract

```json
{
  "client_class": "HVCG_PROSPECT",
  "sku_recommendations": [{"sku_id": "SKU-CAP-CORE", "role": "primary"}],
  "proposed_price": {"setup": 5000, "monthly": 3500},
  "price_range": {"min": null, "target": null, "max": null},
  "currency": "USD",
  "billing": "hybrid",
  "confidence": 0.7,
  "subject_to_verification": true,
  "owner_approval_required": true,
  "legacy_guard": "PASS|BLOCK",
  "notices": ["Final engagement price requires owner approval"],
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "disclaimers_version": "v1"
}
```

## Legacy guard (hard)

```
IF classification IN (HVS_LEGACY_CLIENT, HVS_TRANSITIONING_CLIENT, FORMER_CLIENT):
  legacy_guard = BLOCK
  STOP — use PRICING_REGISTER Section A
```

## Recommendation rules (v1)

| Condition | Primary SKU |
|-----------|-------------|
| Lead / incomplete data | SKU-FRA or SKU-EVA-FREE |
| Single initiative, simpler profile | SKU-CAP-CORE |
| Multi-initiative / $3–10M-class complexity | SKU-CAP-GROWTH |
| Complex / enterprise / custom | SKU-CAP-ENT (range; owner sets final) |
| Capital close debt | + SKU-SUCCESS-DEBT |
| Capital close equity | + SKU-SUCCESS-EQUITY |
| Overflow advisory hours | Hourly SKUs |

Enterprise “from” amounts may be exceeded for complexity — calculator labels **custom** and forces owner approval.

## Disclaimers (always)

No guarantee of valuation, financing, approval, funding, tax, legal, or performance. Estimates subject to verification of client information.
