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

// =============================================================================
// Atlas Analytics Product — ATLAS-M-* (docs/analytics/METRIC_CATALOG.md)
// Apps: point-in-time / simple rates. Trends & medians prefer Power BI.
// =============================================================================

// ATLAS-M-003 Conversion rate 90d (Won / Won+Lost)
nfExecConversionRate90d =
    With(
        {
            won: CountRows(
                Filter(
                    HVCG_Opportunities,
                    WinLossStatus = "Won" && ExpectedCloseDate >= DateAdd(Today(), -90)
                )
            ),
            lost: CountRows(
                Filter(
                    HVCG_Opportunities,
                    WinLossStatus = "Lost" && ExpectedCloseDate >= DateAdd(Today(), -90)
                )
            )
        },
        If(won + lost = 0, Blank(), won / (won + lost))
    );

// ATLAS-M-004 Engagement revenue (active book)
nfExecEngagementRevenue =
    Sum(
        Filter(
            HVCG_Engagements,
            EngagementStatus = "Active"
                || EngagementStatus = "In Progress"
                || EngagementStatus = "On Track"
        ),
        Coalesce(MonthlyRetainer, 0) + Coalesce(EngagementValue, 0)
    );

// ATLAS-M-005 Client concentration Top-3 share of active MRR
nfExecMRRActiveTotal =
    Sum(
        Filter(HVCG_Clients, IsActive = true && ClientStage = "Active Client"),
        MonthlyRetainer
    );

nfExecConcentrationTop3 =
    With(
        {
            ranked: FirstN(
                Sort(
                    Filter(HVCG_Clients, IsActive = true && ClientStage = "Active Client"),
                    MonthlyRetainer,
                    SortOrder.Descending
                ),
                3
            ),
            total: nfExecMRRActiveTotal
        },
        If(total = 0, Blank(), Sum(ranked, MonthlyRetainer) / total)
    );

// ATLAS-M-006 Client health counts
nfExecClientHealthGreen =
    CountRows(
        Filter(
            HVCG_Clients,
            IsActive = true && ClientStage = "Active Client" && OverallHealth = "Green"
        )
    );
nfExecClientHealthYellow =
    CountRows(
        Filter(
            HVCG_Clients,
            IsActive = true && ClientStage = "Active Client" && OverallHealth = "Yellow"
        )
    );
nfExecClientHealthRed =
    CountRows(
        Filter(
            HVCG_Clients,
            IsActive = true && ClientStage = "Active Client" && OverallHealth = "Red"
        )
    );

// ATLAS-M-008 Overdue task rate (exec: High/Critical only)
nfExecOverdueTaskRate =
    With(
        {
            openTasks: Filter(
                HVCG_Tasks,
                (Priority = "High" || Priority = "Critical")
                    && TaskStatus <> "Done"
                    && TaskStatus <> "Cancelled"
                    && TaskStatus <> "Completed"
            )
        },
        With(
            {
                n: CountRows(openTasks),
                o: CountRows(Filter(openTasks, IsOverdue = true))
            },
            If(n = 0, Blank(), o / n)
        )
    );

// ATLAS-M-010 Revenue at risk already: nfExecRevenueAtRisk

// ATLAS-M-011 Capital-readiness (critical funding milestones; BLANK if none)
// Prefer scoping to open capital in Maker when lookup filters are available.
nfExecCapitalReadiness =
    With(
        {
            n: CountRows(Filter(HVCG_FundingMilestones, IsCritical = true)),
            d: CountRows(
                Filter(
                    HVCG_FundingMilestones,
                    IsCritical = true
                        && (
                            Status = "Completed"
                                || Status = "Complete"
                                || Status = "Satisfied"
                                || Status = "Waived"
                        )
                )
            )
        },
        If(n = 0, Blank(), d / n)
    );

// ATLAS-M-012 Document completion (critical)
nfExecDocCompletionCritical =
    With(
        {
            allCrit: Filter(
                HVCG_DocumentRequests,
                IsCritical = true && RequestStatus <> "Cancelled"
            )
        },
        With(
            {
                n: CountRows(allCrit),
                d: CountRows(
                    Filter(
                        allCrit,
                        RequestStatus = "Accepted" || RequestStatus = "Waived"
                    )
                )
            },
            If(n = 0, Blank(), d / n)
        )
    );

// ATLAS-M-013 alias of nfExecCapitalPipeline (Active financing pipeline)

// ATLAS-M-014 EV progress (exclude sample/test when DataProvenance present)
nfExecEVProgress =
    With(
        {
            rows: Filter(
                HVCG_EnterpriseValueAssessments,
                Status <> "Superseded"
                    && Coalesce(DataProvenance, "imported") <> "sample"
                    && Coalesce(DataProvenance, "imported") <> "test"
                    && (
                        Status = "Draft"
                            || Status = "In Review"
                            || Status = "Accepted"
                    )
            )
        },
        With(
            {
                n: CountRows(rows),
                a: CountRows(Filter(rows, Status = "Accepted"))
            },
            If(n = 0, Blank(), a / n)
        )
    );

// ATLAS-M-015 User adoption 7d (AuditEvents ∩ TeamMembers)
nfExecActiveUsers7d =
    CountRows(
        Distinct(
            Filter(
                HVCG_AuditEvents,
                EventDate >= DateAdd(Today(), -7)
                    && !IsBlank(ActorEmail)
                    && !IsBlank(LookUp(HVCG_TeamMembers, Email = ActorEmail && IsActive = true))
            ),
            ActorEmail
        )
    );

// ATLAS-M-016 Workflow failures 7d
nfExecWorkflowFailures7d =
    CountRows(
        Filter(
            HVCG_AutomationLogs,
            Status = "Failed" && Created >= DateAdd(Today(), -7)
        )
    );

// Meta helper text for tiles (bind SubLabel)
nfExecSourceMeta = "Source: SharePoint · Refresh: OnVisible / Refresh";
