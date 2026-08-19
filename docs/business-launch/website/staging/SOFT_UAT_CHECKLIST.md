# SOFT UAT CHECKLIST — Staging HTML

**As of:** 2026-07-15 18:24 PT  
**Scope:** `website/staging/` only (31 HTML + `robots-staging.txt`)  
**Canonical pricing:** `../PRICING_REGISTER.md` Section B · `HVCG-PRICE-2026-07-15-v1`  
**Goal (COO / Sales-Growth):** Shorten time to first lead after **BL-W1** — verify click-paths now so Forms wiring is the only blocker.  
**Not in scope:** Publish, DNS, `WEBSITE_STATUS.md` edits, SharePoint/Forms live wiring.

---

## Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Primary CTA click-paths | **16** | **0** | Automated href resolution + path trace |
| Broken-link scan | **770** | **0** | All internal `href` targets resolve under `staging/` |
| Mobile viewport checks | **5** | **0** | Meta + CSS review; see advisory below |
| Noindex verification | **32** | **0** | 31 HTML pages + `robots-staging.txt` |
| Pricing vs Section B | **11** | **0** | Amounts match; Enterprise uses “From $” vs register “Starting $” |
| **Total** | **834** | **0** | |

**Links fixed this pass:** **0** (no broken relative links found)

**Manual follow-up (post-BL-W1):** Browser tap-through on iPhone SE (320px) and owner walk-through per `LAUNCH_CHECKLIST.md` Gate D.

---

## 1 — Primary CTA click-path tests

Run from local `index.html` (file:// or simple static server). Expected landing pages must load without 404.

### EVA (Enterprise Value Assessment)

| # | Start | Action | Expected target | Result |
|---|-------|--------|-----------------|--------|
| E1 | `index.html` | Hero CTA **Start free Enterprise Value Assessment** | `assessments/eva.html` | **PASS** |
| E2 | `index.html` | Inline link **Enterprise Value Assessment** (Start here) | `assessments/eva.html` | **PASS** |
| E3 | `index.html` | Primary nav **Assessments** | `assessments/eva.html` | **PASS** |
| E4 | `assessments/eva.html` | Primary CTA **Request EVA (staging)** | `contact.html` | **PASS** |
| E5 | `assessments/eva.html` | Secondary CTA **Continue to Capital Readiness** | `assessments/capital-readiness.html` | **PASS** |
| E6 | `assessments/capital-readiness.html` | Secondary CTA **Start with EVA** | `assessments/eva.html` | **PASS** |

**Conversion path (happy path):** Home → EVA → Capital Readiness → Book Appointment → Contact (staging placeholders until BL-W1 Forms).

### Book Appointment

| # | Start | Action | Expected target | Result |
|---|-------|--------|-----------------|--------|
| B1 | `index.html` | Secondary hero CTA **Book Appointment** | `book-appointment.html` | **PASS** |
| B2 | Any page | Utility nav **Book Appointment** | `book-appointment.html` (path adjusts for depth) | **PASS** |
| B3 | `book-appointment.html` | Primary CTA **Request appointment (staging)** | `contact.html` | **PASS** |
| B4 | `book-appointment.html` | Secondary CTA **Start free EVA** | `assessments/eva.html` | **PASS** |
| B5 | `assessments/capital-readiness.html` | Primary CTA **Book Appointment** | `book-appointment.html` | **PASS** |
| B6 | `book-strategy-call.html` | Meta refresh + fallback link (legacy alias) | `book-appointment.html` | **PASS** |

### Pricing

| # | Start | Action | Expected target | Result |
|---|-------|--------|-----------------|--------|
| P1 | `index.html` | Primary nav **Pricing** | `pricing.html` | **PASS** |
| P2 | `pricing.html` | Primary CTA **Book Appointment** | `book-appointment.html` | **PASS** |

### Contact

| # | Start | Action | Expected target | Result |
|---|-------|--------|-----------------|--------|
| C1 | `index.html` | Utility nav **Contact** | `contact.html` | **PASS** |
| C2 | `contact.html` | Inline link **Secure Upload** | `secure-upload.html` | **PASS** |

---

## 2 — Broken-link scan notes

**Method:** Python resolver — every `href` in all 31 HTML files, resolved relative to source file, checked for existence under `staging/`.

| Metric | Value |
|--------|-------|
| HTML files scanned | 31 |
| Internal `href` links checked | **770** |
| Broken relative links | **0** |
| External / mailto / anchor-only | Skipped (none broken in staging scope) |
| `styles.css` from nested paths | **PASS** — `../styles.css` resolves from `assessments/` and `services/` and `funnels/` |
| Legacy redirect | `book-strategy-call.html` → `book-appointment.html` **PASS** |

**Fixes applied:** None required.

**Advisory:** Markdown references (e.g. `eva-intake-field-checklist.md`, funnel `*.md`) appear as plain text / `<code>`, not as HTML links — intentional for staging.

---

## 3 — Mobile viewport checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| M1 | `<meta name="viewport" content="width=device-width, initial-scale=1"/>` on every HTML page | **PASS** | 31/31 pages |
| M2 | Fluid type on brand / H1 (`clamp()`) | **PASS** | `styles.css` L3, L12 |
| M3 | Primary + utility nav wrap on narrow width | **PASS** | `flex-wrap` on nav L6–7 |
| M4 | Content padding / max-width (no edge-to-edge text) | **PASS** | `main` max-width 52rem, padding 1.5rem |
| M5 | CTA tap targets (min ~44px height) | **PASS** | `.cta` padding 0.85rem × 1.25rem |

**Advisory (non-blocking):** Pricing tables use `width:100%` without `overflow-x:auto`. At 320px width, three columns remain readable at 0.9rem but are tight — consider horizontal scroll wrapper before public launch if owner testing flags clipping.

**Redirect page:** `book-strategy-call.html` is minimal (no stylesheet) — acceptable for 0s redirect only.

---

## 4 — Noindex verification

| # | Check | Result |
|---|-------|--------|
| N1–N31 | Each HTML file contains `<meta name="robots" content="noindex, nofollow"/>` | **PASS** (31/31) |
| N32 | `robots-staging.txt` — `User-agent: *` + `Disallow: /` | **PASS** |

**SharePoint Dev reminder (BL-W1):** Apply equivalent noindex + org-only access per `robots-staging.txt` header comments.

---

## 5 — Pricing accuracy vs `../PRICING_REGISTER.md` Section B

Source page: `pricing.html` · Register version: `HVCG-PRICE-2026-07-15-v1`

### B.1 Productized / packages

| Register SKU | Register values | Staging display | Match |
|--------------|-----------------|-----------------|-------|
| SKU-FRA | Funding Readiness Assessment · **FREE** | FREE | **PASS** |
| SKU-CAP-CORE | Setup **$5,000** · Monthly **$3,500** | $5,000 / $3,500 | **PASS** |
| SKU-CAP-GROWTH | Setup **$10,000** · Monthly **$7,500** | $10,000 / $7,500 | **PASS** |
| SKU-CAP-ENT | **Starting $20,000** / **Starting $12,500** | **From $20,000** / **From $12,500** | **PASS** (wording variant; amounts identical) |

Enterprise footnote on page (“may exceed listed starting amounts”) aligns with register note on custom complexity.

### B.2 Success fees

| Register | Staging | Match |
|----------|---------|-------|
| Debt **1.5%** | 1.5% | **PASS** |
| Equity **3%** | 3% | **PASS** |

### B.3 Hourly consulting

| Level | Register | Staging | Match |
|-------|----------|---------|-------|
| Associate | **$250/hr** | $250/hr | **PASS** |
| Senior | **$350/hr** | $350/hr | **PASS** |
| Principal | **$500/hr** | $500/hr | **PASS** |

### B.4 / B.5 Governance

| Check | Result |
|-------|--------|
| “Final engagement price requires owner approval” on page | **PASS** |
| Legacy HVS preservation note (Section A not applied) | **PASS** |
| Rate card version `HVCG-PRICE-2026-07-15-v1` displayed | **PASS** |
| No conflicting dollar amounts on other staging HTML pages | **PASS** (only `pricing.html` lists Section B SKUs; other pages say “free” for assessments only) |

---

## 6 — BL-W1 readiness (lead capture blockers)

These are **expected FAIL for live lead capture** until BL-W1 — not counted in pass/fail above:

| Item | Staging state | Owner gate |
|------|---------------|------------|
| EVA Microsoft Form → Power Automate → `HVCG_Leads` | Placeholder CTA → `contact.html` | **BL-W1** |
| Capital Readiness form | Placeholder | **BL-W1** |
| Book Appointment (Bookings or request form) | Placeholder → `contact.html` | **BL-W1** |
| Contact general inquiry form | No live endpoint | **BL-W1** |

After BL-W1: re-run sections 1–2 with live form submit smoke test (Dev CRM only).

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Automated UAT (repo scan) | COO / Sales-Growth agent | 2026-07-15 | **834 PASS / 0 FAIL** |
| Owner soft walk-through | | | ☐ Pending |
| BL-W1 Forms wired | | | ☐ Pending |
