# Shared file recommendations (do not apply on this branch)

Finance Operations owns exclusive paths under `docs/finance/`, `src/power-apps/finance/`, `tests/finance/`, `tests/unit/test_finance_operations.py`, and exclusive `src/sharepoint/lists/HVCG_Finance*.json` stubs.

**READY FOR INTEGRATION rule (ownership redesign):** Finance agent does **not** edit `lists/_index.json`. Parent / integration appends the exclusive list entries below at merge time.

When integrating, a **parent merge agent** may apply the following. This branch does **not** modify locked shared indexes or CRM / deployment engines.

| Shared file | Recommendation |
|-------------|----------------|
| `src/power-apps/README.md` | Link `scrFinance` to `src/power-apps/finance/BUILD.md` + `docs/finance/ARCHITECTURE.md`. |
| `src/power-apps/screens/scrClientDetail.md` | Keep Finance section visibility gated by `nfIsFinanceViewer` (already specified); no schema change. |
| `src/power-apps/formulas/NamedFormulas.fx` | Append helpers from `src/power-apps/finance/FinanceNamedFormulas.fx` (`nfFinanceOutstandingAR`, `nfFinancePastDueCount`, `nfFinancePendingExpenseCount`, `nfFinanceCashCollectedMTD`) — **parent append only**. |
| `src/sharepoint/views/command-center-views.json` | Later: parent-merge finance views (Open AR, Past Due Milestones, Pending Expenses, AR Snapshots) from an exclusive `finance-views.json` when authored. Prefer dual-file provision. |
| `src/sharepoint/lists/_index.json` | **Parent append-only at integration** — see exact entries below. Finance agent never edits this file. Existing Invoices/Collections/Budgets/Expenses stay as-is — do **not** add duplicate wrappers. |
| `src/power-automate/flows/_index.json` | Later parent-append past-due / renewal flow keys only after exclusive flow package exists and CRM Maker freeze lifts. |
| `tests/Invoke-HVCGPreDeploymentTests.ps1` | Append-only: invoke `python3 tests/unit/test_finance_operations.py`. |
| `ARCHITECTURE.md` (root) / `DATA_DICTIONARY.md` | Link `docs/finance/` as Finance Ops capability docs; note exclusive Finance stubs. |
| `TEST_PLAN.md` § TS-FIN | Keep TC-F01/F02; point evidence path to Finance HANDOFF when live. |

---

## Parent append-only: `src/sharepoint/lists/_index.json`

Append these three objects to the `lists` array **once** (dedupe by `name`). Do not reorder unrelated entries. Do not remove SoR Finance lists.

```json
{
  "name": "HVCG_FinanceARSnapshots",
  "path": "src/sharepoint/lists/HVCG_FinanceARSnapshots.json",
  "columnCount": 14,
  "description": "Finance Ops exclusive — point-in-time AR aging snapshots (not GL)"
}
```

```json
{
  "name": "HVCG_FinanceCashReceipts",
  "path": "src/sharepoint/lists/HVCG_FinanceCashReceipts.json",
  "columnCount": 11,
  "description": "Finance Ops exclusive — cash receipts / payment applications (not GL)"
}
```

```json
{
  "name": "HVCG_FinancePaymentPlans",
  "path": "src/sharepoint/lists/HVCG_FinancePaymentPlans.json",
  "columnCount": 13,
  "description": "Finance Ops exclusive — structured collection payment plans"
}
```

Schema JSON already lives on `cursor/finance-operations` at the paths above (`moduleExclusive: true`). Schema files travel with the branch merge; **only** the index rows are parent-applied.

Reference: `src/sharepoint/lists/HVCG_FinanceEXCLUSIVE_README.md`.

---

## Do not touch (explicit)

- `deployment/**` install / upgrade / rollback engines  
- Auth / PnP / `.env*`  
- Production environment configs  
- CRM flows `HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*` and active Maker OA packages  
- Locked indexes from Finance agent: `flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`, `NamedFormulas.fx`  
- Existing Finance SoR list JSON bodies (`HVCG_Invoices`, etc.) unless Master PM opens a schema change ticket

## Cross-branch overlap notes

| Overlap | Recommendation |
|---------|----------------|
| Executive AR / MRR tiles | Executive **reads** Finance lists; Finance owns operational entry UX/docs. |
| Operations Subscriptions / RecurringExpenses | Ops Hub owns list schema; Finance may recommend read-only views later. |
| Capital FundingMilestones | Capital-owned; naming must stay distinct from FinancialMilestones. |
| Client fee fields on `HVCG_Clients` | CRM/platform; Finance surfaces them in Finance apps only. |
