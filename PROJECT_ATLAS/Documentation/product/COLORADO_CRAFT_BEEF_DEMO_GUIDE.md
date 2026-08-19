# Colorado Craft Beef — Demo Guide

| Field | Value |
|-------|--------|
| Audience | Manny, Master PM, demo facilitators |
| Status | CURRENT demo script (Development) |
| Last verified | 2026-07-20 |
| Source of truth for facts | `apps/atlas-elite-os/src/data/workspaces.ts` (`coloradoCraftBeefWorkspace`) |
| Environment | Development / UAT only |

## Demo objective

Show a **client workspace profile** with verified relationship history — without inventing financial results.

## Verified relationship facts (say these)

| Topic | Approved wording |
|-------|------------------|
| Client | Colorado Craft Beef |
| Kind | Client |
| Engagement status | Transitioning to HVCG |
| Relationship owner | Manny Barela |
| Health | On Track |
| Referral source | Randy Kamin — Generational Group |
| History | Original HVS referral; transitioning to HVCG; original need involved growth capital and additional real estate; prior financing discussion included non-dilutive and agricultural financing options |
| Services | Growth capital advisory; Real estate financing exploration |
| Notes | Demo client workspace. Financial KPIs remain pending until verified Atlas data sources are connected. |

## Explicitly do **not** say

- Any revenue, EBITDA, cash, AR, or enterprise-value dollar amount
- “Live Production client portal”
- “Full Client Workspace module is complete” (nav `/clients` is still a gated placeholder)

## Click-by-click demo (10 minutes)

### Setup (2 min)

1. Start Elite OS: see [MANNY_DAILY_USE_GUIDE.md](MANNY_DAILY_USE_GUIDE.md) steps 1–2.
2. Confirm banner shows Sample fallback or Dataverse connected (either is OK for relationship demo).
3. Stay on **Executive Dashboard**.

### Story (5 min)

1. Explain: “Atlas keeps an HVCG internal workspace and a Colorado Craft Beef demo client profile.”
2. Open Modules / workspace views that surface the catalog (as implemented in Elite OS pages that import `workspaceCatalog` / `coloradoCraftBeefWorkspace`).
3. Walk the relationship history bullets aloud — do not embellish.
4. Point to pending KPI labels and say: “Financials connect when verified Atlas data sources are ready — we do not invent numbers.”

### Close (3 min)

1. Show **My Approvals** as the owner decision inbox pattern.
2. Reiterate Development only — no Production, no live client outbound.
3. Offer next step: owner UAT checklist + Entra/SWA hosting when ready.

## If asked “where is the client workspace app?”

Answer: “The **Client Workspace** nav item is gated until Executive Dashboard UAT completes. Today we demonstrate the **Colorado Craft Beef profile data** and Executive Dashboard shell.”

## Related

- [WORKSPACES_HVCG_AND_CLIENT.md](WORKSPACES_HVCG_AND_CLIENT.md)
- [EXECUTIVE_DASHBOARD.md](EXECUTIVE_DASHBOARD.md)
