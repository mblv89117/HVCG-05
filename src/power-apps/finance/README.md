# Finance Operations — Power Apps (exclusive)

**Branch:** `cursor/finance-operations`  
**App:** `HVCG_ProjectCommandCenter_DEV` (Maker rebuild)  
**Role gate:** `nfIsFinanceViewer` / Owner / Ops Manager for amount fields

## Screens (stubs)

| Screen | File | Purpose |
|--------|------|---------|
| scrFinance | `scrFinance.md` | Operational AR / milestones home |
| scrFinanceInvoiceDetail | `scrFinanceInvoiceDetail.md` | Single invoice + receipts + collections |
| scrFinanceCollections | `scrFinanceCollections.md` | Follow-ups + payment plans |
| scrFinanceBudgetsExpenses | `scrFinanceBudgetsExpenses.md` | Budgets + expense approvals |

## Build notes

See `BUILD.md` — Maker paste order, connections, and what **not** to change in shared `NamedFormulas.fx` until parent merge.

## Data

- **Existing (indexed):** Invoices, FinancialMilestones, CollectionsActivities, Budgets, ExpenseApprovals, RevenueForecastLines  
- **Exclusive stubs (pending index append):** `HVCG_FinanceARSnapshots`, `HVCG_FinanceCashReceipts`, `HVCG_FinancePaymentPlans`
