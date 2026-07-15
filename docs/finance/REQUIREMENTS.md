# Finance Operations — Requirements

**Module:** Finance Operations  
**Branch:** `cursor/finance-operations`  
**Traces to:** Root `REQUIREMENTS.md` § FR-FIN, TEST_PLAN § TS-FIN, SECURITY_MODEL finance visibility

## 1. Business outcomes

| Outcome | Measure |
|---------|---------|
| Know what cash is expected | Open milestones + invoices with due dates |
| Know what is late | `IsPastDue` / InvoiceStatus `Past Due` / collections status |
| Protect margin | Budgets + expense approvals before discretionary spend |
| Feed executive forecast | RevenueForecastLines + weighted milestones |
| Stay out of GL | No chart-of-accounts; optional `ExternalAccountingId` only |

## 2. Personas

| Persona | Needs |
|---------|-------|
| Owner (Manny) | Past-due / revenue-at-risk exceptions; approve material write-offs |
| Ops Manager | Enter invoices / milestones; chase collections; approve routine expenses |
| Finance viewer | Read amounts; export for accounting bridge |
| PM / Analyst | See milestone dates relevant to delivery; **not** unrestricted fee editing |
| Executive Command Center | Consume AR / MRR / forecast aggregates (read-only) |

## 3. Functional requirements

### FR-FIN-OPS-01 Financial milestones
- Track retainer, setup, success-fee, renewal, and related milestone types.  
- Support payment status, probability / weighted value, invoice linkage, budget linkage.  
- Flags: `IsPastDue`, `RevenueAtRisk`, `WorkContinuingWithoutPayment`, retainer/success-fee booleans.  
- Collections status ladder: None → Reminder1 → Reminder2 → FinalNotice → Collections → Resolved.

### FR-FIN-OPS-02 Invoices
- Draft → Sent → Partial → Paid / Past Due / Void.  
- Types: Retainer, Setup, Success Fee, Expense, Other.  
- Capture Amount, AmountCollected, DueDate, FileLink, Notes, idempotency key.  
- Optional `ExternalAccountingId` for future QuickBooks sync (out of scope to implement now).

### FR-FIN-OPS-03 Collections
- Log activities against InvoiceId (Reminder, Call, Email, Payment Plan, Escalation, WriteOff).  
- NextActionDate for follow-up queues.  
- `RequiresExecutiveAttention` for material escalations (feeds Executive module).

### FR-FIN-OPS-04 Budgets & expenses
- Per-client / engagement ApprovedBudget vs BudgetUsed; discretionary limits.  
- ExpenseApprovals with Pending / Approved / Rejected; billable vs discretionary flags.  
- Receipt link required before Approved for client-billable spend (process rule; enforce in app later).

### FR-FIN-OPS-05 Revenue forecast
- Monthly lines linked to Client / Opportunity / CapitalOpportunity.  
- RevenueType + ForecastCategory (Pipeline / Best Case / Commit / Closed).  
- WeightedAmount for executive commit views.

### FR-FIN-OPS-06 Alerts & automation (scaffold later)
- TC-F01: Nightly past-due flag on open milestones / invoices.  
- TC-F02: Renewal window tasks at 60 / 30 / 14 days.  
- Do not enable live flows until owner gates in `OWNER_ACTION_GUIDE.md`.

### FR-FIN-OPS-07 Security
- Amount fields hidden from Analyst / contractor roles in canvas.  
- Client isolation by ClientCode membership (same OS pattern).  
- No secrets in finance docs or bus messages.

## 4. Non-goals (V1 Finance Ops package)

- Full GL / AP / payroll  
- Automated QuickBooks sync  
- Client-facing invoices portal (Portal V2)  
- Editing shared indexes or CRM Maker packages from this branch  
- Production promote

## 5. Acceptance criteria (package level)

| ID | Criteria | Status |
|----|----------|--------|
| AC-FIN-DOC-01 | Exclusive docs under `docs/finance/` complete | Done this sprint |
| AC-FIN-DOC-02 | DATA_MAP documents existing Finance lists without mutating schemas | Done this sprint |
| AC-FIN-TST-01 | Offline smoke `tests/unit/test_finance_operations.py` PASS | Done this sprint |
| AC-FIN-APP-01 | Maker `scrFinance` rebuild | Deferred — owner gate |
| AC-FIN-FLOW-01 | Past-due / renewal flows Off on Dev | Deferred — owner gate |
| AC-FIN-LIVE-01 | Live Dev smoke with demo amounts only | Deferred — after parent merge + Maker |

## 6. Dependencies

| Dependency | Owner |
|------------|-------|
| SharePoint Dev baseline lists present | Platform / prior schema deploy |
| CRM Opportunities for forecast lines | CRM module (read) |
| Executive AR/MRR tiles | Executive module (read) |
| Parent merge of recommendations | Integration / Master PM |
