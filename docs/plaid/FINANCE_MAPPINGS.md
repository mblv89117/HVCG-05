# Finance Intelligence — Plaid Mappings

## Provenance labels (required)

| Label | When |
|-------|------|
| **Verified bank data** | Balances/transactions from Plaid sync (`provenance: VerifiedBank`) |
| **Client-entered data** | Manual portal forms |
| **Imported accounting data** | Future QuickBooks/Xero |
| **Estimated / derived** | Runway formulas, categorization heuristics |

Never display estimated values with a Verified badge.

## KPI mapping

| Atlas KPI | Source | Notes |
|-----------|--------|-------|
| Cash balance | Sum `FinancialAccount.currentBalance` | VerifiedBank |
| Available cash | Sum available balances | Nullable |
| Cash-flow trends | `BankTransaction` by date | Inflows vs outflows |
| Recurring obligations | Liabilities + recurring tx heuristics | Mark derived if heuristic |
| Debt visibility | `Liability` records | VerifiedBank when present |
| Account concentration | Balance share by institution | Derived from verified |
| Cash runway | Cash / burn | **Estimated** — label clearly |
| Executive Dashboard cash widget | `GET /api/plaid/cash-snapshot` | Only when provenance=VerifiedBank |

## API for consumers

```
GET /api/plaid/cash-snapshot?clientId=&clientCode=
```

Returns `provenance: "VerifiedBank"` or `{ provenance: "Unavailable", reason }`.
