# WIREFRAMES

**Brand:** High Value Capital Group LLC  
**As of:** 2026-07-15  
**Format:** Textual wireframes (staging)  
**Platform assumption:** SharePoint Communication Site pages (see `PLATFORM_RECOMMENDATION.md`)

Legend: `[ ]` interactive · `---` section break · `→` primary action

---

## Global chrome

```
┌─────────────────────────────────────────────────────────────┐
│ HVCG (wordmark)     Services  Assessments  Pricing  Process │
│ Resources  FAQ                    [Book Strategy Call] [···]│
├─────────────────────────────────────────────────────────────┤
│                         PAGE BODY                           │
├─────────────────────────────────────────────────────────────┤
│ About · Case Studies · Secure Upload · Portal               │
│ Privacy · Terms · Disclaimer · Accessibility                │
│ © High Value Capital Group LLC — Staging                    │
└─────────────────────────────────────────────────────────────┘
```

Mobile: hamburger; Book CTA sticky or in menu top.

---

## 1. Home `/`

**Job:** One composition — brand, one headline, one sentence, one CTA group, one visual plane.

```
[Full-bleed atmosphere: finance/ops workspace photography — edge to edge]
  Overlay (minimal, brand-first — no badges/chips):
    HIGH VALUE CAPITAL GROUP
    Headline: Get capital-ready with assessment-led advisory.
    Sub: Clarity on value drivers and readiness before you make the ask.
    [Start free EVA]  [Book a Strategy Call]
---
(Below fold only)
How it works (3 steps: EVA → Readiness → Call) → link Process
Service lines (text links, not card grid of promos)
Disclaimer one-liner → /disclaimer
```

**Avoid on first viewport:** stats, schedules, address blocks, fake logos, testimonials.

---

## 2. About `/about`

```
HIGH VALUE CAPITAL GROUP
Who we are
Short origin / operating model (advisory + fractional CFO + growth finance)
How we engage (assessment-led)
What we are not (lender / guarantor / CPA replacement)
[Start free EVA]  [Book Strategy Call]
```

---

## 3. Services hub `/services`

```
Services
One sentence: Choose the path that matches your capital and finance need.
List:
  → Capital Advisory
  → Fractional CFO
  → Business Growth
[Start with EVA]
```

---

## 4–6. Service detail (pattern)

**Paths:** `/services/capital-advisory` · `fractional-cfo` · `business-growth`

```
[Service name]
For whom (ICP slice)
What you get (bullets)
How it connects to assessments
What happens next (Call → Proposal)
Primary CTA: assessment matched to service
Secondary: Book Strategy Call
Link: Pricing · Process · Disclaimer
```

---

## 7. EVA `/assessments/eva`

```
Enterprise Value Assessment
Purpose + time estimate + disclaimer link
[Begin EVA] → Form steps:
  1 Contact / company
  2 Business snapshot
  3 Value-driver self-inputs
  4 Capital intent
Submit → Thank-you
  Next: [Continue to Capital Readiness]
  Optional: [Book Strategy Call]
```

---

## 8. Capital Readiness `/assessments/capital-readiness`

```
Capital Readiness Assessment
Prereq note: Best after EVA
Form: capital type, timeline, docs, debt/collateral themes
Submit → Score summary (bands) + gap themes
[Book Strategy Call]  [Review Funding Strategy]
```

---

## 9. Funding Strategy `/assessments/funding-strategy`

```
Funding Strategy (educational)
Paths & tradeoffs (generic; no lender names)
When to use Capital Readiness
CTA: [Start Capital Readiness]  [Book Strategy Call]
```

---

## 10. Pricing `/pricing`

```
Pricing
How pricing is set (complexity, scope, capital type)
Package sketches: EVA · Readiness · Advisory · FCFO · Growth · Setup
Dollar ranges: “Pending approved rate card (BL-P1)” or owner-approved bands only
Legacy note: Existing HVS engagements are separate — not quoted here
[Book Strategy Call]  [Start EVA]
```

---

## 11. Process `/process`

```
Process
1 EVA
2 Capital Readiness
3 Strategy Call
4 Proposal
5 Agreement & onboarding (HVCG OS)
Visual simple vertical flow
[Start free EVA]
```

---

## 12. Case Studies `/case-studies` (placeholder)

```
Case Studies
Status: Placeholder for future anonymized stories.
We do not publish client names, logos, or results on this staging site.
[Start EVA]  [Contact]
```

---

## 13. Resources `/resources`

```
Resources
List of generic guides/checklists (titles only until content plan)
Each item → EVA CTA in footer of list
```

---

## 14. FAQ `/faq`

```
FAQ
Accordion:
  Are you a lender?
  Do you guarantee funding or valuation?
  What is EVA?
  How long to readiness?
  How does pricing work?
  Legacy vs new HVCG clients?
CTAs after: [Start EVA] [Book Call]
```

---

## 15. Book a Strategy Call `/book-strategy-call`

```
Book a Strategy Call
Prefer: complete EVA + Readiness first [links]
Booking widget or request form:
  Name, email, company, preferred times, assessment IDs if any
Submit → confirmation (staging: internal notify only)
```

---

## 16. Contact `/contact`

```
Contact
Form: name, email, topic, message
Topics: General · Press · Vendor · Other
[Send]
Alt: Secure Upload link for documents
```

---

## 17. Secure Upload `/secure-upload`

```
Secure Upload
Staging stub: explain intent (encrypted request link / library)
[Request upload link] → internal queue (no guest invite until BL-C1)
Security notes + Privacy link
```

---

## 18. Client Portal `/client-portal` (placeholder)

```
Client Portal
Coming soon — authenticated workspace planned via HVCG portal module.
Existing clients: contact your HVCG / HVS ops lead (no self-serve login here).
[Contact]
```

---

## 19–22. Legal pages

**Privacy / Terms / Disclaimer / Accessibility** — standard long-form text layout:

```
[Title]
Last updated date
Sections (scroll)
Footer legal links cross-nav
No marketing CTA required; optional Contact
```

**Disclaimer must state:** no guarantee of valuation, financing, approval, funding, tax, legal, or performance outcomes.

---

## Implementation notes

- Prefer SharePoint page sections + web parts over custom card chrome.  
- Forms may open in embedded or linked Microsoft Forms.  
- Keep Case Studies and Portal as explicit placeholders—do not invent content.  
- Visual design for build phase should follow HVCG brand rules when design system is defined; wireframes here are structure-only.
