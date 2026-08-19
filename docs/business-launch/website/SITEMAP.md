# SITEMAP

**Brand:** High Value Capital Group LLC  
**Environment:** Staging only  
**As of:** 2026-07-15  
**Source:** Required pages in `../WEBSITE_STATUS.md`

## Information architecture

```
/ (Home)
├── /about
├── /services
│   ├── /services/capital-advisory
│   ├── /services/fractional-cfo
│   └── /services/business-growth
├── /assessments
│   ├── /assessments/eva                    (Enterprise Value Assessment)
│   ├── /assessments/capital-readiness
│   └── /assessments/funding-strategy
├── /pricing
├── /process
├── /case-studies                           (placeholder — no client content)
├── /resources
├── /faq
├── /book-strategy-call
├── /contact
├── /secure-upload
├── /client-portal                          (placeholder)
├── /privacy
├── /terms
├── /disclaimer
└── /accessibility
```

Suggested SharePoint URL slug style: short, hyphenated, stable. Final site-relative paths may use SP page library conventions; keep the logical tree above.

---

## Page inventory

| # | Page | Path (logical) | Primary job | CTA |
|---|------|----------------|-------------|-----|
| 1 | Home | `/` | Brand + one promise + path into EVA | Start free EVA |
| 2 | About | `/about` | Who HVCG is / how we work | Book call or EVA |
| 3 | Services hub | `/services` | Orient to three service lines | Explore service |
| 4 | Capital Advisory | `/services/capital-advisory` | Capital raise / structure advisory | Capital Readiness |
| 5 | Fractional CFO | `/services/fractional-cfo` | Finance leadership offer | EVA or Book call |
| 6 | Business Growth | `/services/business-growth` | Growth / ops consulting | EVA or Book call |
| 7 | EVA | `/assessments/eva` | Free lead assessment entry | Begin EVA |
| 8 | Capital Readiness | `/assessments/capital-readiness` | Readiness scoring | Start assessment |
| 9 | Funding Strategy | `/assessments/funding-strategy` | Education + next step | Capital Readiness / Call |
| 10 | Pricing | `/pricing` | Ranges / packaging (TBD rates) | Book call |
| 11 | Process | `/process` | How engagement works | Start EVA |
| 12 | Case Studies | `/case-studies` | Placeholder only | Contact / EVA |
| 13 | Resources | `/resources` | Guides / checklists (generic) | EVA |
| 14 | FAQ | `/faq` | Objections & clarity | Book call |
| 15 | Book a Strategy Call | `/book-strategy-call` | Schedule / request meeting | Submit booking |
| 16 | Contact | `/contact` | General inquiry | Send message |
| 17 | Secure Upload | `/secure-upload` | Document drop (staging stub) | Upload / request link |
| 18 | Client Portal | `/client-portal` | Placeholder — no login | Contact Ops |
| 19 | Privacy | `/privacy` | Legal | — |
| 20 | Terms | `/terms` | Legal | — |
| 21 | Disclaimer | `/disclaimer` | No guarantees (funding/valuation/etc.) | — |
| 22 | Accessibility | `/accessibility` | A11y statement | Contact |

**Total required pages:** 22

---

## Primary navigation (staging)

**Top nav:** Home · Services · Assessments · Pricing · Process · Resources · FAQ  

**Utility:** Book a Strategy Call · Contact  

**Footer:** About · Case Studies · Secure Upload · Client Portal · Privacy · Terms · Disclaimer · Accessibility  

---

## Assessment sub-flow (not separate IA branches)

1. EVA → soft gate → Capital Readiness (recommended)  
2. Capital Readiness → preliminary report concept → Book Strategy Call  
3. Funding Strategy page educates; does not skip qualification  

See `CONVERSION_PATH.md`.

---

## Explicit exclusions (staging)

- No client logos, names, or testimonials  
- No “results” or funded-amount claims  
- No live portal authentication  
- No public DNS aliases  

---

## Future (out of scope now)

SEO landing variants, blog taxonomy, partner pages, multi-language — defer to Content / SEO plans.
