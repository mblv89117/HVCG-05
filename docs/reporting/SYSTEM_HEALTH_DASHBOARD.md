# System Health Dashboard — Power BI Spec (HVCG OS)

## Dataset

`HVCG_OS_SystemHealth`

### Sources

| Table | List / file |
|-------|-------------|
| FactAutomationLog | HVCG_AutomationLogs |
| FactOperationalAlert | HVCG_OperationalAlerts |
| FactAIJob | HVCG_AIJobs |
| FactAICost | HVCG_AICostTracking |
| DimSystemInfo | HVCG_SystemInfo |
| FactHealthReport | Import JSON from `deployment/reports/health/*.json` (folder connector or manual) |
| DimEnvironment | development/test/production |
| DimVersion | version.json / SystemInfo |

## Pages

1. **Overall** — traffic light from LastHealthStatus; open Critical alerts  
2. **Deployment** — upgrade failures, version vs package  
3. **Automation** — failed flows rate; repeated failures  
4. **Backup** — last backup age (from HealthReport)  
5. **Data quality** — missing ClientCode, orphan warnings  
6. **Security** — sharing capability, permission drift flags  
7. **AI operations** — awaiting review, failed jobs, cost MTD  
8. **Failed jobs** — AI + automation detail  
9. **Stalled workflows** — alerts StalledProject / StaleWorkflow  
10. **Environment comparison** — Dev/Test/Prod versions  
11. **Version status** — InstalledVersion timeline  
12. **Incidents** — open OperationalAlerts  

## DAX (core)

```dax
Open Critical Alerts = CALCULATE(COUNTROWS(FactOperationalAlert), FactOperationalAlert[Severity]="Critical", FactOperationalAlert[AlertStatus]="Open")
AI Awaiting Review = CALCULATE(COUNTROWS(FactAIJob), FactAIJob[JobStatus]="AwaitingReview")
AI Failed = CALCULATE(COUNTROWS(FactAIJob), FactAIJob[JobStatus]="Failed")
Automation Failures = CALCULATE(COUNTROWS(FactAutomationLog), FactAutomationLog[Status]="Failed")
AI Cost MTD = CALCULATE(SUM(FactAICost[ActualCost]), FactAICost[BillingMonth]=FORMAT(TODAY(),"YYYY-MM"))
System Healthy Flag = IF(SELECTEDVALUE(DimSystemInfo[LastHealthStatus])="Healthy",1,0)
```

## Layout

KPI row → alert table → AI/automation split visuals → environment matrix.

## Refresh

Daily after operational health script; Import mode.

## RLS

Owner sees all; Ops sees non-Restricted AI cost optional; hide ClientCode details from contractors.

## Alert thresholds

| Metric | Warn | Critical |
|--------|------|----------|
| Open Critical alerts | ≥1 | ≥1 (page red) |
| AI awaiting review | >20 | >50 |
| Automation fails (rolling 24h) | >5 | >20 |
| Backup age | >48h | >7d |
| Version skew vs package | minor | major mismatch in prod |
