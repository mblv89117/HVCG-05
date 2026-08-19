# PLATFORM_RECOMMENDATION

**Brand:** High Value Capital Group LLC (HVCG)  
**Scope:** Staging only — no publish, no DNS, no paid purchases  
**As of:** 2026-07-15  
**Decision gate:** OWNER_DECISIONS `BL-W1` (await packet; do not purchase)

## Recommendation (staging)

**Use the existing Microsoft 365 / Power Platform stack already in HVCG Dev.**

| Layer | Staging choice | Why |
|-------|----------------|-----|
| Public marketing pages | **SharePoint Communication Site** on Dev (`HVCG-CommandCenter-Dev` or dedicated staging site collection) | Already licensed; Entra auth; no new vendor; fits RC-1 / no-infra-expansion rule |
| Assessments (EVA, Capital Readiness) | **Microsoft Forms** (or Power Apps canvas form) → **Power Automate** → `HVCG_Leads` / assessment lists | Native CRM handoff; no third-party form SaaS |
| Strategy call booking | **Microsoft Bookings** (if enabled) or calendar hold + manual confirm | No Calendly purchase |
| Secure upload | **SharePoint library** with request link / guest policy draft (no live client invites until approved) | Aligns with portal / data-room work |
| Client portal placeholder | Static “coming soon” page + link stub to future portal module | No fake login |
| Analytics (later) | Microsoft Clarity / SharePoint usage **only after** analytics plan — not required for staging shell | Avoid GA purchase/config noise now |

**Do not purchase** WordPress hosting, Webflow, Framer, Squarespace, paid themes/plugins, custom domains, or CDN plans for staging.

---

## Options compared (no purchase)

| Option | Fit for HVCG | Staging cost | CRM / M365 integration | Risk / notes | Verdict |
|--------|--------------|--------------|------------------------|--------------|---------|
| **A. SharePoint Communication Site + Forms + Automate** | High — same plane as OS | $0 incremental (existing M365) | Excellent (lists, flows, Entra) | Marketing polish limited vs dedicated CMS | **Recommended staging** |
| **B. Power Pages** (if already in tenant) | High for forms + auth | License-dependent; may trigger purchase | Strong | Confirm license before build; else defer | **Alt if licensed free** |
| **C. Static HTML in repo + local/preview only** | Medium — content prototyping | $0 | Manual wiring later | No real lead capture without extra work | Content draft aid only |
| **D. Azure Static Web Apps / App Service** | Medium–High | May need Azure spend approval | Possible via APIs | Infra expansion without revenue blocker | **Defer** |
| **E. WordPress / Webflow / Framer** | High marketing UX | Paid hosting/themes typical | Weak vs SharePoint CRM | Violates no-purchase / stack cohesion | **Reject for staging** |
| **F. Custom Next.js public site** | High long-term | Hosting + ops | Custom build | Overbuild before ICP/messaging validated | **Defer post-launch learning** |

---

## Staging architecture (recommended)

```
Visitor (Dev site, not public DNS)
  → Marketing pages (SharePoint pages)
  → Free EVA (Forms)
  → Capital Readiness (Forms or multi-page app)
  → Auto: create Lead + score fields (Power Automate → SharePoint)
  → Preliminary report email template (draft only; no live send without approval)
  → Book Strategy Call (Bookings / request form)
  → CRM Opportunity / Proposal path (existing HVCG OS)
```

**Environments:** Development / staging site only. Production SharePoint and public DNS remain untouched.

---

## Mapping to HVCG OS

| Website need | Existing OS capability |
|--------------|------------------------|
| Lead intake | `HVCG_Leads` |
| Discovery / call | `HVCG_DiscoveryCalls` |
| Opportunity | `HVCG_Opportunities` |
| Proposal | `HVCG_Proposals` |
| Capital desk | `HVCG_CapitalOpportunities` |
| Secure docs | Portal / data-room module (placeholder on site) |

---

## What staging must prove

1. Message → page → assessment → call path is clear (see `CONVERSION_PATH.md`).  
2. Forms write to Dev lists without touching Prod.  
3. No client names, logos, testimonials, or financing results.  
4. Legal pages present (Privacy, Terms, Disclaimer, Accessibility).  

## What staging must not do

- Publish to custom domain or change DNS  
- Buy themes, plugins, hosts, or SaaS  
- Invite external clients / guests without `BL-C1`  
- Show live pricing dollars until `BL-P1`  

---

## Owner decision ask (`BL-W1`)

**Recommended default:** Approve Option A (SharePoint Comm Site + Forms + Automate) for staging build. Revisit Power Pages or a dedicated marketing CMS only after funnel conversion data justifies cost.

**Next after approval:** Content plan + wireframe implementation on Dev site (still no DNS).
