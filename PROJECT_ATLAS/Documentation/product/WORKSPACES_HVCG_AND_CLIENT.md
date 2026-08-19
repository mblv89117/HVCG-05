# HVCG and Client Workspace Usage

| Field | Value |
|-------|--------|
| Audience | HVCG team, leadership, demo facilitators |
| Status | CURRENT (catalog structure) — full Client Workspace module still gated |
| Last verified | 2026-07-20 |
| Source | `apps/atlas-elite-os/src/data/workspaces.ts` |

## Important distinction

| Concept | Status |
|---------|--------|
| Workspace **catalog** (HVCG + Colorado Craft Beef entries) | **CURRENT** in code |
| Nav route **Client Workspace** (`/clients`) | **GATED placeholder** until owner UAT of Design System + Executive Dashboard |

Do not tell users the full client workspace product module is complete.

## HVCG internal workspace

| Field | Value (code) |
|-------|----------------|
| id | `ws-hvcg` |
| name | High Value Capital Group |
| kind | internal |
| engagementStatus | Internal |
| relationshipOwner | Manny Barela |
| health | On Track |
| services | Capital Advisory, Enterprise Value, Operations |
| notes | Primary internal workspace for daily executive use |

## Client workspace pattern (Colorado Craft Beef)

See [COLORADO_CRAFT_BEEF_DEMO_GUIDE.md](COLORADO_CRAFT_BEEF_DEMO_GUIDE.md) for demo steps.

Relationship facts only. Financial KPIs remain pending until verified Atlas data sources connect.

## Shared vocabularies in code (structure ready)

Pipeline stages, document categories, status vocabulary, and funding types are defined in `workspaces.ts` for consistent UI — counts and dollar amounts still show pending labels unless a verified source is wired.

## How team members should speak about workspaces

- **Say:** “We have an HVCG internal workspace and a Colorado Craft Beef demo client profile with verified relationship history.”
- **Do not say:** “Client Workspace module is live in Production” or quote invented revenue/EBITDA for CCB.
