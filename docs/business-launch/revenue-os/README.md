# HVCG Revenue Operating System

**Status:** DESIGN COMPLETE — MOCKED / QA READY  
**Environment:** Documentation + deterministic reference model only  
**Branch:** `cursor/revenue-os-atlas-design`  
**Base:** Sprint 4 Phase 1 commit `7fd8bf270dc080eea9a3326184707169a3b120ca`  

## Executive Summary

The HVCG Revenue Operating System (Revenue OS) is the commercial control plane
from first lead through cash collection and renewal. It preserves the existing
Sprint 1–4 EVA and conversion work, uses current SharePoint/CRM records as
contracts, and adds no Production writes, flows, schemas, deployments, or
cross-track code.

The design provides:

1. Lead, sales, opportunity, proposal, contract, onboarding, retainer, billing,
   invoice, and collections lifecycles.
2. One commercial state model with explicit entry/exit criteria and owner gates.
3. Forecast, pipeline-health, KPI, executive-dashboard, and analytics formulas.
4. Automation policies that default to draft, queue, or internal alert.
5. Interface specifications for CRM, Finance, Operations, Client Portal,
   Executive Command, and Power Automate owners.
6. A deterministic in-memory reference engine and QA suite. Every external
   dependency is mocked.

## Deliverables

| Deliverable | Artifact |
|---|---|
| End-to-end lifecycle architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Canonical logical data model | [DATA_MODEL.json](DATA_MODEL.json) |
| Automation + cross-track interfaces | [AUTOMATION_AND_INTERFACES.md](AUTOMATION_AND_INTERFACES.md) |
| KPI, dashboard, forecast, health, analytics | [KPI_FORECASTING_ANALYTICS.md](KPI_FORECASTING_ANALYTICS.md) |
| Assumptions, risks, technical debt | [ASSUMPTIONS_RISKS_DEBT.md](ASSUMPTIONS_RISKS_DEBT.md) |
| Mock reference engine | `reference/revenue-os-engine.js` |
| QA validation | `tests/revenue/run_revenue_os_design_tests.js` |
| QA handoff | [QA_HANDOFF.md](QA_HANDOFF.md) |

## Scope map

```text
EVA / inbound
  → Lead
  → Sales qualification
  → Opportunity
  → Proposal
  → Contract approval/signature
  → Client + Engagement
  → Onboarding
  → Retainer / Project billing
  → Invoice
  → Collection
  → Renewal / expansion / churn
```

Each transition is idempotent, audit-producing, and gate-aware. No transition
implicitly sends an external message, changes Production, qualifies a lead,
accepts a contract, or posts accounting entries.

## Existing contracts reused, not modified

- `HVCG_Leads`
- `HVCG_Opportunities`
- `HVCG_Proposals`
- `HVCG_Clients`
- `HVCG_Engagements`
- `HVCG_Projects`
- `HVCG_Invoices`
- `HVCG_CollectionsActivities`
- `HVCG_RevenueForecastLines`
- `HVCG_Approvals`
- `HVCG_AuditEvents`
- Sprint 1–4 EVA and conversion artifacts

These names are logical integration targets. This design does not alter their
schemas or deploy against them.

## Safety posture

- Engineering OS: untouched
- Production / Track 1: untouched and frozen
- Public DNS / website: untouched
- Existing CRM schema and Power Automate contracts: untouched
- Email/SMS: mocked and disabled
- Payments/accounting: mocked; no ledger posting
- External signature/calendar/accounting providers: mocked
- Commit / merge / deploy: not performed

## Recommended Next Sprint

**Revenue OS Phase 2 — Contracted Dev adapters and UAT fixtures**

After QA and owner approval:

1. Approve interface contracts by owning agents.
2. Create Dev-only adapters for existing lists without schema changes.
3. Add fixture-backed contract tests against exported Dev data.
4. Run human UAT for lifecycle gates and dashboard definitions.
5. Keep outbound, e-sign, payments, and Production disabled.

