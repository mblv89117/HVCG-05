# Screen Spec — scrFinanceInvoiceDetail

**Module:** Finance Operations  
**Audience:** Finance viewers

## Purpose

Single invoice workspace: balance, receipts, collections activities, optional payment plan.

## Data

| Block | Source |
|-------|--------|
| Header | Selected `HVCG_Invoices` row |
| Milestone link | `HVCG_FinancialMilestones` filtered InvoiceId |
| Receipts | `HVCG_FinanceCashReceipts` filtered InvoiceId |
| Activities | `HVCG_CollectionsActivities` filtered InvoiceId |
| Plan | `HVCG_FinancePaymentPlans` filtered InvoiceId (Active/Draft) |

## Layout

1. Invoice header (number, client, status, due, amount, collected, outstanding)  
2. **Record payment** form → creates CashReceipt; Maker rule updates AmountCollected on save (or flow later)  
3. Activities timeline  
4. Payment plan card (if any)  
5. Notes / FileLink

## Actions
- Mark Past Due / Void (status change only; no client email from app)  
- Add collections activity  
- Escalate (`RequiresExecutiveAttention` on activity or plan)
