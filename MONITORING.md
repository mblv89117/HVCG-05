# MONITORING — HVCG OS

## Signal sources

| Signal | Source |
|--------|--------|
| Deployment / upgrade failures | deployment/reports + OperationalAlerts |
| Power Automate failures | AutomationLogs Status=Failed; repeated failures |
| Stale workflows | Jobs/Tasks with no update beyond SLA |
| Provisioning failures | Deploy report errors |
| Permission drift | Compare backup permissions vs live |
| External sharing changes | Site SharingCapability checks |
| Onboarding failures | Clients Active without library/project |
| Duplicates | HVCG_IdempotencyKey collisions |
| Missing metadata | Required fields empty on Active clients |
| Orphaned lookups | Children with blank ClientCode / missing parent |
| Doc deadlines | Critical DocumentRequests overdue |
| Stalled projects | No task activity 14d |
| AI failures / awaiting review / cost | AIJobs, AICostTracking, OperationalAlerts |
| Backup / upgrade / health failures | Scripts + alerts |

## Cadence

- **Daily:** `Invoke-HVCGOSOperationalHealth.ps1`  
- **Weekly:** Backup Full + permissions drift  
- **On deploy:** Health + post-deploy  

## Alerting

Write `HVCG_OperationalAlerts` rows; email Ops for Critical; escalate to Owner only per executive rules.
