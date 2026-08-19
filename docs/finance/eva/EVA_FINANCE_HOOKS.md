# EVA_FINANCE_HOOKS

**Generated:** 2026-07-15 (Finance Operations worktree)  
**Mode:** READ_ONLY spec cross-link — no form wiring, no legacy reprice  
**Sources:** master-pm `funnel/ENTERPRISE_VALUE_ASSESSMENT_SPEC.md`, `funnel/EVA_INTAKE_TO_CRM_MAP.md`, `funnel/PRICING_CALCULATOR_STUB.md`, `funnel/PRICING_ENGINE_SPEC.md`, `PRICING_REGISTER.md`

---

## Purpose

Document how **Enterprise Value Assessment (EVA)** scores flow into **pricing SKU recommendations** for new HVCG prospects — and where finance must **BLOCK** legacy HVS clients.

```
EVA submit → section scores + composite + band
          → legacy_guard pre-check (Q0.8 / name match)
          → PRICING_CALCULATOR_STUB (field→SKU weights)
          → PRICING_ENGINE_SPEC (primary SKU + addons)
          → PRICING_REGISTER Section B (canonical $)
          → owner approval gate → Opportunity / proposal
```

---

## 1. Pre-flight: legacy guard (finance BLOCK)

| Input | Finance action |
|-------|----------------|
| Q0.8 confirms HVCG Prospect | Allow engine path (`legacy_guard: PASS`) |
| Name matches `LEGACY_HVS_CLIENT_REGISTER` | **STOP** — route to migration; no EVA-driven HVCG pricing |
| Classification = `HVS_LEGACY_CLIENT` / `HVS_TRANSITIONING_CLIENT` | **BLOCK** — Section A PRESERVE only |

**Seed clients in inventory (BLOCK):** ACCG Inc., Prodigy Games LLC, Christie's Place LLC.

---

## 2. EVA scores → CRM payload

On EVA submit, store structured summary (Lead `Notes` / `EvaPayload` JSON):

| EVA output | CRM / engine field | Finance use |
|------------|-------------------|-------------|
| `composite_score` (0–100) | `EvaCompositeScore` / blob | Package tier heuristic; lead scoring (+30 if present) |
| `band` (A–F) | `EvaBand` | Primary SKU selection (see §4) |
| `confidence_index` (0–1) | `EvaConfidenceIndex` | Weight multiplier; low trust (−20 lead score if &lt;0.4) |
| `section_scores.*` | `eva_summary.section_scores` | Per-SKU weight inputs |
| `flags[]` | blob | Risk addons; may force hourly / remediation SKUs |
| `recommended_sku_primary` | Opportunity `ServicePackage` | Engine output (owner-approved) |
| `rate_card_version` | blob | Must match `HVCG-PRICE-2026-07-15-v1` |

### Section scores mapped to pricing weights

From `PRICING_CALCULATOR_STUB.md` — weights are **relative influence**, not dollars:

| Score field | Primary SKU influence |
|-------------|----------------------|
| `composite_score` / `band` | CAP-CORE 0.6 · CAP-GROWTH 0.7 · CAP-ENT 0.9 |
| `revenue_score` | CAP-GROWTH 0.7 · CAP-ENT 0.9 |
| `capital_need_clarity_score` | CAP-CORE/GROWTH/ENT **0.9** |
| Q12.1 capital amount band | CAP-ENT **1.0** · SUCCESS fees **1.0** |
| Q12.3 preferred instrument | SUCCESS-DEBT 0.8 (debt) · SUCCESS-EQUITY 0.8 (equity) |
| `debt_score` | SUCCESS-DEBT **0.9** |
| `reporting_score` ≤2 | SKU-HR-* addon **0.8** (books remediation) |
| `completeness_ratio` | SKU-FRA 1.0 (lead / incomplete) |

---

## 3. Band → primary SKU rules

| Condition | Primary SKU | Register pricing (Section B) |
|-----------|-------------|------------------------------|
| Lead / incomplete assessment | SKU-FRA or SKU-EVA-FREE | FREE |
| Band C–B, clear capital need, mid complexity | SKU-CAP-CORE | $5,000 setup + $3,500/mo |
| Band B–A, stronger growth/revenue | SKU-CAP-GROWTH | $10,000 setup + $7,500/mo |
| Band A, high capital band / multi-entity / regulated | SKU-CAP-ENT | from $20,000 / from $12,500/mo |
| Debt instrument in scope | + SKU-SUCCESS-DEBT | 1.5% success fee |
| Equity / hybrid raise | + SKU-SUCCESS-EQUITY | 3% success fee |
| Reporting remediation needed | + SKU-HR-ASSOC/SENIOR/PRINCIPAL | $250–$500/hr |

**Tier heuristic:** prefer CORE → GROWTH → ENT as `max(revenue_score, capital_band_index, composite_score/20)` rises; ENT if regulated or `entity_count ≥ 3`.

---

## 4. Score → Opportunity / revenue forecast hooks

When lead reaches Qualified → Assessment (`EVA_INTAKE_TO_CRM_MAP.md`):

| Engine field | Opportunity column | Finance list (future) |
|--------------|---------------------|------------------------|
| `recommended_sku_primary` | `ServicePackage` | — |
| Setup + monthly estimate | `SetupFeeImpact`, `MRRImpact` | `HVCG_FinancialMilestones` (Setup / Retainer) |
| Success fee estimate | `SuccessFeeImpact` | Milestone type Success Fee* |
| EVA summary | `Notes` / `CopilotSummary` | Collections context only |
| `HVCG_IdempotencyKey` | `opp\|{leadId}` | Invoice automation safety |

Pipeline lead scoring (`PIPELINE_STAGES.md`):

- EVA/FRA completed: **+30** (`composite_score` present)  
- Revenue band disclosed: **+15**  
- Capital need + timeline: **+20**  
- Band A: **+10**  
- Low confidence / fraud flags: **−20**

---

## 5. Money emission rules

| Rule | Detail |
|------|--------|
| Stub phase | `proposed_price`, `price_range`, `per_sku.*.monthly` may be **null** in stub; label estimates when wired |
| Wired phase | Read amounts **only** from `PRICING_REGISTER.md` Section B |
| Owner gate | `owner_approval_required: true` always — EVA never sets final contract price |
| Legacy | All money fields **null** when `legacy_guard: BLOCK` |
| Inaccurate inputs | Recalc SKUs; surface notice before price adjustment |

---

## 6. Complexity multiplier (internal — not auto-applied to legacy)

Placeholder from calculator stub (clamped 0.85–1.35):

```
complexity = 1.0
  + 0.05 * (5 - reporting_score)
  + 0.04 * (entity_count - 1)
  + 0.08 * regulated_flag
  + 0.05 * capital_band_index
  + 0.03 * urgency_index
```

Public stub keeps `complexity_multiplier: null` until owner approves prod wiring.

---

## 7. Related finance inventory cross-links

| Client | EVA engine | Invoice register |
|--------|------------|------------------|
| ACCG Inc. | **BLOCK** — legacy | $4,539/mo preserved (see `inventory/INVOICE_REGISTER.md`) |
| Prodigy Games LLC | **BLOCK** — legacy | ~$7,500/mo CFO (UNVERIFIED) |
| Christie's Place LLC | **BLOCK** — legacy | $4,750 invoice-extracted |

---

## 8. Blockers / not live

- EVA form → CRM Automate: **BL-W1**  
- Website EVA publish: **not live** (spec ready)  
- Automated outbound from EVA scores: **BL-C1** owner gate  
- No Mercury/Square connect from EVA or pricing paths on this branch  
