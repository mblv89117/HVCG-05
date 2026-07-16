# Finance Operations Sprint 1 — Architecture

**Branch:** `cursor/finance-operations-sprint1`  
**App:** `apps/hvcg-finance-operations/`  
**Stack:** Vite 7 + React 19 + TypeScript + react-router-dom  
**Data mode:** Explicit mock store only

## Purpose

Provide ownership and accounting a single mock financial OS covering revenue, AR/collections, retainers, proposal pricing models, cash forecast, and KPI rollups — without becoming a GL or connecting live banks.

## Layering

```
UI pages (Overview / Revenue / AR / Retainers / Pricing / Cash / KPIs)
        ↓
Reusable components (RevenueCard, FinancialWidget, charts, tables)
        ↓
Pure engines (invoice, billing, pricing, forecast, collections)
        ↓
mockStore + mockIntegrations  (replaceable adapters later)
```

## Reusable engines

| Engine | Path | Responsibility |
|--------|------|----------------|
| Invoice | `src/engines/financeEngines.ts` | Balance, aging buckets, outstanding rollup |
| Billing | same | MRR / ARR from active retainers |
| Pricing | same | Model engagement pricing by service line |
| Forecast | same | Weighted forecast by category |
| Collections | same | Priority score helpers |

## Pages / routes

| Route | Module |
|-------|--------|
| `/` | Finance overview + collections + integration status |
| `/revenue` | Revenue dashboard + forecast |
| `/ar` | AR aging + outstanding + collections queue |
| `/retainers` | Clients, billing cycles, renewals |
| `/pricing` | Proposal pricing modeler |
| `/cash` | Cash position and forecast |
| `/kpis` | Financial KPI board |

## Roles

| Role | Access |
|------|--------|
| Owner / Finance | All routes |
| Advisor | Overview, Revenue, Retainers, Pricing, KPIs |
| Assistant | Overview, Retainers |

## Mock integrations

Stripe, QuickBooks, Mercury, Square, Power BI, Microsoft Lists — catalogued in `src/integrations/mockIntegrations.ts` with statuses `Mocked` | `ConfigOnly` | `Disabled`. No API keys.

## Boundaries

- Does not modify Revenue OS, Client Portal, ECC, Activation Framework, CRM schema, Track 1, or Production  
- Operational finance ≠ GL; QuickBooks remains id-mirror only  

## Future adapters

Replace `mockStore` with SharePoint / Dataverse adapters without changing page contracts (`FinanceStore` in `types.ts`).
