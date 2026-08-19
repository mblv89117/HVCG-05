# FUNNEL_STATUS

**As of:** 2026-07-16 20:45 PT  
**Goal:** Lead generation → Revenue  
**Sprint focus:** Sprint 2 — EVA Experience (permanent front end)

| Component | Status | Artifact |
|-----------|--------|----------|
| EVA / Funding Readiness spec | READY | `funnel/ENTERPRISE_VALUE_ASSESSMENT_SPEC.md` |
| EVA → CRM field map | READY | `funnel/EVA_INTAKE_TO_CRM_MAP.md` |
| EVA CRM payload schema | **LOCKED v1** | `funnel/EVA_CRM_PAYLOAD_SCHEMA.md` |
| Sprint 2 EVA experience | **READY (Dev staging)** | `website/staging/assessments/eva/` |
| Experience architecture | READY | `funnel/EVA_EXPERIENCE_ARCHITECTURE.md` |
| Multi-score engine | READY | `eva/js/scoring-engine.js` |
| Recommendation layer | READY | `eva/js/recommendations.js` |
| PDF report | READY | `eva/report.html` (Print → PDF) |
| Pricing engine | RATES LOADED (BL-P1 closed) | `PRICING_REGISTER.md` |
| Flow definition EVA → Lead | READY (Dev imported Sprint 1) | `HVCG_EvaFormCreateLead` |
| Dev CRM smoke Path A | **PASS** | LeadId=13 → OppId=18 |
| HTTP POST to flow URL | PENDING maker callback URL | Runbook Path A |
| Live public leads | 0 | BL-PUBLISH-1 |

## Sprint 2 deliverables

| Item | Path |
|------|------|
| Multi-step UI | `assessments/eva/index.html` |
| Question engine | `eva/js/question-bank.js` |
| Screenshots | `funnel/screenshots/` |
| Schema sample | `funnel/fixtures/eva_experience_schema_sample.json` |

## Next (no Prod)

1. Maker: paste Dev flow HTTP URL → live POST from UI  
2. Soft UAT of multi-step EVA on mobile  
3. Forms Path B optional (UI is permanent FE)  
4. Defer public DNS (BL-PUBLISH-1)

## Owner gates

BL-W1-STAGING *(CLOSED for testing)* · BL-PUBLISH-1 · BL-C1 · Prod EVA Turn On *(explicit)*
