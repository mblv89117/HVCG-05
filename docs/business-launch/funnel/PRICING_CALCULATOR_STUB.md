# PRICING_CALCULATOR_STUB

**As of:** 2026-07-15 18:30 PT  
**Status:** STUB — field→SKU mapping + **rate card wired** (BL-P1 closed)  
**Scope:** `HVCG_PROSPECT` / `HVCG_NEW_CLIENT` only  
**Canonical rates:** `../PRICING_REGISTER.md` Section B (`HVCG-PRICE-2026-07-15-v1`)  
**Money rule:** Emit register amounts as **estimates**; always set `owner_approval_required: true`. Never apply to Legacy HVS.  
**Related:** `PRICING_ENGINE_SPEC.md`, `ENTERPRISE_VALUE_ASSESSMENT_SPEC.md`

## Purpose

Map EVA assessment fields to **canonical SKUs**, weights, and register prices. Final engagement price always requires owner approval.

## Hard guards

```
IF classification IN (HVS_LEGACY_CLIENT, HVS_TRANSITIONING_CLIENT, FORMER_CLIENT, Legacy HVS):
  → legacy_guard = BLOCK
  → sku_recommendations = []
  → all money fields = null
  → notice: use PRICING_REGISTER Section A (PRESERVE)
  → STOP
```

No account connects. No auto-charge. No legacy reprice.

---

## Stub output (example — Core)

```json
{
  "calculator_version": "stub-v1.1",
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "rate_card_wired": true,
  "client_class": "HVCG_PROSPECT",
  "legacy_guard": "PASS",
  "sku_recommendations": [{"sku_id": "SKU-CAP-CORE", "role": "primary"}],
  "proposed_price": {"setup": 5000, "monthly": 3500},
  "price_range": { "min": 3500, "target": 3500, "max": 7500 },
  "per_sku": {
    "SKU-CAP-CORE": {"setup": 5000, "monthly": 3500},
    "SKU-SUCCESS-DEBT": {"percent": 1.5},
    "SKU-SUCCESS-EQUITY": {"percent": 3.0}
  },
  "currency": "USD",
  "confidence": 0.7,
  "subject_to_verification": true,
  "owner_approval_required": true,
  "notices": [
    "Estimate from canonical rate card — final engagement price requires owner approval",
    "Estimates subject to verification; not a financing offer"
  ],
  "disclaimers_version": "v1"
}
```

`per_sku` shape when wired later (values still owner-approved from register):

```json
"SKU-CAP-CORE": {
  "role": "primary",
  "billing": "hybrid",
  "setup": null,
  "monthly": null,
  "min": null,
  "target": null,
  "max": null,
  "unit": "USD",
  "weight_inputs": ["composite_score", "capital_need_clarity_score", "revenue_score"]
}
```

---

## Canonical SKU catalog (reference — amounts not emitted by stub)

| SKU ID | Offer | Register setup | Register monthly / rate |
|--------|-------|----------------|-------------------------|
| SKU-FRA | Funding Readiness Assessment | FREE | — |
| SKU-CAP-CORE | Capital Advisory — Core | $5,000 | $3,500/mo |
| SKU-CAP-GROWTH | Capital Advisory — Growth | $10,000 | $7,500/mo |
| SKU-CAP-ENT | Capital Advisory — Enterprise | Starting $20,000 | Starting $12,500/mo |
| SKU-SUCCESS-DEBT | Debt success fee | — | 1.5% |
| SKU-SUCCESS-EQUITY | Equity success fee | — | 3% |
| SKU-HR-ASSOC | Associate hourly | — | $250/hr |
| SKU-HR-SENIOR | Senior hourly | — | $350/hr |
| SKU-HR-PRINCIPAL | Principal hourly | — | $500/hr |

Rate card is wired (`rate_card_wired: true`). Emit register amounts as estimates; always set `owner_approval_required: true`.

---

## Field → SKU mapping (weights)

Weights = relative influence on package choice (0 = unused, 1 = primary). **Not dollars.**

| Assessment field / score | Source | SKU-FRA | SKU-CAP-CORE | SKU-CAP-GROWTH | SKU-CAP-ENT | SKU-SUCCESS-DEBT | SKU-SUCCESS-EQUITY | SKU-HR-* |
|--------------------------|--------|:-------:|:------------:|:--------------:|:-----------:|:----------------:|:------------------:|:--------:|
| `classification` | Q0.8 | gate | gate | gate | gate | gate | gate | gate |
| `completeness_ratio` | derived | 1.0 | 0.2 | 0.2 | 0.2 | 0 | 0 | 0.1 |
| `composite_score` / `band` | EVA | 0.3 | 0.6 | 0.7 | 0.9 | 0.3 | 0.3 | 0.4 |
| `confidence_index` | EVA | 0.4 | 0.6 | 0.6 | 0.7 | 0.7 | 0.7 | 0.5 |
| `maturity_score` | §1 | 0.3 | 0.4 | 0.5 | 0.6 | 0.2 | 0.2 | 0.3 |
| `revenue_score` / Q2.1 band | §2 | 0.2 | 0.5 | 0.7 | 0.9 | 0.4 | 0.4 | 0.5 |
| `profitability_score` | §3 | 0.2 | 0.4 | 0.5 | 0.6 | 0.3 | 0.3 | 0.4 |
| `cash_score` | §4 | 0.3 | 0.5 | 0.5 | 0.5 | 0.3 | 0.2 | 0.4 |
| `debt_score` / Q5.* | §5 | 0.5 | 0.6 | 0.6 | 0.5 | **0.9** | 0.2 | 0.3 |
| `assets_score` / `collateral_score` | §6/13 | 0.4 | 0.5 | 0.5 | 0.5 | 0.6 | 0.3 | 0.2 |
| `ownership_score` | §7 | 0.2 | 0.3 | 0.3 | 0.4 | 0.2 | 0.4 | 0.2 |
| `industry_score` / regulated | §8 | 0.3 | 0.4 | 0.5 | 0.6 | 0.4 | 0.4 | 0.5 |
| `growth_score` | §9 | 0.3 | 0.5 | 0.7 | 0.8 | 0.4 | 0.5 | 0.3 |
| `operating_risk_score` | §10 | 0.4 | 0.5 | 0.5 | 0.6 | 0.3 | 0.3 | 0.4 |
| `reporting_score` | §11 | 0.5 | 0.5 | 0.5 | 0.6 | 0.3 | 0.3 | **0.8** |
| `capital_need_clarity_score` | §12 | 0.6 | **0.9** | **0.9** | **0.9** | 0.6 | 0.6 | 0.2 |
| Q12.1 capital amount band | §12 | 0.4 | 0.5 | 0.7 | **1.0** | **1.0** | **1.0** | 0.2 |
| Q12.3 preferred instrument | §12 | 0.3 | 0.5 | 0.5 | 0.5 | 0.8 (debt) | 0.8 (equity) | 0.1 |
| Q12.4 timeline urgency | §12 | 0.4 | 0.4 | 0.4 | 0.4 | 0.3 | 0.3 | 0.5 |
| `management_score` | §14 | 0.3 | 0.5 | 0.5 | 0.6 | 0.3 | 0.3 | 0.5 |
| `concentration_score` | §15 | 0.3 | 0.4 | 0.4 | 0.5 | 0.2 | 0.2 | 0.3 |
| `exit_score` | §16 | 0.2 | 0.3 | 0.4 | 0.5 | 0.2 | 0.5 | 0.3 |
| `ops_readiness_score` | §17 | 0.5 | 0.5 | 0.5 | 0.5 | 0.3 | 0.3 | 0.4 |
| `entity_count` | analyst | 0.2 | 0.3 | 0.4 | 0.6 | 0.2 | 0.2 | 0.5 |
| `flags[]` (MCA, litigation, tax) | EVA | 0.5 | 0.5 | 0.5 | 0.6 | 0.4 | 0.4 | 0.6 |

---

## Recommendation rules (stub — no $)

| Condition | Recommend (role) | Money |
|-----------|------------------|-------|
| Free / lead assessment complete | `SKU-FRA` primary | null (register: FREE when wired) |
| Band C–B, clear capital need, mid complexity | `SKU-CAP-CORE` primary | null |
| Band B–A, stronger growth/revenue | `SKU-CAP-GROWTH` primary | null |
| Band A, high capital band / multi-entity / regulated | `SKU-CAP-ENT` primary | null |
| Debt instrument preferred + capital path | `SKU-SUCCESS-DEBT` addon | null |
| Equity / hybrid raise | `SKU-SUCCESS-EQUITY` addon | null |
| `reporting_score` ≤2 or books remediation | `SKU-HR-*` addon (tier by complexity) | null |
| Legacy class | **none** — BLOCK | null |

Tier selection heuristic (no $): prefer CORE → GROWTH → ENT as `max(revenue_score, capital_band_index, composite_score/20)` rises; ENT if regulated or `entity_count` ≥ 3.

---

## Complexity multiplier (placeholder — not applied to money in stub)

```
complexity = clamp(
  1.0
  + 0.05 * (5 - reporting_score)
  + 0.04 * (entity_count - 1)
  + 0.08 * regulated_flag
  + 0.05 * capital_band_index
  + 0.03 * urgency_index,
  0.85, 1.35
)
```

Public stub: `complexity_multiplier: null`. Internal debug may compute but must not fill money fields.

---

## Money fields checklist (stub)

| Field | Stub value |
|-------|------------|
| `proposed_price` | `null` |
| `price_range.*` | `null` |
| `per_sku[*].setup` / `.monthly` / `.min` / `.target` / `.max` | `null` |
| Success fee percent | `null` |
| Display `$` / `%` in calculator UI | Allowed as estimates when wired; label “subject to owner approval” |

When wiring: read only from `PRICING_REGISTER` Section B; still require owner approval for final engagement price.

---

## Notices

1. **Subject to verification** — always.  
2. **Inaccurate inputs** — recalc SKUs only; money stays null in stub.  
3. **No guarantees** — valuation / financing / approval / funding / tax / legal / performance.  
4. **Legacy** — ACCG and other HVS clients: Section A PRESERVE only.

## Related

- Rates SoR: `../PRICING_REGISTER.md`  
- Engine narrative: `PRICING_ENGINE_SPEC.md`  
- ACCG preservation: register §A.2
