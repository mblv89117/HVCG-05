# HANDOFF — Finance Operations

**Agent:** `finance`  
**Branch:** `cursor/finance-operations`  
**Worktree:** `.worktrees/finance-operations`  
**Packaging:** Option A — exclusive docs + list stubs + Power Apps stubs + offline tests  
**Status:** **READY FOR INTEGRATION**

## Deliverables

| Deliverable | Path |
|-------------|------|
| Architecture / Requirements / Data map | `docs/finance/` |
| Shared merge recommendations (index append) | `docs/finance/SHARED_FILE_RECOMMENDATIONS.md` |
| Owner gates (later) | `docs/finance/OWNER_ACTION_GUIDE.md` |
| Exclusive list stubs | `HVCG_FinanceARSnapshots`, `HVCG_FinanceCashReceipts`, `HVCG_FinancePaymentPlans` (+ `HVCG_FinanceEXCLUSIVE_README.md`) |
| Power Apps stubs | `src/power-apps/finance/` (`scrFinance*`, `BUILD.md`, `FinanceNamedFormulas.fx`) |
| Module status | `PROJECT_STATUS.md` → **READY FOR INTEGRATION** |
| Resume cue | `NEXT_SESSION.md` |
| Offline smoke | `tests/unit/test_finance_operations.py`, `tests/finance/test_finance_package.py` |

## What was NOT duplicated

Invoices / Collections / Budgets / Expenses already exist as shared SoR lists — stubs were **not** recreated as `HVCG_FinanceInvoices` etc.

## Index policy (ownership redesign)

Finance agent **does not** edit `lists/_index.json`. Exact parent append-only rows for the three exclusive lists are documented in `SHARED_FILE_RECOMMENDATIONS.md`. Merge can proceed without waiting for index edits from this branch.

## Offline validation

```bash
cd ".worktrees/finance-operations"
python3 tests/unit/test_finance_operations.py
# or: python3 tests/finance/test_finance_package.py
```

Expected: `PASS finance operations package checks`.

## Intentionally not touched

- `deployment/**` engines  
- Authentication / environment secrets  
- CRM flows and active Maker OA packages  
- Locked shared indexes (`flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`, `NamedFormulas.fx`)  
- Existing non-`HVCG_Finance*` list schema bodies  
- Production  

## Parent / integration next steps

1. Offline PASS confirmed on this branch.  
2. Apply append-only items in `SHARED_FILE_RECOMMENDATIONS.md` (especially the three `lists/_index.json` entries + predeploy test hook + formula comment).  
3. Merge `cursor/finance-operations` when Master PM schedules.  
4. Owner Maker later: OA-FIN gates (not required for this handoff).

## Resume cue

Package is READY FOR INTEGRATION. Integration owns index append + merge packet.
