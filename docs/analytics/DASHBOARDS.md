# Atlas Analytics Dashboards

**Goal:** Help users decide — not decorate. One primary visual per question.

## 1. Executive Dashboard (home)

**Surface:** `scrHomeExec` + optional BI embed  
**Components:** `cmpExecKpiTile`, `cmpExecMetricMeta`, `cmpExecHealthStrip`, `cmpExecTrendSpark` (specs under `src/power-apps/executive/components/`)

| Region | Metrics | Visual |
|--------|---------|--------|
| North-star | M-002, M-017, M-019, M-018, M-013, M-007, M-010 at-risk $ | KPI tiles |
| Pulse | M-006, M-008, M-012 (critical), M-021 | Health strip + % tiles |
| Capital / EV | M-013, M-011, M-014 status | $ + progress |
| Reliability | M-016 (7d), M-015 (7d) | Small counts |
| Queues | Decisions, approvals waiting, risks | Lists only |

**Filters:** Cash period MTD/YTD; ClientCode (Owner all).  
**Footer:** Source = SharePoint Command Center; Last refresh = Now() / BI as-of.

## 2. Revenue

| Question | Metric | Visual |
|----------|--------|--------|
| Are we collecting more? | M-001 | Line (T12M) |
| What can convert? | M-002 + Commit | KPI + stage bars |
| Are we winning? | M-003 | % KPI |
| Engagement book | M-004 | KPI + table |

## 3. Clients

| Question | Metric | Visual |
|----------|--------|--------|
| Who is unhealthy? | M-006 | G/Y/R strip → Red list |
| Concentration risk? | M-005 | Top-5 bar + Top-3 % |

## 4. Projects & tasks

| Question | Metric | Visual |
|----------|--------|--------|
| Delivery at risk? | M-007 | Count + list |
| Execution drag? | M-008 | % (High/Critical filter) |

## 5. Operations

| Question | Metric | Visual |
|----------|--------|--------|
| Approvals slow? | M-009 | Median days |
| Docs ready? | M-012 | % |
| Automations healthy? | M-016 | Fail count + top flows |
| People using Atlas? | M-015 | Distinct users |

## 6. Capital advisory & document readiness

| Question | Metric | Visual |
|----------|--------|--------|
| Financing book $ | M-013 | KPI + status stack |
| Ready to raise? | M-011 + M-012 (capital-linked) | Progress table |

## 7. Enterprise value

| Question | Metric | Visual |
|----------|--------|--------|
| Assessment progress | M-014 | Status counts |
| Verified midpoint | M-014 verified only | $ with disclaimer |

## 8. Finance

| Question | Metric | Visual |
|----------|--------|--------|
| AR / cash | M-018, M-019 | KPI |
| Milestone risk | M-010 | % + $ |

## 9. Team workload

| Question | Metric | Visual |
|----------|--------|--------|
| Utilization | M-021 | % |
| Overdue load | M-008 by OwnerEmail | Bar |

## Noise policy

Exclude: AI draft queues, routine doc nag lists on Executive home, automation success spam, fabricated history charts.
