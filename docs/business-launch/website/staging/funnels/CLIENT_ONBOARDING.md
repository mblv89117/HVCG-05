# Client Onboarding Funnel — Staging Spec

**Scope:** Post-signature client onboarding (off public marketing site)  
**Overview page:** `/funnels/client-onboarding` · `staging/funnels/client-onboarding.html`  
**As of:** 2026-07-15  
**System:** HVCG OS (not website-generated)

---

## Purpose

Document what happens **after** agreement and payment so Process page and FAQ can set expectations. Website shows overview only — no live onboarding UI.

---

## Trigger

| Event | Source |
|-------|--------|
| Signed engagement + initial payment | CRM / `HVCG_Proposals` → Won |
| Legacy HVS preserve path | Internal ops — **not** new-client funnel |

---

## Onboarding stages

| # | Stage | Owner | Artifact |
|---|-------|-------|----------|
| 1 | Welcome & kickoff scheduling | Delivery lead | Kickoff calendar hold |
| 2 | Secure document collection | Ops | SharePoint data room / Secure Upload (post BL-C1) |
| 3 | Access & roles | IT/Ops | Portal invite (when module live) |
| 4 | Baseline financial snapshot | Fractional CFO / Advisory | Internal worksheet |
| 5 | Engagement plan & milestones | PM | `HVCG_Projects` milestones |
| 6 | First reporting rhythm | CFO team | Month-one cadence doc |

---

## Website role

| Do | Don't |
|----|-------|
| Summarize 5–6 steps on overview page | Fake login or progress tracker |
| Link Secure Upload stub + Client Portal placeholder | Promise SLA unless approved |
| Route legacy clients to established channel | Apply HVCG rate card to legacy |

---

## Data boundaries

- **New HVCG clients:** onboarding under HVCG entity and rate card  
- **Legacy HVS clients:** preserve contracted pricing (`PRICING_REGISTER.md` Section A) — onboarding via existing channel, not public funnel

---

## Gates

| Gate | Requirement |
|------|-------------|
| BL-C1 | External guest / upload invites |
| Portal module | Authenticated client area |
| BL-P1 | Pricing displayed on site (done) |

---

## Copy stub (overview page)

> After your engagement is signed, onboarding moves to a structured delivery path inside the HVCG operating system — kickoff, secure documents, milestones, and reporting rhythm. This page is an overview; your delivery team provides specifics.

---

## Related

`CONVERSION_PATH.md` · `staging/funnels/PROPOSAL.md` · `process.html` · `client-portal.html`
