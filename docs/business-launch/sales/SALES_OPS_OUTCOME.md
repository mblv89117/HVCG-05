# SALES_OPS_OUTCOME

**As of:** 2026-07-15 19:00 PT  
**Track:** Sales Ops · HVCG COO (Master PM orchestration)  
**Deliverable:** Automated proposal draft generation (Priority #8)  
**Status:** SPEC READY — operator docs + samples; no Prod automation yet

---

## Objective

Shorten the sales cycle by replacing manual proposal assembly with a **structured generator** that maps EVA band + SKU inputs to pre-filled proposal sections using `PRICING_REGISTER` Section B rates.

**Out of scope:** Sending proposals to prospects · Prod CRM writes · legacy client repricing.

---

## Artifacts delivered

| File | Purpose |
|------|---------|
| `sales/PROPOSAL_GENERATOR.md` | Operator spec — inputs, legacy BLOCK, band→SKU matrix, section fill, output contract |
| `sales/samples/SAMPLE_PROPOSAL_CORE.md` | Fictional **Example Holdings LLC** — Core ($5k / $3,500 mo) |
| `sales/samples/SAMPLE_PROPOSAL_GROWTH.md` | Fictional **Meridian Peak Industries LLC** — Growth ($10k / $7,500 mo) |
| `sales/SALES_OPS_OUTCOME.md` | This file — outcome + time savings |

**Not edited:** `SALES_PIPELINE_STATUS.md` (parent-owned by Master PM; file lives outside `sales/`).

---

## Time savings estimate

| Activity | Before (manual) | After (generator draft) | Minutes saved |
|----------|-----------------|-------------------------|---------------|
| Rate lookup + SKU selection | 15–20 min | Automated from Section B | ~15 min |
| Section assembly (8 sections) | 30–45 min | Pre-filled template | ~35 min |
| Disclaimer + pricing table | 10–15 min | Verbatim from register | ~10 min |
| Legacy guard check | 5–10 min (ad hoc) | Pre-flight BLOCK | ~5 min |
| **Total per proposal** | **45–90 min** | **~5 min** (Sales Ops review) | **40–85 min** |

### Annualized impact (illustrative)

| Proposals / quarter | Hours saved / quarter |
|---------------------|----------------------|
| 4 | 2.7–5.7 hrs |
| 8 | 5.3–11.3 hrs |
| 12 | 8.0–17.0 hrs |

Assumes owner approval step unchanged (~10–15 min per proposal). Generator does **not** remove owner gate — `owner_approval_required: true` on every output.

---

## Guardrails confirmed

| Rule | Implementation |
|------|----------------|
| Section B rates only | `PRICING_REGISTER.md` v1 lookup table in generator |
| Owner approval always | `owner_approval_required: true` on every output JSON |
| Legacy clients BLOCK | Pre-flight against `LEGACY_HVS_CLIENT_REGISTER` + classification |
| No legacy names in samples | Fictional prospects only (Example Holdings LLC, Meridian Peak Industries LLC) |
| No auto-send | Manual export after `price_status: APPROVED`; BL-C1 gate |

---

## Pipeline integration

| Stage | Generator touchpoint |
|-------|---------------------|
| Assessment Complete | EVA band stored → SKU recommendation available |
| Strategy Call → Proposal | Operator runs generator with confirmed SKU |
| Proposal (owner-priced) | Draft → owner approval → manual delivery |

Cross-ref: `PIPELINE_STAGES.md` Stage 5 · `PROPOSAL_TEMPLATE.md` build contract.

---

## Next steps (not Sales Ops scope)

| Item | Owner |
|------|-------|
| Wire generator to `HVCG_Proposals` CRM list | Dev / Maker (D-002) |
| PDF / Docx export | Dev |
| BL-C1 outbound email gate | Owner |
| Master PM rollup to `SALES_PIPELINE_STATUS.md` | Master PM |

---

## Related

`PROPOSAL_GENERATOR.md` · `PROPOSAL_TEMPLATE.md` · `PIPELINE_STAGES.md` · `../SALES_PIPELINE_STATUS.md` · `../PRICING_REGISTER.md`
