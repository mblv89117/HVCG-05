# Shared file recommendations (do not apply on this branch)

Finance Operations owns exclusive paths under `docs/finance/`, `tests/finance/`, and `tests/unit/test_finance_operations.py`.

When integrating, a **parent merge agent** may apply the following. This branch does **not** modify locked shared indexes or CRM / deployment engines.

| Shared file | Recommendation |
|-------------|----------------|
| `src/power-apps/README.md` | Confirm `scrFinance` row links to `docs/finance/ARCHITECTURE.md` + future exclusive build sheet (when authored). |
| `src/power-apps/screens/scrClientDetail.md` | Keep Finance section visibility gated by `nfIsFinanceViewer` (already specified); no schema change. |
| `src/power-apps/formulas/NamedFormulas.fx` | Later: append finance helpers (`nfFinanceOutstandingAR`, `nfFinancePastDueCount`) from an exclusive `FinanceNamedFormulas.fx` when authored — **parent append only**. |
| `src/sharepoint/views/command-center-views.json` | Later: parent-merge finance views (Open AR, Past Due Milestones, Pending Expenses) from an exclusive `finance-views.json` when authored. Prefer dual-file provision over editing in place during agent sprints. |
| `src/sharepoint/lists/_index.json` | **Do not edit from Finance agent.** Existing Finance lists are already indexed. |
| `src/power-automate/flows/_index.json` | Later parent-append past-due / renewal flow keys only after exclusive flow package exists and CRM Maker freeze lifts. |
| `tests/Invoke-HVCGPreDeploymentTests.ps1` | Append-only: invoke `python3 tests/unit/test_finance_operations.py`. |
| `ARCHITECTURE.md` (root) / `DATA_DICTIONARY.md` | Link `docs/finance/` as Finance Ops capability docs. |
| `TEST_PLAN.md` § TS-FIN | Keep TC-F01/F02; point evidence path to Finance HANDOFF when live. |

## Do not touch (explicit)

- `deployment/**` install / upgrade / rollback engines  
- Auth / PnP / `.env*`  
- Production environment configs  
- CRM flows `HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*` and active Maker OA packages  
- Locked indexes: `flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`, `NamedFormulas.fx` (from this agent)  
- Existing Finance list JSON bodies (unless Master PM opens a schema change ticket)

## Cross-branch overlap notes

| Overlap | Recommendation |
|---------|----------------|
| Executive AR / MRR tiles | Executive **reads** Finance lists; Finance owns operational entry UX/docs. |
| Operations Subscriptions / RecurringExpenses | Ops Hub owns list schema; Finance may recommend read-only views later. |
| Capital FundingMilestones | Capital-owned; naming must stay distinct from FinancialMilestones. |
| Client fee fields on `HVCG_Clients` | CRM/platform; Finance surfaces them in Finance apps only. |
