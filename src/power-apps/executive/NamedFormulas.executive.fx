// --- Executive Command Center (exclusive mirror) ---
// Canonical: src/power-apps/formulas/ExecutiveNamedFormulas.fx
// Keep mirrored. Parent integrator appends canonical to NamedFormulas.fx (do not overwrite CRM).

// Executive Command Center — Named Formulas (nfExec*)
// App: HVCG OS Command Center · Screen: scrHomeExec
// Audience: Owner. Guard finance with nfIsOwner when present in NamedFormulas.fx.
// Rule: never invent amounts — blank if Sum has no rows of meaning.

// --- Role ---
// Prefer shared nfIsOwner if already defined; else:
// nfExecIsOwner = User().Email = LookUp(HVCG_TeamMembers, Role = "Owner", Email)

// --- Period ---
// varCashPeriod set on screen: "MTD" | "YTD"
nfExecCashStart =
    If(
        varCashPeriod = "YTD",
        Date(Year(Today()), 1, 1),
        Date(Year(Today()), Month(Today()), 1)
    );

// --- KPI-01 Pipeline $ ---
nfExecPipelineWeighted =
    Sum(
        Filter(HVCG_Opportunities, WinLossStatus = "Open"),
        WeightedValue
    );

// Alias used by NamedFormulas.executive.fx / KPI catalog
nfExecPipelineValue = nfExecPipelineWeighted;

// --- KPI-02 MRR ---
nfExecMRR =
    Sum(
        Filter(
            HVCG_Clients,
            IsActive = true && ClientStage = "Active Client"
        ),
        MonthlyRetainer
    );

// --- KPI-03 Retainers past due $ ---
nfExecRetainerPastDue =
    Sum(
        Filter(
            HVCG_Invoices,
            InvoiceType = "Retainer" && InvoiceStatus = "Past Due"
        ),
        Amount - Coalesce(AmountCollected, 0)
    );

// --- KPI-04 Forecast weighted ---
nfExecForecastWeighted =
    Sum(
        Filter(
            HVCG_RevenueForecastLines,
            ForecastCategory = "Pipeline"
                || ForecastCategory = "Best Case"
                || ForecastCategory = "Commit"
        ),
        WeightedAmount
    );

// --- KPI-05 Cash collected (period) ---
nfExecCashCollected =
    Sum(
        Filter(
            HVCG_Invoices,
            AmountCollected > 0 && InvoiceDate >= nfExecCashStart
        ),
        AmountCollected
    );

// --- KPI-06 Outstanding AR ---
nfExecOutstandingAR =
    Sum(
        Filter(
            HVCG_Invoices,
            InvoiceStatus = "Sent"
                || InvoiceStatus = "Partial"
                || InvoiceStatus = "Past Due"
        ),
        Amount - Coalesce(AmountCollected, 0)
    );

// --- KPI-07 Capital pipeline $ ---
nfExecCapitalPipeline =
    Sum(
        Filter(
            HVCG_CapitalOpportunities,
            FundingStatus <> "Closed" && FundingStatus <> "Declined"
        ),
        Coalesce(WeightedValue, TargetAmount * FundingProbability / 100)
    );

// --- KPI-08 Projects Red/Yellow ---
nfExecProjectsAtRiskCount =
    CountRows(
        Filter(
            HVCG_Projects,
            ProjectHealth = "Red" || ProjectHealth = "Yellow"
        )
    );

// --- KPI-09 / KPI-10 Capacity ---
nfExecUtilizationAvg =
    Average(
        Filter(HVCG_TeamMembers, IsActive = true),
        CurrentUtilizationPct
    );

nfExecAvailableHours =
    Sum(
        Filter(HVCG_TeamMembers, IsActive = true),
        AvailableHoursThisWeek
    );

// --- KPI-16 Approvals waiting (count) ---
nfExecApprovalsWaitingCount =
    CountRows(
        Filter(
            HVCG_Deliverables,
            RequiresExecutiveApproval = true
                && (
                    ClientApprovalStatus = "Pending"
                        || InternalReviewStatus = "Pending"
                        || DeliverableStatus = "Internal Review"
                        || DeliverableStatus = "Client Review"
                )
        )
    )
        + CountRows(
            Filter(HVCG_ExpenseApprovals, ApprovalStatus = "Pending")
        );

// --- KPI-17 Critical decisions ---
nfExecDecisionQueue =
    Filter(
        HVCG_Decisions,
        RequiresExecutiveAttention = true
            && (
                DecisionStatus = "Proposed"
                    || DecisionStatus = "Pending Decision"
            )
    );

nfExecCriticalDecisionsCount = CountRows(nfExecDecisionQueue);

// --- KPI-18 Major risks ---
nfExecMajorRisksCount =
    CountRows(
        Filter(
            HVCG_Risks,
            (RiskLevel = "High" || RiskLevel = "Critical" || RequiresExecutiveAttention = true)
                && (RiskStatus = "Open" || RiskStatus = "Mitigating")
        )
    );

// --- KPI-19 Meetings next 14d ---
nfExecUpcomingMeetingsCount =
    CountRows(
        Filter(
            HVCG_Meetings,
            MeetingDate >= Today() && MeetingDate <= DateAdd(Today(), 14)
        )
    );

// --- KPI-23 Revenue at risk $ ---
nfExecRevenueAtRisk =
    Sum(
        Filter(HVCG_FinancialMilestones, RevenueAtRisk = true),
        Amount
    );

// --- Display helper ---
nfExecCurrencyOrBlank =
    // usage: nfExecCurrencyOrBlank(nfExecMRR) — implement as component or inline Text:
    // If(IsBlank(value) || value = 0 && CountRows(source)=0, "—", Text(value, "$#,##0"))
    Blank();

// --- Health color (reuse shared nfHealthColor when available) ---
// nfExecHealthColor(h) = Switch(h, "Green", Color.DarkGreen, "Yellow", Color.DarkGoldenRod, "Red", Color.DarkRed, Color.Gray)

// --- Added for gallery bindings ---
nfShowExecFullHome =
  Coalesce(
    LookUp(HVCG_TeamMembers, Email = User().Email).PrimaryRole,
    "OperationsAssistant"
  ) in ["Owner", "Administrator"];
