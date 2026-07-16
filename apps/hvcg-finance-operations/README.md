# HVCG Finance Operations (Sprint 1)

Mock financial operating system for ownership and accounting.

## Run locally

```bash
cd apps/hvcg-finance-operations
npm install
npm run dev        # http://127.0.0.1:5175
npm run qa:all     # build + unit + Playwright QA + screenshots
```

## Guardrails

- Mock / demo data only
- No live Stripe, QuickBooks, Mercury, Square, Power BI, or bank credentials
- Does not modify Revenue OS, Client Portal, Executive Command Center, CRM schema, Activation Framework, Track 1, or Production
