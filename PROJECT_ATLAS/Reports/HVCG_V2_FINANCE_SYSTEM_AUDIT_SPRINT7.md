# HVCG V2 — Finance System Audit (Sprint 7 BA-D)

**As of:** 2026-08-11  
**CR:** CR-HVCG-BA-V2-001  
**Rule:** Do not build a second Finance application, QBO platform, or bank-data platform.

## Classification

| Capability | Classification | Notes |
|------------|----------------|-------|
| Elite `/financials` (FinancialsPage) | **EXTEND** | Now hosts FractionalCfoWorkbench |
| Elite `/banking`, Plaid pages | **REUSE** / **DEFER** live | PENDING_LIVE_SOURCE; no fake balances |
| Accounting / QBO connection pages | **REUSE** / **DEFER** live | Adapter status honest |
| Finance Ops SharePoint lists (existing) | **REUSE** | Engagement / tasks patterns |
| Financial Intelligence engines (prior tips) | **REUSE** calculations | Not a second FI SPA |
| Capital readiness adapters | **REUSE** | Sprint 5 engine |
| Financial Package Agent (AGT-FIN-PKG) | **REUSE** | CFO→lender packages |
| Client 360 Financials tab | **EXTEND** | Finance / CFO section |
| Executive Command Center | **EXTEND** | Consumes CFO summary placeholders |
| Revenue OS financial fields | **REUSE** (separate domain) | HVCG invoice ≠ client AR |
| AGT-INVOICE | **REUSE** (domain-separated) | Not client AR/AP |
| OFF-FCFO-OP / SL-FCFO / pricing policy | **REUSE** | No hard-coded UI prices |
| Mock/demo finance dollars | **DEFER / FORBIDDEN** | Never silently fall back |
| Live QBO Production | **DEFER** | CFO-003 owner gate |
| Live Plaid Production | **DEFER** | Owner gate |
| Automated journal entries / payments | **DEFER** | Out of Sprint 7 |
| New Finance SPA shell | **AVOIDED** | Explicitly not built |

## Duplicates avoided

- No second Finance SPA
- No second QBO integration
- No second bank-data platform
- No second Capital readiness calculator
- No second Financial Package agent
- HVCG invoice reconciliation kept separate from client AR/AP
