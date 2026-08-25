# Screen: Executive / CEO Command Center (scrHomeExec)

**App:** HVCG OS Command Center  
**Audience:** Owner (Manny)

## Purpose

Single pane for running the firm — strategy, revenue, capital, risk — **not** routine ops noise.

## Layout (desktop)

### Row A — North star KPIs (tiles)

| Tile | Source concept |
|------|----------------|
| Pipeline $ | Opportunities WeightedValue (Open) |
| MRR | Sum MonthlyRetainer Active Clients |
| Retainers past due | Invoices/FinancialMilestones past due retainers |
| Revenue forecast (weighted) | RevenueForecastLines |
| Cash collected (MTD/YTD) | Invoices AmountCollected |
| Outstanding payments | Invoices AR |
| Capital pipeline $ | CapitalOpportunities WeightedValue |
| Projects Red/Yellow | Projects health |

### Row B — Operating pulse

- Team capacity / utilization (TeamMembers + TimeEntries)  
- Client health distribution  
- Business KPIs strip (win rate 90d, avg sales cycle, doc collection SLA — BI or computed)

### Row C — My work (personal)

- **My task queue** — Tasks where OwnerEmail = me OR ApproverEmail = me  
- **Approvals waiting** — Approvals + ExpenseApprovals + Deliverables RequiresExecutiveApproval  
- **Critical decisions** — Decisions RequiresExecutiveAttention  
- **Major risks** — Risks High/Critical open  
- **Upcoming meetings** — next 14 days where I’m attendee/owner  

### Row D — Capital & relationships

- Capital opportunities by FundingStatus  
- Referral pipeline (Referrals Received/Qualified)  
- Proposals Sent awaiting decision  

## Explicit exclusions

Do not show low-priority overdue chores, raw AI drafts, or routine document reminders.

## Navigation

Deep links into Client, Capital Opportunity, Proposal, Invoice, Decision detail screens.

## Mobile

KPI strip horizontal scroll; My work gallery first.
