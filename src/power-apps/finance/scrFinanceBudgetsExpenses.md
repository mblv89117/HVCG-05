# Screen Spec — scrFinanceBudgetsExpenses

**Module:** Finance Operations  
**Audience:** Finance viewers / Ops Manager / approvers

## Purpose

Budget health and expense approval queue.

## Data

| Collection | Source |
|------------|--------|
| `colFinBudgets` | `HVCG_Budgets` |
| `colFinPendingExpenses` | `HVCG_ExpenseApprovals` where Pending |
| `colFinRecentApproved` | Approved last 30 days |

## Layout

1. Budget gallery (Approved vs Used, Status On Track/Watch/Over)  
2. Pending expenses with Approve / Reject  
3. Rule: if IsClientBillable and ReceiptLink blank → block Approve (app validation)

## Actions
- Approve / Reject expense  
- Navigate to client detail (non-fee fields)
