# Finance Intelligence Sprint 1 — Architecture

**App:** `apps/hvcg-finance-intelligence/`  
**Branch:** `cursor/finance-intelligence-sprint1`  
**Stack:** Vite 7 + React 19 + TypeScript + react-router-dom

## Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| KPI catalog | `src/data/kpiCatalog.ts` | Every KPI: value, period, prior, trend, source, refresh, status, drill-down, quality |
| Verified sources | `src/data/verifiedSources.ts` | Atlas / Finance Ops / CCB relationship sources |
| Finance store | `src/data/financeStore.ts` | Aging, debt, BvA, forecast, scenarios, EV, alerts, AI, audit |
| Engines | `src/engines/financeIntelligence.ts` | WC, runway, variance, incomplete share |
| UI | `src/components/FinanceUI.tsx` | KPI cards, alerts, source tables |
| Permissions | `src/types.ts` `roleAccess` | Role × route matrix |

## Organizations

- **HVCG** — Mock demo figures derived from Finance Operations Sprint 1 mock store
- **CCB** — Structure + mappings; KPIs show Awaiting verified data / Data connection pending / Not yet calculated
- **CLIENT_WORKSPACE** — Aggregate shell pending per-client bind

## Enterprise value

Indicative-only models with assumptions, drivers, detractors, risk adjustments, initiatives, targets, and scenario comparison. CCB publishes no dollar estimate.

## Integrations (mock / config-only)

Stripe · QuickBooks (id mirror) · Mercury · documented in source catalog — no live credentials.

## Non-goals

Does not modify Revenue OS, Client Portal, ECC, Activation Framework, CRM schema, Track 1, or Production.
