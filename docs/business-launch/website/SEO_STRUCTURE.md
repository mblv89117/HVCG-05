# SEO_STRUCTURE

**Brand:** High Value Capital Group LLC  
**Environment:** Staging only — no public DNS, no Search Console / paid SEO tools  
**As of:** 2026-07-15  
**Depends on:** `INFORMATION_ARCHITECTURE.md`, `BRAND_POSITIONING.md`, `VALUE_PROPOSITION.md`  
**Robots:** `staging/robots-staging.txt` + `<meta name="robots" content="noindex, nofollow"/>` on every HTML page

## Staging SEO posture

| Rule | Staging | Future public (owner-gated) |
|------|---------|------------------------------|
| Indexability | **noindex, nofollow** on all pages | Index after launch approval |
| robots.txt | `Disallow: /` (staging file) | Owner-approved allow rules |
| Canonical domain | Site-relative only; no custom domain | Owner-approved DNS later |
| Structured data | Spec only; optional later | Organization + FAQ when live |
| Link building / ads | Forbidden | Separate approval |

**Goal now:** Stable URL/slug map, title/meta patterns, and keyword intent so SharePoint pages are consistent when built—not traffic acquisition.

---

## Keyword themes (intent → page)

| Intent cluster | Primary terms (examples) | Target page |
|----------------|--------------------------|-------------|
| Brand | High Value Capital Group, HVCG | Home, About |
| Capital readiness | capital readiness assessment, prepare for capital raise | Capital Readiness, Funding |
| Enterprise value assessment | enterprise value assessment, EVA business | EVA, Business Valuation |
| Capital advisory | capital advisory, capital raise advisory (non-lender) | Capital Advisory |
| Fractional CFO | fractional CFO, outsourced CFO SMB | Fractional CFO |
| Business valuation | business valuation clarity, value drivers | Business Valuation |
| Funding education | funding paths, debt vs equity tradeoffs | Funding, Funding Strategy |
| Growth finance | business growth consulting finance | Business Growth |
| Knowledge / nurture | capital readiness guide, CFO reporting | Knowledge Center, Blog |
| Process / trust | how capital advisory works | Process, FAQ, Disclaimer |
| Commercial | capital advisory pricing, fractional CFO pricing | Pricing |
| Conversion | book strategy call, capital advisory consultation | Book Appointment |

**Avoid ranking language:** "guaranteed funding," "loan approval," named lenders/investors, client brands.

---

## Title & meta patterns

**Title:** `{Page focus} | High Value Capital Group` (≤60 chars preferred)  
**Meta description:** One benefit + one CTA hint + no guarantees (≤155 chars)  
**H1:** Match page job; brand name on Home only as hero brand signal  

| Page | Draft title | H1 | Primary CTA in copy |
|------|-------------|-----|---------------------|
| Home | Capital Advisory & Fractional CFO \| High Value Capital Group | Get capital-ready… | Start free EVA |
| About | About \| High Value Capital Group | About High Value Capital Group | EVA / Appointment |
| Services | Services \| High Value Capital Group | Services | Explore |
| Capital Advisory | Capital Advisory \| High Value Capital Group | Capital Advisory | Capital Readiness |
| Fractional CFO | Fractional CFO \| High Value Capital Group | Fractional CFO | EVA |
| Business Valuation | Business Valuation \| High Value Capital Group | Business Valuation | EVA |
| Business Growth | Business Growth \| High Value Capital Group | Business Growth | EVA |
| Funding | Funding \| High Value Capital Group | Funding paths and tradeoffs | Capital Readiness |
| EVA | Enterprise Value Assessment \| High Value Capital Group | Enterprise Value Assessment | Begin EVA |
| Capital Readiness | Capital Readiness Assessment \| High Value Capital Group | Capital Readiness Assessment | Start |
| Funding Strategy | Funding Strategy \| High Value Capital Group | Funding Strategy | Readiness |
| Knowledge Center | Knowledge Center \| High Value Capital Group | Knowledge Center | EVA |
| Blog | Blog \| High Value Capital Group | Blog | EVA |
| Podcast | Podcast \| High Value Capital Group | Podcast — Capital Ready | EVA |
| Newsletter | Newsletter \| High Value Capital Group | Newsletter | Subscribe |
| Resources | Resources \| High Value Capital Group | Resources | EVA |
| Pricing | Pricing \| High Value Capital Group | Pricing framework | Book Appointment |
| Process | Our Process \| High Value Capital Group | Process | Start EVA |
| Book Appointment | Book Appointment \| High Value Capital Group | Book Appointment | Submit |
| Client Onboarding | Client Onboarding Overview \| HVCG | Client Onboarding Overview | Contact |
| Proposal overview | Proposal Overview \| HVCG | Proposal Overview | Book Appointment |
| Case Studies | Case Studies \| High Value Capital Group | Case Studies | EVA (placeholder) |
| FAQ | FAQ \| High Value Capital Group | FAQ | Book Appointment |
| Contact | Contact \| High Value Capital Group | Contact | Send |
| Secure Upload | Secure Upload \| High Value Capital Group | Secure Upload | Request link |
| Client Portal | Client Portal \| High Value Capital Group | Client Portal | Contact |
| Privacy / Terms / Disclaimer / Accessibility | `{Legal} \| High Value Capital Group` | Legal title | — |

---

## Blog SEO (P2)

| Category slug | Target cluster |
|---------------|----------------|
| `/blog/capital-readiness` | Readiness |
| `/blog/enterprise-value` | EVA |
| `/blog/fractional-cfo` | CFO |
| `/blog/funding-education` | Funding |
| `/blog/process` | Trust |

Post template: 800–1,200 words · one H1 · 2–4 H2s · internal links to service + assessment + Disclaimer.

---

## On-page checklist (every marketing page)

1. One H1; logical H2s; no keyword stuffing  
2. `<meta name="robots" content="noindex, nofollow"/>`  
3. Internal links to next funnel step (see `CONVERSION_PATH.md`)  
4. Footer Disclaimer + Privacy  
5. Alt text on images (descriptive; no client names)  
6. Slug matches `INFORMATION_ARCHITECTURE.md` logical path  
7. Staging: `robots-staging.txt` + SP site permissions  

---

## Content → SEO map

| Resource type | Target cluster | Location |
|---------------|----------------|----------|
| Funding Readiness Checklist | Readiness | `lead-magnets/funding-readiness-checklist.md` |
| Capital Readiness One-Pager | Readiness | `lead-magnets/capital-readiness-one-pager.md` |
| EVA explainer | EVA | Blog post #2 |
| Advisory vs lender FAQ | Trust | FAQ expansion |
| Podcast show notes | Long-tail nurture | `/podcast/{slug}` |

---

## Technical SEO (staging)

| Item | Action |
|------|--------|
| robots.txt | `staging/robots-staging.txt` — `Disallow: /` |
| Meta robots | noindex, nofollow on all HTML pages |
| XML sitemap | Optional export for internal QA only — mark noindex URLs |
| 404 | SharePoint default + manual link audit |
| HTTPS | Tenant default |
| Performance | Keep pages light; avoid heavy third-party embeds |
| Schema (spec) | Organization name = High Value Capital Group LLC; no reviews/ratings |

### Organization schema (future live)

```json
{
  "@type": "Organization",
  "name": "High Value Capital Group LLC",
  "url": "[owner-approved domain]",
  "description": "Capital advisory and fractional CFO"
}
```

---

## Explicit non-goals (now)

Google Ads · Search Console property on public domain · guest blogging · directory submissions · purchasing backlinks or SEO SaaS · indexing staging Dev site.

---

## Related

`ARCHITECTURE.md` · `INFORMATION_ARCHITECTURE.md` · `BLOG_STRATEGY.md` · `staging/robots-staging.txt`
