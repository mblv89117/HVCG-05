# Exclusive Finance list stubs (not indexed yet)

These `HVCG_Finance*` JSON files are **module-exclusive** stubs on `cursor/finance-operations`.

| Stub | Purpose | Why net-new |
|------|---------|-------------|
| `HVCG_FinanceARSnapshots.json` | Point-in-time AR aging | No existing aging snapshot list |
| `HVCG_FinanceCashReceipts.json` | Payment applications / cash collected rows | Invoices track balance only |
| `HVCG_FinancePaymentPlans.json` | Structured collection plans | CollectionsActivities is activity log only |

## Intentionally NOT duplicated

Existing shared lists remain SoR (do not create parallel `HVCG_FinanceInvoices` etc.):

- `HVCG_Invoices`
- `HVCG_CollectionsActivities`
- `HVCG_Budgets`
- `HVCG_ExpenseApprovals`
- `HVCG_FinancialMilestones`
- `HVCG_RevenueForecastLines`

## Parent integrator

Append these three titles to `src/sharepoint/lists/_index.json` (locked — Finance agent does not edit). See `docs/finance/SHARED_FILE_RECOMMENDATIONS.md`.
