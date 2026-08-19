# Permission Review — Finance Intelligence Sprint 1

## Roles

| Role | Access |
|------|--------|
| Owner | Full |
| Executive | Full |
| Finance | Full |
| Advisor | overview, trends, workspaces, capital, enterprise-value, alerts, ai |
| Assistant | overview, workspaces, alerts |

## Controls

- Route-level `Protected` redirects unauthorized roles to Overview
- KPI `allowedRoles` filters scorecards
- Alert / AI observation `allowedRoles` filters queues
- Organization switcher scopes HVCG vs CCB vs client aggregate

## Findings

- Demo role switcher is intentional (not Entra) for Sprint 1 offline QA
- Assistant cannot open cash, budget, forecast, EV, AI, or governance routes
- CCB incomplete financials remain visible to authorized roles as labeled shells (no dollars)

**Review status:** PASS for Sprint 1 product demo permissions
