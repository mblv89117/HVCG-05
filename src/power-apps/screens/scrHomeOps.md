# Screen: Operations Home (scrHomeOps)

## Layout

- Header: “HVCG Command Center” + user name + date  
- Responsive gallery of metric tiles (2 cols phone / 4 cols desktop)  
- Below: “Needs attention today” gallery (overdue + blocked + critical docs)

## Tiles (OnSelect → filtered screen)

| Tile | Items formula (concept) |
|------|-------------------------|
| Overdue tasks | CountRows(nfOverdueTasks) |
| Critical missing docs | CountRows(nfMissingCriticalDocs) |
| In review deliverables | Filter DeliverableStatus in Internal Review, Client Review |
| Kickoffs this week | Meetings next 7 days |
| Past due payments | FinancialMilestones IsPastDue (if nfIsFinanceViewer) |
| Yellow/Red projects | ProjectHealth in Yellow, Red |
| Automations failed/degraded | CountRows(Filter(HVCG_AutomationRegistry, FailureState in ["Failed","Degraded"])) → scrAutomationCenter |

## Controls

- btnQuickClient → scrQuickCreate mode Client  
- btnQuickTask → scrQuickCreate mode Task  
- btnExecSwitch visible if nfIsExecutive  
- btnAutomationCenter → scrAutomationCenter (Admin/Ops; PM read-only)  

## Mobile

Stack tiles vertically; hide finance tile if not viewer.
