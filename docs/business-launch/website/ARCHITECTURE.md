# ARCHITECTURE — HVCG Staging Website

**Brand:** High Value Capital Group LLC  
**As of:** 2026-07-15  
**Environment:** Staging only — no publish, no DNS, no purchases  
**Owner gate:** `BL-W1` (SharePoint Communication Site on Dev)

---

## Dual-layer model

HVCG website staging uses **two synchronized layers**:

| Layer | Role | Location | Runtime |
|-------|------|----------|---------|
| **A — SharePoint Communication Site (target)** | Production-intent marketing shell on M365 Dev | `HVCG-CommandCenter-Dev` or dedicated staging site collection | SharePoint Online + Entra |
| **B — Local HTML staging pack** | Copy, IA, and funnel prototyping in repo | `website/staging/*.html` | Browser / static preview only |

Layer B is the **content SoR for drafts** until Layer A pages are built. Slugs, CTAs, and CRM field names must match between layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAGING (no public DNS)                     │
├────────────────────────────┬────────────────────────────────────┤
│  Layer A: SP Comm Site     │  Layer B: Local HTML pack          │
│  (Dev tenant)              │  (repo — this folder)              │
│  · Pages + nav             │  · Same IA tree                    │
│  · Forms embed             │  · Form placeholders               │
│  · Bookings widget         │  · robots noindex meta             │
│  · List write-back         │  · Funnel + lead-magnet specs      │
└─────────────┬──────────────┴──────────────────┬──────────────────┘
              │                                  │
              ▼                                  ▼
     Power Automate (Dev only)          Docs: ARCHITECTURE,
              │                        INFORMATION_ARCHITECTURE,
              ▼                        funnels/*.md, SEO_STRUCTURE
   ┌──────────────────────┐
   │ HVCG_Leads           │
   │ HVCG_DiscoveryCalls  │
   │ HVCG_Opportunities   │
   │ HVCG_Proposals       │
   └──────────────────────┘
              │
              ▼
     HVCG OS (post-signature onboarding)
```

---

## Layer A — SharePoint Communication Site (target)

### Site topology

| Component | Technology | Notes |
|-----------|------------|-------|
| Marketing pages | SharePoint modern pages | Mirror `INFORMATION_ARCHITECTURE.md` slugs |
| Primary / utility nav | SP hub navigation or page header | Home · Services · Assessments · Knowledge Center · Pricing · Process |
| Assessments | Microsoft Forms (embedded) or Power Apps canvas | EVA, Capital Readiness, Funding Strategy |
| Appointment booking | Microsoft Bookings or request form | → `HVCG_DiscoveryCalls` |
| Secure upload | SharePoint document library (request link) | No live guest invites until `BL-C1` |
| Client portal | Static placeholder page | Real auth via future portal module |
| Legal | Static SP pages | Privacy, Terms, Disclaimer, Accessibility |
| Search / index | **Blocked** | `noindex` + site permissions; see `robots-staging.txt` |

### Integration flows

```
Visitor
  → SP page (content)
  → Form submit (EVA / Readiness)
  → Power Automate flow (Dev)
  → HVCG_Leads (+ assessment fields)
  → Optional: draft preliminary report template (no auto-email until approved)
  → Book Appointment (Bookings / form)
  → HVCG_DiscoveryCalls
  → CRM Opportunity → Proposal (off-site)
```

### Security posture (staging)

| Control | Implementation |
|---------|------------------|
| Indexability | `noindex` meta + `robots-staging.txt` pattern |
| Auth | Entra for editors; anonymous read on Dev site only if policy allows |
| Data plane | **Dev lists only** — no Prod writes |
| PII | Forms → Dev CRM; no client names on public pages |
| Uploads | Request-link model; virus scan via tenant default |

See `SECURITY_PLAN.md` for full checklist.

---

## Layer B — Local HTML staging pack

### Purpose

- Validate copy, CTA hierarchy, and IA before SP build
- Provide offline review (`open index.html`)
- Host funnel specs adjacent to page stubs (`staging/funnels/`, `staging/lead-magnets/`)

### Conventions

| Item | Rule |
|------|------|
| Styles | Single `styles.css`; no CDN frameworks |
| Paths | Root pages flat; services/ assessments/ funnels/ subdirs |
| Meta robots | `<meta name="robots" content="noindex, nofollow"/>` on every page |
| Pricing | Canonical from `../PRICING_REGISTER.md` Section B only |
| Forbidden | Client names, logos, testimonials, funding guarantees |

### Asset map (HTML → SP page)

| Local path | SP logical path |
|------------|-----------------|
| `index.html` | `/` |
| `about.html` | `/about` |
| `services.html` | `/services` |
| `services/capital-advisory.html` | `/services/capital-advisory` |
| `services/fractional-cfo.html` | `/services/fractional-cfo` |
| `services/business-valuation.html` | `/services/business-valuation` |
| `services/business-growth.html` | `/services/business-growth` |
| `funding.html` | `/funding` |
| `assessments/eva.html` | `/assessments/eva` |
| `assessments/capital-readiness.html` | `/assessments/capital-readiness` |
| `assessments/funding-strategy.html` | `/assessments/funding-strategy` |
| `knowledge-center.html` | `/knowledge-center` |
| `blog.html` | `/blog` |
| `podcast.html` | `/podcast` |
| `newsletter.html` | `/newsletter` |
| `pricing.html` | `/pricing` |
| `process.html` | `/process` |
| `book-appointment.html` | `/book-appointment` |
| `contact.html` | `/contact` |
| `funnels/client-onboarding.html` | `/funnels/client-onboarding` |
| `funnels/proposal.html` | `/funnels/proposal` |
| `secure-upload.html` | `/secure-upload` |
| `client-portal.html` | `/client-portal` |
| Legal pages | `/privacy`, `/terms`, `/disclaimer`, `/accessibility` |

---

## Analytics & instrumentation (deferred)

| Tool | Status | Gate |
|------|--------|------|
| Microsoft Clarity | Spec only | `ANALYTICS_PLAN.md` + owner approval |
| SharePoint usage | Tenant default | Internal QA |
| Funnel events | Named in `CONVERSION_PATH.md` | Wire after SP forms live |

Live counters remain **0** until instrumentation is approved.

---

## Explicit non-goals (staging)

- Custom domain or DNS changes  
- WordPress / Webflow / Framer / paid themes  
- Google Ads, Search Console on public domain  
- Live client portal authentication  
- Automated prospect email from preliminary report  
- Prod CRM or SharePoint writes  

---

## Migration checklist (B → A)

1. Owner approves `BL-W1` (Option A: SP Comm Site).  
2. Create Dev site collection / confirm hub.  
3. Port page copy from HTML pack (section by section).  
4. Embed Forms with field map from `eva-intake-field-checklist.md`.  
5. Wire Automate flows to Dev lists.  
6. Apply `noindex` + permission restrict.  
7. Link audit against `INFORMATION_ARCHITECTURE.md`.  
8. Master PM updates `WEBSITE_STATUS.md` (not this worktree).

---

## Related documents

| Doc | Purpose |
|-----|---------|
| `INFORMATION_ARCHITECTURE.md` | Full IA tree |
| `PLATFORM_RECOMMENDATION.md` | Platform decision |
| `SEO_STRUCTURE.md` | Title/meta/keyword map |
| `CONVERSION_PATH.md` | Funnel stages |
| `staging/funnels/*.md` | Step-by-step funnel specs |
| `staging/README.md` | Local pack index |
