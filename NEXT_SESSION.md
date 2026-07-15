# Next Session — Finance Operations

**Generated:** 2026-07-15 (~15:40 PT)  
**Mode:** Finance Ops **IN PROGRESS** — WO2 stubs + screens done; awaiting parent index append for READY FOR INTEGRATION

## Current project status

- **Branch / worktree:** `cursor/finance-operations` / `.worktrees/finance-operations`  
- **Exclusive lists:** `HVCG_FinanceARSnapshots`, `HVCG_FinanceCashReceipts`, `HVCG_FinancePaymentPlans`  
- **Apps:** `src/power-apps/finance/` (4 screens + BUILD + formulas)  
- **SoR unchanged:** Invoices, Collections, Budgets, ExpenseApprovals (no duplicates)

## Do next

1. Re-run: `python3 tests/unit/test_finance_operations.py`  
2. When Master PM / integration asks: confirm READY FOR INTEGRATION only after parent `_index.json` append plan is accepted.  
3. Optional: `src/sharepoint/views/finance-views.json` exclusive (still no locked view edits).

## Do not

- Edit locked indexes or deployment engines  
- Interrupt CRM Maker OA  
- Push / merge / Production / secrets in bus
