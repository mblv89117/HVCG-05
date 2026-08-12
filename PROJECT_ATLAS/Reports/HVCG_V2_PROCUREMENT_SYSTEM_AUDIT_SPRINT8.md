# HVCG V2 — Procurement System Audit (Sprint 8 BA-E)

**As of:** 2026-08-11  
**CR:** CR-HVCG-BA-V2-001  
**Rule:** Do not build a second CRM or proposal system. No second Procurement SPA.

## Classification

| Capability | Classification | Notes |
|------------|----------------|-------|
| OFF-PROC-READY / OFF-GOV-SETUP / SL-PROCUREMENT | **REUSE** | Canonical catalog |
| DIAG-PROCUREMENT / offer decision engine | **REUSE** | Commercial routing |
| HVCG_Opportunities / Proposals | **REUSE / EXTEND** | Revenue lineage; procurement opp list added |
| DocumentRequests + folder `07 Procurement` | **EXTEND** | Conditional checklists via AGT-DOC-CHECKLIST pattern |
| HVCG_Approvals | **EXTEND** | Procurement approval types added |
| Client 360 shell | **EXTEND** | Procurement tab |
| AGT-PROCURE / AGT-GOV-REG | **EXTEND** | Runtime bound (were stubs) |
| AGT-PROPOSAL | **REUSE** | Procurement proposal support reuses agent |
| AGT-DOC-CHECKLIST | **EXTEND** | Procurement-conditioned checklists |
| Capital readiness / Fractional CFO | **REUSE** | Mobilization / cash handoffs |
| Contractor Profile / Proc Opportunity lists | **NEW** | Dev schemas |
| Government Registrations / Past Performance | **NEW** | Dev schemas |
| Capability statement truth engine | **NEW** | In `contract_procurement.py` |
| Elite `/procurement` workbench | **NEW** (inside Elite) | Not a competing SPA |
| Live SAM.gov / vendor portal connectors | **DEFER** | Submission gated; no silent activation |
| Full post-award PM platform | **DEFER** | Foundation + Ops handoff only |
| ACCG multi-line procurement execution | **DEFER** | Economics protected |

## Duplicates avoided

- No second CRM
- No second proposal engine
- No second Capital / Finance architecture
- No competing Procurement application shell
