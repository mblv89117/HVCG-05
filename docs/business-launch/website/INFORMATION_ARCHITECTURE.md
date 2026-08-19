# INFORMATION_ARCHITECTURE — HVCG Staging Website

**Brand:** High Value Capital Group LLC  
**As of:** 2026-07-15  
**Environment:** Staging only  
**Canonical pricing:** `../PRICING_REGISTER.md` Section B  
**HTML mirror:** `staging/` directory

---

## IA principles

1. **Assessment-led** — EVA and Capital Readiness are the default funnel entry.  
2. **One job per page** — No mega-pages; hub pages orient only.  
3. **Knowledge separate from conversion** — Blog, podcast, newsletter live under Knowledge Center.  
4. **Funnel transparency** — Onboarding and proposal overviews are internal-facing stubs, not sales promises.  
5. **No social proof artifacts** — No client names, logos, testimonials, or outcome guarantees.

---

## Full IA tree

```
/ (Home)
│
├── /about
│
├── /services                                    [HUB]
│   ├── /services/capital-advisory
│   ├── /services/fractional-cfo
│   ├── /services/business-valuation
│   └── /services/business-growth
│
├── /funding                                     [Education hub — paths & tradeoffs]
│
├── /assessments                                 [HUB — implicit via nav]
│   ├── /assessments/eva                         Enterprise Value Assessment (FREE lead)
│   ├── /assessments/capital-readiness           Capital / Funding Readiness
│   └── /assessments/funding-strategy            Funding strategy education + CTA
│
├── /knowledge-center                            [HUB]
│   ├── /blog                                    [Index — posts TBD P2]
│   ├── /podcast                                 [Show index — episodes TBD P2]
│   ├── /newsletter                              [Subscribe stub]
│   └── /resources                               [Legacy alias → links to KC]
│
├── /pricing
├── /process
│
├── /book-appointment                            [Qualified conversion]
│   └── (legacy slug: /book-strategy-call → redirect)
│
├── /contact
│
├── /funnels                                     [Overview pages — not primary nav]
│   ├── /funnels/client-onboarding               Post-signature path overview
│   └── /funnels/proposal                        Post-call proposal path overview
│
├── /secure-upload                               [Staging stub — BL-C1 gate]
├── /client-portal                               [Placeholder — no login]
│
├── /case-studies                                [Explicit placeholder — no client content]
├── /faq
│
└── /legal                                       [Footer cluster]
    ├── /privacy
    ├── /terms
    ├── /disclaimer
    └── /accessibility
```

---

## Navigation model

### Primary (top)

| Item | Path | Job |
|------|------|-----|
| Home | `/` | Brand + primary CTA |
| Services | `/services` | Orient to four service lines |
| Assessments | `/assessments/eva` | Funnel entry (EVA as default landing) |
| Knowledge Center | `/knowledge-center` | Content hub |
| Pricing | `/pricing` | Canonical rate card |
| Process | `/process` | Engagement steps |
| FAQ | `/faq` | Objections |

### Utility (top-right)

| Item | Path | Job |
|------|------|-----|
| Book Appointment | `/book-appointment` | Qualified scheduling |
| Contact | `/contact` | General inquiry |

### Footer

| Cluster | Items |
|---------|-------|
| Company | About |
| Content | Blog · Podcast · Newsletter |
| Operations | Secure Upload · Client Portal |
| Funnels | Client Onboarding overview · Proposal overview |
| Legal | Privacy · Terms · Disclaimer · Accessibility |

---

## Page inventory (complete)

| # | Page | Path | Layer B HTML | Primary CTA |
|---|------|------|--------------|-------------|
| 1 | Home | `/` | `index.html` | Start free EVA |
| 2 | About | `/about` | `about.html` | EVA / Book Appointment |
| 3 | Services hub | `/services` | `services.html` | Explore service |
| 4 | Capital Advisory | `/services/capital-advisory` | `services/capital-advisory.html` | Capital Readiness |
| 5 | Fractional CFO | `/services/fractional-cfo` | `services/fractional-cfo.html` | EVA |
| 6 | Business Valuation | `/services/business-valuation` | `services/business-valuation.html` | EVA |
| 7 | Business Growth | `/services/business-growth` | `services/business-growth.html` | EVA |
| 8 | Funding | `/funding` | `funding.html` | Capital Readiness |
| 9 | EVA | `/assessments/eva` | `assessments/eva.html` | Begin EVA |
| 10 | Capital Readiness | `/assessments/capital-readiness` | `assessments/capital-readiness.html` | Start assessment |
| 11 | Funding Strategy | `/assessments/funding-strategy` | `assessments/funding-strategy.html` | Readiness / Call |
| 12 | Knowledge Center | `/knowledge-center` | `knowledge-center.html` | EVA / Subscribe |
| 13 | Blog | `/blog` | `blog.html` | Read / EVA |
| 14 | Podcast | `/podcast` | `podcast.html` | Listen / EVA |
| 15 | Newsletter | `/newsletter` | `newsletter.html` | Subscribe stub |
| 16 | Resources | `/resources` | `resources.html` | → Knowledge Center |
| 17 | Pricing | `/pricing` | `pricing.html` | Book Appointment |
| 18 | Process | `/process` | `process.html` | Start EVA |
| 19 | Book Appointment | `/book-appointment` | `book-appointment.html` | Submit |
| 20 | Contact | `/contact` | `contact.html` | Send |
| 21 | Client Onboarding overview | `/funnels/client-onboarding` | `funnels/client-onboarding.html` | Contact |
| 22 | Proposal overview | `/funnels/proposal` | `funnels/proposal.html` | Book Appointment |
| 23 | Case Studies | `/case-studies` | `case-studies.html` | EVA (placeholder) |
| 24 | FAQ | `/faq` | `faq.html` | Book Appointment |
| 25 | Secure Upload | `/secure-upload` | `secure-upload.html` | Request link |
| 26 | Client Portal | `/client-portal` | `client-portal.html` | Contact |
| 27 | Privacy | `/privacy` | `privacy.html` | — |
| 28 | Terms | `/terms` | `terms.html` | — |
| 29 | Disclaimer | `/disclaimer` | `disclaimer.html` | — |
| 30 | Accessibility | `/accessibility` | `accessibility.html` | Contact |

**Total pages:** 30 (+ legacy redirect `book-strategy-call.html`)

---

## Funnel IA (assessment sub-flow)

Not separate top-level branches; sequenced experience:

```
EVA (free)
  → Capital Readiness (SKU-FRA: FREE)
  → Preliminary report (template — no auto-email)
  → Qualification score
  → Book Appointment
  → Proposal (CRM — off-site)
  → Client Onboarding (OS — off-site)
```

See `staging/funnels/` for step specs.

---

## Content IA (Knowledge Center)

```
/knowledge-center
├── Featured: lead magnets (checklist, one-pager outlines)
├── /blog          — SEO + nurture articles (P2)
├── /podcast       — Long-form audio (P2)
├── /newsletter    — Email nurture (P2)
└── /resources     — Downloadables index (generic only)
```

Strategy docs: `KNOWLEDGE_CENTER.md`, `BLOG_STRATEGY.md`, `PODCAST_STRATEGY.md`, `NEWSLETTER_STRATEGY.md`.

---

## Lead magnets (staging outlines)

| Asset | Path | Gate |
|-------|------|------|
| Funding Readiness Checklist | `staging/lead-magnets/funding-readiness-checklist.md` | P2 PDF |
| Capital Readiness One-Pager | `staging/lead-magnets/capital-readiness-one-pager.md` | P2 PDF |

Delivered post-EVA or via newsletter — not live download until owner approves.

---

## URL slug rules

- Lowercase, hyphenated, stable  
- No date slugs on evergreen service pages  
- Blog posts (future): `/blog/{slug}`  
- Podcast episodes (future): `/podcast/{slug}`  
- Assessment forms: slug matches page path  

---

## Explicit exclusions

- Client logos, names, testimonials  
- Named lenders/investors as endorsements  
- Live portal login UI  
- Public DNS / custom domain  
- Legacy HVS pricing on marketing pages (preserve register only)

---

## Related documents

`SITEMAP.md` (prior inventory) · `ARCHITECTURE.md` · `SEO_STRUCTURE.md` · `CONVERSION_PATH.md` · `staging/README.md`
