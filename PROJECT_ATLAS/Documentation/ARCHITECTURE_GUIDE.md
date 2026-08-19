# Project Atlas Architecture Guide

| Field | Value |
|---|---|
| Purpose | Navigate architecture evidence without creating a competing architecture source |
| Audience | Architects, developers, QA, and operators |
| Owner | Documentation & Knowledge Manager; technical facts owned by System Architect |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Canonical index | `PROJECT_ATLAS/ARCHITECTURE.md` |

## Authority order

1. Root `ARCHITECTURE.md` and `docs/architecture/`.
2. `docs/data-model/` for entity definitions and relationships.
3. Versioned release/freeze packages for deployed configuration.
4. `PROJECT_ATLAS/ARCHITECTURE.md` as an orientation index.
5. `PROJECT_ATLAS/Architecture/` for approved Atlas-specific pointers or ADR summaries.

If these disagree, record an architecture question; do not reconcile by guessing.

## Current repository-backed shape

```text
Users
  → Power Apps canvas (not published to Production)
  → SharePoint lists and Dataverse solution lineage
  → Power Automate flows
  → Power BI / executive reporting specifications

Staging website + EVA assessment
  → intended Forms/HTTP interface
  → HVCG_EvaFormCreateLead
  → Development CRM leads/opportunities
  → Revenue conversion and activation engines
```

Production Track 1 is documented as `FROZEN — LIVE—INTERNAL`. Sprint 4 is Development/Staging only. This guide authorizes no deployment or environment action.

## Track boundaries

| Boundary | Authority |
|---|---|
| Production freeze | Deployment Engineer freeze package |
| Revenue OS / EVA | Revenue worktree at cited commits |
| CRM schemas and flows | CRM module docs and solution artifacts |
| Portal, Finance, Operations, Executive, AI | Corresponding isolated worktrees |
| Cross-project orientation | Authoritative Atlas |

## External dependencies

Microsoft 365, Power Platform, SharePoint, Dataverse, Power Automate, Dynamics environment URLs, public DNS, email, Teams, payment systems, and client portals are treated as mocked/unavailable in this review. Their interfaces are documented in [API_CATALOG.md](API_CATALOG.md); no live validation was attempted.

## Change process

Architecture changes require:

1. an interface or ADR proposal;
2. System Architect review;
3. owner decision when a gate or Production is affected;
4. QA evidence;
5. Atlas cross-reference and decision index updates.

