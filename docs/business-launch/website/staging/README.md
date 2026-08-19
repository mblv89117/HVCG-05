# Website staging pack (local)

**Status:** Local HTML drafts for High Value Capital Group  
**Pages:** 31 HTML (+ 1 legacy redirect)  
**Not published.** No DNS. No paid hosting. **noindex** on all pages.

Open `index.html` in a browser for soft review.  
After **BL-W1**, port copy into SharePoint Communication Site + Forms → Dev CRM.

Canonical rates from `../../PRICING_REGISTER.md` (Section B · `HVCG-PRICE-2026-07-15-v1`).  
EVA field mapping: `eva-intake-field-checklist.md`.  
Robots: `robots-staging.txt`.

## Architecture docs

| Doc | Purpose |
|-----|---------|
| `../ARCHITECTURE.md` | SP Comm Site + local HTML dual layer |
| `../INFORMATION_ARCHITECTURE.md` | Full IA tree (30 pages) |
| `../SEO_STRUCTURE.md` | Title/meta/keyword map |
| `../KNOWLEDGE_CENTER.md` | Content hub strategy |
| `../BLOG_STRATEGY.md` | Blog calendar |
| `../PODCAST_STRATEGY.md` | Podcast plan |
| `../NEWSLETTER_STRATEGY.md` | Newsletter plan |

## Structure

```
staging/
├── index.html                          Home
├── about.html
├── services.html
├── services/
│   ├── capital-advisory.html
│   ├── fractional-cfo.html
│   ├── business-valuation.html       NEW
│   └── business-growth.html
├── funding.html                        NEW
├── assessments/
│   ├── eva.html
│   ├── capital-readiness.html
│   └── funding-strategy.html
├── knowledge-center.html               NEW
├── blog.html                           NEW
├── podcast.html                        NEW
├── newsletter.html                     NEW
├── resources.html
├── pricing.html
├── process.html
├── book-appointment.html               NEW (canonical booking)
├── book-strategy-call.html             Legacy → redirect
├── contact.html
├── funnels/
│   ├── client-onboarding.html          NEW
│   ├── proposal.html                   NEW
│   ├── EVA.md
│   ├── CLIENT_ONBOARDING.md
│   ├── PROPOSAL.md
│   └── APPOINTMENT_BOOKING.md
├── lead-magnets/
│   ├── funding-readiness-checklist.md
│   └── capital-readiness-one-pager.md
├── case-studies.html
├── faq.html
├── secure-upload.html
├── client-portal.html
├── privacy.html
├── terms.html
├── disclaimer.html
├── accessibility.html
├── styles.css
├── robots-staging.txt
└── eva-intake-field-checklist.md
```

## Page count

| Category | Count |
|----------|-------|
| Marketing & services | 12 |
| Assessments | 3 |
| Knowledge & content | 5 |
| Conversion & funnels | 4 |
| Support & legal | 7 |
| **Total HTML** | **31** |

## Navigation

- **Primary:** Home · Services · Assessments · Knowledge Center · Pricing · Process · FAQ  
- **Utility:** Book Appointment · Contact  
- **Footer:** About · Blog · Podcast · Newsletter · Onboarding · Proposal · Secure Upload · Client Portal · Legal

## Forbidden on staging

- Client names, logos, testimonials  
- Financing / valuation guarantees  
- Live portal login or guest invites (BL-C1)  
- Prod CRM writes
