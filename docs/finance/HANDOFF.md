# HANDOFF — Finance Operations

**Agent:** `finance`  
**Branch:** `cursor/finance-operations`  
**Worktree:** `.worktrees/finance-operations`  
**Packaging:** Option A — exclusive docs + list stubs + Power Apps stubs + offline tests  
**Status:** **IN PROGRESS** — WO2 package complete offline; not yet declaring READY FOR INTEGRATION (parent index append + Master PM go-ahead still needed)

## Deliverables

| Deliverable | Path |
|-------------|------|
| Architecture / Requirements / Data map | `docs/finance/` |
| Shared merge recommendations | `docs/finance/SHARED_FILE_RECOMMENDATIONS.md` |
| Owner gates (later) | `docs/finance/OWNER_ACTION_GUIDE.md` |
| Exclusive list stubs | `HVCG_FinanceARSnapshots`, `HVCG_FinanceCashReceipts`, `HVCG_FinancePaymentPlans` (+ `HVCG_FinanceEXCLUSIVE_README.md`) |
| Power Apps stubs | `src/power-apps/finance/` (`scrFinance*`, `BUILD.md`, `FinanceNamedFormulas.fx`) |
| Module status | `PROJECT_STATUS.md` (Finance) |
| Resume cue | `NEXT_SESSION.md` |
| Offline smoke | `tests/unit/test_finance_operations.py`, `tests/finance/test_finance_package.py` |

## What was NOT duplicated

Invoices / Collections / Budgets / Expenses already exist as shared SoR lists — stubs were **not** recreated as `HVCG_FinanceInvoices` etc.

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

## Parent integrator next steps

1. Offline PASS on this branch.  
2. Append three exclusive lists to `lists/_index.json` per `SHARED_FILE_RECOMMENDATIONS.md`.  
3. Append formula comment / tokens from `FinanceNamedFormulas.fx`; link README `scrFinance` → `src/power-apps/finance/BUILD.md`.  
4. After append + review → status can move to **READY FOR INTEGRATION**.  
5. Owner Maker later: OA-FIN gates (not this sprint).

## Resume cue

Ready for parent index append review. Optional next: exclusive `finance-views.json` still without editing locked view index.
