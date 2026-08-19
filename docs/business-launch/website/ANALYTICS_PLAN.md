# ANALYTICS_PLAN

**Brand:** High Value Capital Group LLC  
**Environment:** Staging only — no paid analytics SaaS  
**As of:** 2026-07-15  
**Aligns with:** `CONVERSION_PATH.md`, `FUNNEL_STATUS.md`, `PLATFORM_RECOMMENDATION.md`

## Principle

Measure the **funnel**, not vanity traffic. Prefer **Microsoft-native / already-licensed** signals. Do not purchase Google Analytics 360, Hotjar, Mixpanel, etc., for staging.

---

## Staging analytics stack (recommended)

| Layer | Tool | Use | Cost gate |
|-------|------|-----|-----------|
| Page interest | SharePoint site usage / page analytics (tenant) | Which pages open in Dev | Included |
| Form completion | Microsoft Forms response counts | EVA / Readiness starts & completes | Included |
| Lead / call pipeline | SharePoint lists + CRM views (`HVCG_Leads`, `HVCG_DiscoveryCalls`) | Qualification → call | Included |
| Flow health | Power Automate run history | Failed writes to Dev lists | Included |
| Session UX (optional later) | Microsoft Clarity **only if already available / free tier and owner OK** | Rage clicks on long forms | No purchase; defer if unclear |
| Spreadsheet KPI | Manual weekly pull into launch workbook | Matches FUNNEL_STATUS counters | $0 |

**Not for staging:** Public GA4 property on custom domain, ad pixels, third-party heatmaps requiring purchase.

---

## Event dictionary

| Event | Source | When | Properties (min) |
|-------|--------|------|------------------|
| `page_view` | SP usage / manual | Page open | `page_slug` |
| `eva_start` | Forms | Form opened or Q1 answered | `form_id` |
| `eva_complete` | Forms + flow | Submit success | `lead_id` (Dev) |
| `readiness_start` | Forms | Start | `lead_id` if known |
| `readiness_complete` | Forms + flow | Submit | `score_band` |
| `strategy_call_requested` | Bookings/form | Submit | `source_page` |
| `contact_submit` | Contact form | Submit | `topic` |
| `upload_link_requested` | Secure Upload stub | Request | `status=queued` |
| `lead_qualified` | CRM / list field | Score rules | `qualified` Y/N |
| `proposal_created` | CRM only | Off-site | Not website pixel |

Store events as list columns or Flow compose → Dev list; avoid PII in analytics tool free-text where possible (email stays in CRM lists, not Clarity recordings if Clarity enabled).

---

## Funnel KPIs (mirror FUNNEL_STATUS)

| KPI | Definition | Staging target |
|-----|------------|----------------|
| EVA starts | `eva_start` count | Instrument > optimize |
| EVA completes | `eva_complete` | — |
| Readiness completes | `readiness_complete` | — |
| Call requests | `strategy_call_requested` | — |
| Qualified leads | CRM flag | — |
| Proposals / signed | CRM | Website not owner |

Live counters remain **0** until instrumentation exists.

---

## Dashboards

| Audience | View | Cadence |
|----------|------|---------|
| Docs / build | Form response counts + Flow failures | Per build sprint |
| Master PM | FUNNEL_STATUS rollup | Weekly |
| Owner | Qualified → calls only (when live) | On request |

No public-facing analytics badges on the site.

---

## Privacy & compliance hooks

- Disclose Forms → Dev list processing in Privacy draft.  
- No cross-site advertising cookies on staging.  
- If Clarity (or similar) enabled later: mask form fields; exclude Secure Upload and any authenticated areas.  
- Do not record client document contents.

---

## Implementation sequence (post BL-W1)

1. Name Forms with stable IDs; document in this file appendix when created.  
2. Flow: on submit → create/update `HVCG_Leads` + stamp event fields.  
3. Weekly script or view: export counts into FUNNEL_STATUS.  
4. Optional Clarity — owner decide; default **off** until security review.  
5. Public GA / Search Console — only after DNS/publish approval (separate checklist).

---

## Explicit non-goals

Paid attribution suites · social pixels · buying traffic for staging · emailing prospects from analytics tools.
