# Screen Spec — scrFinance (Financial Ops hub)

**Module path:** `src/power-apps/finance/scrFinance.md` (canonical exclusive stub)  
**Shared map:** `src/power-apps/README.md` lists `scrFinance` — do not overwrite shared files from this branch.  
**Audience:** Owner / Ops Manager / finance viewers

## Purpose

Daily operational finance surface: open AR, past-due milestones, pending expenses, forecast glance, AR snapshot trend.

## Data connections

| Collection | Source |
|------------|--------|
| `colFinOpenAR` | `HVCG_Invoices` where Status in Sent, Partial, Past Due |
| `colFinPastDueMilestones` | `HVCG_FinancialMilestones` where IsPastDue = true |
| `colFinPendingExpenses` | `HVCG_ExpenseApprovals` where ApprovalStatus = Pending |
| `colFinCommitForecast` | `HVCG_RevenueForecastLines` where ForecastCategory = Commit |
| `colFinARSnapshots` | `HVCG_FinanceARSnapshots` latest Firm/Client rows (after provision) |

## Layout

### Header
- Title: **Financial Ops**  
- KPI strip: Outstanding AR (`nfFinanceOutstandingAR`), Past-due count, Pending expenses, Cash MTD (`nfFinanceCashCollectedMTD`)

### Body (tabs or stacked galleries)
1. Open AR gallery → navigate `scrFinanceInvoiceDetail`  
2. Past-due milestones  
3. Pending expense approvals → `scrFinanceBudgetsExpenses`  
4. Collections queue shortcut → `scrFinanceCollections`

### Footer
- Role gate banner if `!nfIsFinanceViewer`

## Actions
- New invoice (form against `HVCG_Invoices`)  
- Record receipt (`HVCG_FinanceCashReceipts`)  
- Open collections
