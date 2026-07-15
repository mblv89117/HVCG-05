// Finance Operations — exclusive Named Formulas (paste into app or parent-append)
// Do NOT edit shared NamedFormulas.fx from cursor/finance-operations.

// Visibility
// nfIsFinanceViewer — if already defined in shared formulas, reuse; else:
// nfIsFinanceViewer = User().Email in HVCG_OwnerEmails || LookUp(...).PrimaryRole in ["Owner","Admin","Operations Manager"]

// Outstanding AR from open invoices
nfFinanceOutstandingAR = Sum(
    Filter(
        HVCG_Invoices,
        InvoiceStatus in ["Sent", "Partial", "Past Due"]
    ),
    Amount - Coalesce(AmountCollected, 0)
);

nfFinancePastDueCount = CountRows(
    Filter(HVCG_Invoices, InvoiceStatus = "Past Due")
) + CountRows(
    Filter(HVCG_FinancialMilestones, IsPastDue = true)
);

nfFinancePendingExpenseCount = CountRows(
    Filter(HVCG_ExpenseApprovals, ApprovalStatus = "Pending")
);

// Cash MTD from exclusive receipts stub (0 until list provisioned)
nfFinanceCashCollectedMTD = Sum(
    Filter(
        HVCG_FinanceCashReceipts,
        ReceiptDate >= Date(Year(Today()), Month(Today()), 1)
    ),
    AmountReceived
);
