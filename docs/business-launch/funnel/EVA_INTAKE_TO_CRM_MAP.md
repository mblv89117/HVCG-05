# EVA_INTAKE_TO_CRM_MAP

**As of:** 2026-07-15 18:45 PT  
**Priority:** #9 — Enterprise Value Assessment → CRM  
**Sources:** `funnel/ENTERPRISE_VALUE_ASSESSMENT_SPEC.md` · `src/sharepoint/lists/HVCG_Leads.json` · `HVCG_Opportunities.json`  
**Pricing:** Rates from `PRICING_REGISTER.md` v1 (**BL-P1 CLOSED**) via `PRICING_ENGINE_SPEC.md` — **never** for legacy clients  
**Status:** SPEC READY — form wiring blocked on BL-W1

---

## Purpose

Map EVA question bank fields to Dev CRM `HVCG_Leads` and `HVCG_Opportunities` columns for:

1. Lead capture on assessment submit  
2. Lead score computation (`sales/PIPELINE_STAGES.md`)  
3. Pricing engine input (`legacy_guard` pre-check)  
4. Opportunity enrichment on Qualified → Assessment

**Environment:** Dev writes only when BL-W1 enables form → Automate path.

---

## Pre-flight: classification & legacy guard

| EVA input | CRM action |
|-----------|------------|
| Q0.8 confirm HVCG Prospect | Set logical class `HVCG_PROSPECT` |
| Name match `LEGACY_HVS_CLIENT_REGISTER` | **BLOCK** create — route to migration |
| `HVS_LEGACY_CLIENT` detected | **STOP** — no EVA-driven HVCG pricing |

---

## Lead create / update (on EVA submit)

### Direct column maps — `HVCG_Leads`

| EVA field | Lead column | Transform |
|-----------|-------------|-----------|
| Q0.1 Legal business name | `Title` | trim |
| Q0.6 Primary contact name | `ContactName` | parse name portion |
| Q0.6 email | `Email` | lower |
| Q0.6 phone | `Phone` | normalize |
| Q0.8 + form source | `Source` | `Website-EVA` \| `Website-FRA` |
| — | `LeadStatus` | `New` |
| Q12 purpose + EVA path | `ServiceInterest` | map below |
| Pricing engine Y1 estimate | `EstimatedValue` | optional; owner-approved only for late stage |
| Pricing engine Y1 estimate | `PipelineValue` | same |
| — | `LeadScore` | computed — see scoring |
| EVA composite + band | `Notes` | JSON blob `eva_summary` |
| Form session id | `HVCG_IdempotencyKey` | `eva|{sessionId}` |
| Referral flag | `IsReferral` | from referral form variant |
| UTM / page | `LeadSourceDetail` | marketing attribution |

### ServiceInterest mapping

| EVA signal | `ServiceInterest` |
|------------|-------------------|
| Service path = Capital Advisory | `Capital Advisory` |
| Reporting ≤2, capital urgent | `Fractional CFO` |
| Band D–F nurture | `Assessment` |
| Capital close debt/equity in scope | `Hybrid` |
| Growth + exit focus | `Growth` |
| Default | `Assessment` |

---

## EVA summary blob (`Notes` or additive `EvaPayload` JSON)

Store structured payload for scoring and engine:

```json
{
  "eva_variant": "EVA-FREE",
  "composite_score": 72,
  "band": "B",
  "confidence_index": 0.68,
  "flags": ["tax_filings_uncertain"],
  "section_scores": {
    "maturity_score": 3.8,
    "revenue_score": 4.0,
    "profitability_score": 3.2,
    "cash_score": 3.5,
    "debt_score": 4.0,
    "reporting_score": 2.5,
    "capital_need_clarity_score": 4.2,
    "ops_readiness_score": 3.0
  },
  "recommended_path": "Capital Advisory + Capital Readiness",
  "recommended_sku_primary": "SKU-CAP-GROWTH",
  "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
  "legacy_guard": "PASS"
}
```

---

## Section → Lead scoring signals

| Scoring rule (`PIPELINE_STAGES`) | EVA source |
|----------------------------------|------------|
| EVA / FRA completed +30 | `composite_score` present |
| Revenue band disclosed +15 | Q2.1 answered |
| Capital need + timeline +20 | Q12.1 + Q12.4 |
| Financials available +15 | Q17.1 OR Q17.2 OR Q17.3 = Y |
| Decision-maker call +20 | Manual — `DiscoveryCallDate` |
| Band A +10 | `band` = A |
| Low trust −20 | `confidence_index` &lt; 0.4 OR fraud/litigation flags |

---

## Opportunity maps (on Qualified → create opp)

| EVA / engine field | Opportunity column | When |
|--------------------|---------------------|------|
| Lead id | `LeadId` | create |
| Legal name | `Title` | `{Name} — Capital Advisory` etc. |
| `recommended_sku_primary` | `ServicePackage` | Assessment complete |
| Engine setup + monthly | `SetupFeeImpact`, `MRRImpact` | Assessment complete |
| Success fee est. | `SuccessFeeImpact` | if debt/equity in scope |
| `OpportunityType` | map SKU / path | see below |
| `Stage` | `Discovery` → `Assessment` | per pipeline |
| `Probability` | default by stage | `PIPELINE_STAGES` |
| `SalesOwnerEmail` | owner default | |
| EVA summary | `Notes` / `CopilotSummary` | human-readable 2–3 sentences |
| Keywords | `CopilotKeywords` | industry + capital purpose |
| Session key | `HVCG_IdempotencyKey` | `opp|{leadId}` |

### OpportunityType mapping

| Condition | `OpportunityType` |
|-----------|-------------------|
| SKU-CAP-* primary | `Advisory Engagement` |
| Capital raise focus | `Capital Raise` |
| SKU-FRA / EVA only | `Assessment` |
| Retainer without capital | `Retainer` |
| Success fee primary | `Success Fee` |
| Debt + equity elements | `Hybrid` |

---

## Full question bank → storage (additive / Notes)

Existing lists lack per-question columns. **v1:** persist in `EvaPayload` JSON on Lead; **v2 additive** recommendations:

| EVA section | Recommended additive column | Type |
|-------------|----------------------------|------|
| Q0 identity | `EntityType`, `StateOfFormation` on Lead | Text |
| Q2.1 revenue band | `RevenueBand` | Choice |
| Q12.1 capital sought | `CapitalSoughtBand` | Choice |
| Q12.4 timeline | `CapitalTimeline` | Choice |
| Composite | `EvaCompositeScore` | Number |
| Band | `EvaBand` | Choice A–F |
| Confidence | `EvaConfidenceIndex` | Number |
| Classification | `Classification` | Choice — default `HVCG_PROSPECT` |

Until additive columns ship, all Q*.answers live in `Notes` JSON `eva_answers` keyed by question ID.

### Sample answer keys (partial)

| EVA ID | Storage key | Used by |
|--------|-------------|---------|
| Q0.1 | `answers.Q0.1` | Title |
| Q0.3 | `answers.Q0.3` | EntityType |
| Q0.4 | `answers.Q0.4` | State |
| Q0.5 | `answers.Q0.5` | maturity_score |
| Q2.1 | `answers.Q2.1` | revenue_score, lead +15 |
| Q12.1 | `answers.Q12.1` | capital scoring |
| Q12.4 | `answers.Q12.4` | capital scoring |
| Q17.1–Q17.5 | `answers.Q17.*` | financials +15, doc requests |

---

## Pricing engine handoff

On Assessment complete, pass to `PRICING_ENGINE_SPEC` output contract:

| Engine input | EVA source |
|--------------|------------|
| `client_class` | `HVCG_PROSPECT` |
| `revenue_band` | Q2.1 |
| `complexity` | composite + multi-initiative flags |
| `capital_instrument` | Q12.3 |
| `legacy_guard` | roster check + Q0.8 |

Engine output feeds `sales/PROPOSAL_TEMPLATE.md` — `owner_approval_required: true`.

**Forbidden:** Applying Section B rates when `legacy_guard: BLOCK`.

---

## Automate flow sketch (not deployed)

```
Form submit (BL-W1)
  → Parse responses
  → Idempotency check (eva|session)
  → Legacy roster match? → stop / internal alert
  → Upsert HVCG_Leads
  → Compute scores + EvaPayload
  → If score ≥ 40 and Qualified criteria → HVCG_LeadQualifiedCreateOpportunity
  → Internal log only — no email (BL-C1)
```

---

## Gates

| Gate | Blocks |
|------|--------|
| BL-W1 | Public form → CRM write |
| BL-C1 | Prospect email / nurture |
| BL-P1 | *(CLOSED)* — rate attachment |
| PROD-1 | Prod list writes |
| D-002 | Power Automate import |

---

## Build readiness

| Item | Status |
|------|--------|
| Field mapping spec | **READY** |
| Lead scoring linkage | **READY** |
| Direct CRM columns for all EVA Q | **PARTIAL** — use Notes JSON v1 |
| Live form integration | **BLOCKED** — BL-W1 |
| Legacy guard | **READY** — spec |

**Related:** `FUNNEL_STATUS.md` · `funnel/ENTERPRISE_VALUE_ASSESSMENT_SPEC.md` · `sales/PIPELINE_STAGES.md`
