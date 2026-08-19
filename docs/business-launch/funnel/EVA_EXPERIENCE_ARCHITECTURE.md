# EVA Experience Architecture (Sprint 2)

**As of:** 2026-07-16  
**Environment:** Dev / staging only  
**CRM contract:** `EVA_CRM_PAYLOAD_SCHEMA` v1 — **locked**

---

## Updated architecture

```
┌─────────────────────────────────────────────────────────┐
│  Permanent front end (replaces Microsoft Forms)         │
│  staging/assessments/eva/                               │
│   · Multi-step UI (progress, autosave, resume, mobile)  │
│   · Dynamic question engine (show/hide, industry)       │
│   · Scoring engine (5 scores + composite)               │
│   · Rule-based recommendation layer                     │
│   · PDF-ready report (print CSS)                        │
└──────────────────────────┬──────────────────────────────┘
                           │ schemaOnly(payload)
                           ▼
              EVA_CRM_PAYLOAD_SCHEMA v1 JSON
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Download JSON   HTTP → HVCG_EvaForm   (Future) host
    (smoke/dev)     CreateLead (Dev)      on Comm Site
                           │
                           ▼
                    HVCG_Leads (Dev)
                           │ Qualify (manual)
                           ▼
              HVCG_LeadQualifiedCreateOpportunity
```

**Microsoft Forms:** optional transitional path only. Same JSON contract. UI is SoR for prospect intake.

---

## Components created

| Component | Path | Role |
|-----------|------|------|
| Wizard shell | `eva/index.html` | Multi-step UX |
| Styles | `eva/css/eva-app.css` | Mobile-responsive branding |
| Question bank | `eva/js/question-bank.js` | Dynamic Qs + visibility |
| Scoring | `eva/js/scoring-engine.js` | Cap / EV / Funding / Exit / Risk |
| Recommendations | `eva/js/recommendations.js` | Priorities, risks, SKU, valuation hint |
| CRM adapter | `eva/js/crm-payload.js` | Schema v1 + schemaOnly() |
| Autosave | `eva/js/autosave.js` | localStorage resume |
| App controller | `eva/js/app.js` | Steps, validation, submit |
| PDF report | `eva/report.html` | Exec summary, charts, CTA |
| Entry redirect | `assessments/eva.html` → `eva/` | Legacy link |

---

## Results surface (on submit)

1. Top 5 priorities  
2. Biggest risks  
3. Funding readiness summary  
4. Estimated valuation range (illustrative)  
5. Suggested HVCG engagement  
6. CRM JSON (schema v1 exact)  
7. PDF report + schedule CTA  

---

## Remaining blockers

| Blocker | Owner |
|---------|-------|
| HTTP callback URL for live Dev POST | Maker (Power Automate) |
| Host on org-restricted SharePoint | Owner / Track 3 |
| BL-PUBLISH-1 public DNS | Owner |
| BL-C1 prospect email | Owner |
| Prod flow activation | Explicit owner gate |

---

## Non-goals (this sprint)

- Production writes  
- Redesigning CRM payload schema  
- Generative LLM calls  
- Real appraisal / lender submission
