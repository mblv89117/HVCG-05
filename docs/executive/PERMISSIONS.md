# Executive Command Center — Permissions Model

## Entra / SharePoint

| Role group | ECC home | Finance KPIs | Decision queue | PBI CEO app |
|------------|----------|--------------|----------------|-------------|
| Owner | Full | Full | Full | Full |
| Administrator | Full | Full | Full | Full |
| OperationsManager | Read home (optional) | Full | Read | Optional |
| ProjectManager | No (redirect Ops) | No | No | No |
| CapitalAdvisor | No default | No | Capital attention only via Capital screen | Capital pages only if granted |
| FinancialAnalyst | No default | Yes if granted finance viewer | No | Optional finance pages |
| OperationsAssistant | No | No | No | No |
| Contractor / Guest | **Denied** | **Denied** | **Denied** | **Denied** |

App-level: `nfShowExecFullHome` (Owner) and `nfShowExecFinanceTiles` (`nfIsFinanceViewer`).

## Field sensitivity

Hide unless Owner/Admin/OpsMgr finance viewer:

- MonthlyRetainer, Invoice Amount / AmountCollected, ExpenseApprovals amounts  
- Success fee / RevenueAtRisk  
- InternalNotes on Clients  

## Escalation write rights

Only OpsMgr+ may set `RequiresExecutiveAttention = true` in normal process; Owner may clear after decision. Documented in `SOP_Executive_Escalation.md`.

## Isolation

ECC module adds **no** new SharePoint permission sets. Uses existing `HVCG-Role-*` groups from `PERMISSIONS_MATRIX.md`.
