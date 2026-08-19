# NEWSLETTER_STRATEGY — HVCG Staging

**Page:** `/newsletter` · `staging/newsletter.html`  
**As of:** 2026-07-15  
**Phase:** P2 (subscribe stub on staging; sends after outbound approval)

---

## Objectives

| Goal | Mechanism |
|------|-----------|
| Nurture non-qualified leads | Monthly digest |
| Deliver lead magnets | Issue #1 checklist |
| Drive EVA completions | Primary CTA every issue |

**No live email sends** from staging without owner approval.

---

## List mechanics (Layer A target)

| Component | Technology |
|-----------|------------|
| Subscribe form | Microsoft Forms → `HVCG_Leads` (Newsletter flag) |
| Sends | Outlook / M365 campaign or manual (no paid ESP purchase) |
| Unsubscribe | Required before first live send |

---

## Subscribe fields (staging)

- Email (required)  
- First name (optional)  
- Company (optional)  
- Consent checkbox (required)  
- Link to Privacy Policy

---

## Issue cadence

| Issue | Content | CTA |
|-------|---------|-----|
| #0 Welcome | What to expect; no spam | EVA |
| #1 | Funding Readiness Checklist PDF | Readiness |
| #2 | Blog digest (top 2 posts) | EVA |
| #3 | Podcast episode highlight | Listen + EVA |
| #4 | Pricing framework explainer | Pricing page |

---

## Segments (future)

| Segment | Entry |
|---------|-------|
| EVA complete | Form flag |
| Readiness complete | Assessment flag |
| Qualified | CRM stage |
| Nurture only | No call booked |

---

## Compliance

- CAN-SPAM / consent before live send  
- No client names in examples  
- Disclaimer in footer  
- Staging: form captures to Dev list only

---

## Related

`KNOWLEDGE_CENTER.md` · `staging/lead-magnets/` · `staging/newsletter.html` · `privacy.html`
