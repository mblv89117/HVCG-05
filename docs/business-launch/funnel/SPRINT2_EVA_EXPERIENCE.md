# Sprint 2 — Enterprise Value Assessment Experience

**As of:** 2026-07-16 20:40 PT  
**Owner:** Revenue Systems  
**Environment:** Development / staging only — **no Production changes**

---

## Sprint objective

Replace the temporary short-form EVA intake with the **permanent multi-step Enterprise Value Assessment experience** that:

1. Captures the full EVA-FREE question bank with conditional logic  
2. Computes multi-dimensional readiness scores  
3. Emits **exactly** the existing `EVA_CRM_PAYLOAD_SCHEMA` v1 JSON  
4. Produces a branded PDF-ready report  
5. Positions the UI as the Forms replacement (same CRM contract)

---

## Expected business impact

| Lever | How |
|-------|-----|
| Generate revenue | Higher-quality scored leads → Sales Priority routing |
| Increase conversion | Progress, resume, mobile → lower abandon rate |
| Reduce owner hours | Structured scores + AI recommendations in CRM Notes |
| Improve client experience | Clear report + consultation CTA |
| Enterprise value | Productized assessment IP on HVCG stack |

---

## Deliverables (this sprint)

| Artifact | Path |
|----------|------|
| Architecture | `funnel/EVA_EXPERIENCE_ARCHITECTURE.md` |
| Question bank | `website/staging/assessments/eva/js/question-bank.js` |
| Scoring engine | `website/staging/assessments/eva/js/scoring-engine.js` |
| Recommendations | `website/staging/assessments/eva/js/recommendations.js` |
| CRM payload adapter | `website/staging/assessments/eva/js/crm-payload.js` |
| Wizard UI | `website/staging/assessments/eva/index.html` |
| Styles | `website/staging/assessments/eva/css/eva-app.css` |
| PDF report | `website/staging/assessments/eva/report.html` |
| Entry redirect | `website/staging/assessments/eva.html` → `/eva/` |

---

## Dependencies

- Existing payload schema (locked)  
- Dev `HVCG_EvaFormCreateLead` (imported Sprint 1)  
- Staging preview server  
- Rate card `HVCG-PRICE-2026-07-15-v1` (estimates only; owner approval)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Schema drift | Adapter unit-tests against fixture shape |
| Legacy misprice | Same name guard as Sprint 1 |
| Prospect email / DNS | Still gated BL-C1 / BL-PUBLISH-1 |
| Over-long form abandon | Autosave + resume + progress + EVA-FREE abbreviated steps |
| “AI” overclaim | Rule-based recommendation layer labeled as preliminary |

---

## Hard rules

- Dev / staging only  
- Do not redesign CRM payload schema  
- No Production Power Platform or SharePoint writes  
- No prospect outbound email  
- Final prices require owner approval
