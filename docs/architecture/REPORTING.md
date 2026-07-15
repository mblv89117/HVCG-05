# REPORTING SPECIFICATIONS

## Approach

**Preferred:** Power BI dataset importing SharePoint Lists.  
**Fallback:** Excel workbook with Power Query (`templates/reports/HVCG_Ops_Workbook_Spec.md`).

## Dataset tables

Clients, Engagements, Projects, Tasks, DocumentRequests, Deliverables, FinancialMilestones, Decisions, Risks, Issues, Meetings, TeamMembers.

Relationships via ClientCode (text) and ID lookups expanded in Power Query.

## Key measures (DAX)

```dax
Active Clients = CALCULATE(DISTINCTCOUNT(Clients[ClientCode]), Clients[IsActive]=TRUE(), Clients[ClientStage]="Active Client")

Overdue Tasks = CALCULATE(COUNTROWS(Tasks), Tasks[IsOverdue]=TRUE())

Critical Missing Docs = CALCULATE(COUNTROWS(DocumentRequests), DocumentRequests[IsCritical]=TRUE(), NOT DocumentRequests[RequestStatus] IN {"Accepted","Waived","Cancelled"})

Pipeline Value = SUM(Opportunities[WeightedValue])

Revenue at Risk = CALCULATE(SUM(FinancialMilestones[Amount]), FinancialMilestones[RevenueAtRisk]=TRUE())

Active Monthly Retainers = CALCULATE(SUM(Clients[MonthlyRetainer]), Clients[ClientStage]="Active Client")

Expected Success Fees = CALCULATE(SUM(FinancialMilestones[Amount]), FinancialMilestones[MilestoneType]="Success Fee Estimated")

Projects Red = CALCULATE(COUNTROWS(Projects), Projects[ProjectHealth]="Red")

Executive Open Items = CALCULATE(COUNTROWS(Decisions), Decisions[RequiresExecutiveAttention]=TRUE(), Decisions[DecisionStatus] IN {"Proposed","Pending Decision"})
```

## Executive Dashboard pages

1. **Overview** — pipeline, retainers, success fees, revenue at risk, health distribution  
2. **Decisions** — open executive items  
3. **Delivery risk** — red/yellow projects, critical overdue, missing critical docs  
4. **Renewals & concentration** — renewals 60 days; top clients by retainer  

## Operations Dashboard pages

1. **Workboard** — tasks by owner, overdue, blocked  
2. **Onboarding & docs** — request status funnel  
3. **Deliverables** — awaiting review  
4. **Meetings & follow-ups**  

## Client-safe view (V1)

Not a Power BI app to clients. Optional **PDF/email snapshot** fields only: progress %, milestones, missing docs list, upcoming meetings. Generated manually or via future flow with approval.

## Deployment

1. Create workspace `HVCG Command Center`  
2. Create dataset from SharePoint  
3. Publish pbix when built in tenant (spec-only in repo if desktop unavailable)  
4. App audience: Owner group for Executive report; Ops groups for Operations report
