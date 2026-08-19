# EVA Funnel — Staging Spec

**Funnel:** Enterprise Value Assessment (lead qualification)  
**SKU:** SKU-FRA (Funding Readiness Assessment — FREE)  
**Page:** `/assessments/eva` · `staging/assessments/eva.html`  
**As of:** 2026-07-15

---

## Purpose

Capture qualified prospects, deliver structured value-driver clarity, and route to Capital Readiness — without claiming official valuation or financing approval.

---

## Stages

| # | Stage | Mechanism | CRM write |
|---|-------|-----------|-----------|
| 1 | Land | Home, Services, KC, ads (future) → EVA page | — |
| 2 | Start | Form open / `eva_start` event | Lead created (partial) |
| 3 | Complete | Form submit | `HVCG_Leads` + EVA fields |
| 4 | Thank-you | On-screen next step | Update Lead status |
| 5 | Branch | Continue → Capital Readiness | Link assessment ID |

---

## Form fields (staging)

| Field | Type | Required | CRM field |
|-------|------|----------|-----------|
| Full name | Text | Yes | ContactName |
| Email | Email | Yes | Email |
| Company | Text | Yes | CompanyName |
| Role | Choice | Yes | Role |
| Decision maker? | Yes/No | Yes | IsDecisionMaker |
| Revenue band | Choice | Yes | RevenueBand |
| Capital intent | Multi-select | Yes | CapitalIntent |
| Timeline | Choice | Yes | CapitalTimeline |
| Books quality (self) | Scale 1–5 | Yes | BooksQualitySelf |
| Value-driver themes | Multi-select | Yes | ValueDrivers |
| Open challenge | Text (500) | No | OpenChallenge |

Full mapping: `eva-intake-field-checklist.md`.

---

## Qualification logic (draft)

| Signal | Outcome |
|--------|---------|
| Decision maker + revenue band fit + capital intent | **Qualified** → emphasize Readiness |
| Partial fit | **Nurture** → Resources + optional call |
| No decision maker / no transparency | **Disqualify** → FAQ only |

See `IDEAL_CLIENT_PROFILE.md`.

---

## Copy requirements

- H1: Enterprise Value Assessment  
- Time estimate: 10–15 minutes  
- Disclaimer link on page and thank-you  
- Forbidden: "official appraisal," "guaranteed funding"

---

## Thank-you screen

> Thank you. Your responses help us understand value drivers and gaps — **not** as a financing decision or official valuation.  
> **Next step:** [Capital Readiness Assessment] (recommended) · [Book Appointment] (if already qualified)

**No automated email** until owner approves outbound template.

---

## Power Automate (Dev)

```
Form submitted
  → Create or update HVCG_Leads
  → Set Source = Website-EVA
  → Set AssessmentStatus = EVA-Complete
  → Optional: flag QualificationScore (manual rule or flow calc)
```

---

## Metrics

| Event | When |
|-------|------|
| `eva_start` | Form first interaction |
| `eva_complete` | Successful submit |
| `lead_qualified` | Score threshold met |

---

## Related

`CONVERSION_PATH.md` · `staging/funnels/APPOINTMENT_BOOKING.md` · `assessments/capital-readiness.html`
