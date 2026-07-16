# EVA → CRM Payload Schema (v1)

**As of:** 2026-07-16  
**Owner:** Revenue Systems  
**Environment:** Dev Command Center only  
**Status:** BUILD READY — Prod writes forbidden until explicit owner gate  

## Purpose

Single contract for:

1. Staging EVA form JSON download  
2. Microsoft Forms → Power Automate field map  
3. `HVCG_EvaFormCreateLead` HTTP / Forms body  
4. Offline scoring (`sales/score_eva_json.py`)

Every field below maps to **existing** `HVCG_Leads` columns. Structured EVA detail lives in `Notes` as JSON (`eva_summary` + `eva_answers`). Additive columns deferred.

---

## Hard rules

| Rule | Enforcement |
|------|-------------|
| Dev site only | `hvcg_CommandCenterSiteUrl` = Dev |
| No prospect email | `hvcg_EnableClientEmails=false`; flow never sends mail |
| No auto-qualify | `LeadStatus` always `New` |
| No dollar prices in CRM currency fields from form | `EstimatedValue` / `PipelineValue` left blank until owner-approved quote |
| Legacy HVS never HVCG-priced | Name match → `legacy_guard: BLOCK`; lead not created (or create with Disqualified + internal note only if maker overrides) |
| Idempotent | `HVCG_IdempotencyKey` = `eva|{sessionId}` |

---

## Request body (HTTP / Automate Parse JSON)

```json
{
  "sessionId": "uuid-or-form-response-id",
  "submittedAt": "2026-07-16T12:00:00Z",
  "source": "Website-EVA",
  "leadSourceDetail": "staging|forms|utm...",
  "contact": {
    "firstName": "Alex",
    "lastName": "Rivera",
    "name": "Alex Rivera",
    "email": "alex@example.com",
    "phone": "+1-555-0100",
    "role": "Owner / CEO",
    "isDecisionMaker": true
  },
  "company": {
    "legalName": "Example Holdings LLC",
    "revenueBand": "3",
    "revenueBandLabel": "$3–10M",
    "books": "3",
    "booksLabel": "Monthly close",
    "capital": "debt",
    "capitalLabel": "Debt",
    "timeline": "3",
    "timelineLabel": "0–90 days",
    "challenge": "Need growth facility before Q4",
    "valueDriverThemes": ["Working capital / cash conversion", "Debt structure and covenants"]
  },
  "consent": {
    "hvcgProspect": true,
    "notLegacyEngagementChange": true,
    "disclaimerAccepted": true
  },
  "eva": {
    "variant": "EVA-FREE",
    "composite_score_proxy": 72,
    "band": "B",
    "confidence_index": 0.7,
    "flags": [],
    "recommended_sku": "SKU-CAP-CORE",
    "package_label": "Capital Advisory — Core (estimate)",
    "proposed_price": { "setup": 5000, "monthly": 3500 },
    "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
    "owner_approval_required": true,
    "legacy_guard": "PASS"
  }
}
```

---

## Lead column mapping

| Payload | `HVCG_Leads` | Notes |
|---------|--------------|-------|
| `company.legalName` | `Title` | Required |
| `contact.name` | `ContactName` | first+last if split |
| `contact.email` | `Email` | lower |
| `contact.phone` | `Phone` | optional |
| `source` | `Source` | `Website-EVA` |
| constant `New` | `LeadStatus` | never auto-Qualified |
| service map | `ServiceInterest` | see below |
| computed | `LeadScore` | 0–100 |
| blank | `EstimatedValue` | owner gate |
| blank | `PipelineValue` | owner gate |
| JSON string | `Notes` | `eva_summary` wrapper |
| `eva|{sessionId}` | `HVCG_IdempotencyKey` | indexed |
| `leadSourceDetail` | `LeadSourceDetail` | attribution |
| role contains Advisor/Referral | `IsReferral` | boolean |

### ServiceInterest map

| Signal | Value |
|--------|-------|
| capital in debt/equity/both + band A/B | `Capital Advisory` |
| books ≤2 + capital urgent (timeline 3–4) | `Fractional CFO` |
| band C–F / nurture | `Assessment` |
| capital both | `Hybrid` |
| default | `Assessment` |

---

## Notes JSON shape

```json
{
  "eva_summary": {
    "eva_variant": "EVA-FREE",
    "composite_score": 72,
    "band": "B",
    "confidence_index": 0.7,
    "flags": [],
    "recommended_path": "Capital Advisory + Capital Readiness",
    "recommended_sku_primary": "SKU-CAP-CORE",
    "rate_card_version": "HVCG-PRICE-2026-07-15-v1",
    "legacy_guard": "PASS",
    "priority": "Sales Priority",
    "next_step": "CAPITAL_READINESS",
    "owner_approval_required": true,
    "proposed_price_estimate_only": { "setup": 5000, "monthly": 3500 }
  },
  "eva_answers": {
    "Q0.1": "Example Holdings LLC",
    "Q0.6": "Alex Rivera / Owner / alex@example.com",
    "Q2.1": "3",
    "Q12.1": "debt",
    "Q12.4": "3",
    "challenge": "Need growth facility before Q4",
    "valueDriverThemes": ["Working capital / cash conversion"]
  },
  "crm": {
    "assessmentType": "EVA",
    "recommendedNextStep": "CAPITAL_READINESS",
    "auto_contact": false,
    "environment": "Dev"
  }
}
```

---

## Scoring (aligned to `PIPELINE_STAGES` + staging proxy)

Offline script and staging form use the same rules as `sales/score_eva_json.py`:

| Signal | Points |
|--------|--------|
| Band A / proxy ≥75 | +40 |
| Band B / proxy ≥55 | +25 |
| Else | +10 |
| Timeline 3 or 4 | +20 |
| Revenue band 3 or 4 | +15 |
| Books 3 or 4 | +15 |
| Owner/CEO/CFO role | +10 |
| Capital debt/equity/both | +10 |
| Cap | 100 |

Priority: ≥70 Sales Priority · ≥40 Nurture · else Educate.

---

## Related

- `EVA_INTAKE_TO_CRM_MAP.md`  
- `EVA_DEV_FORMS_CRM_RUNBOOK.md`  
- `ENTERPRISE_VALUE_ASSESSMENT_SPEC.md`  
- `src/power-automate/definitions/HVCG_EvaFormCreateLead.definition.json`
