// --- Executive Command Center ---
// Package: exclusive ECC path (Option A). Parent Integrator appends this block
// to src/power-apps/formulas/NamedFormulas.fx after CRM section (do not overwrite CRM).

// Executive role gate (Owner-only for full CEO surface)
nfIsExecutiveOwner =
  nfUserRole in ["Owner"] || User().Email = LookUp(HVCG_TeamMembers, PrimaryRole = "Owner").Email;

// Finance tiles already gated by nfIsFinanceViewer in base formulas

nfExecOpenPipeline =
  Filter(HVCG_Opportunities, WinLossStatus = "Open");

nfExecPipelineValue =
  Sum(nfExecOpenPipeline, WeightedValue);

nfExecCommitForecastValue =
  Sum(Filter(nfExecOpenPipeline, ForecastCategory = "Commit"), WeightedValue);

nfExecMRR =
  Sum(
    Filter(HVCG_Clients, IsActive = true && ClientStage = "Active Client"),
    MonthlyRetainer
  );

nfExecPastDueMilestones =
  Filter(HVCG_FinancialMilestones, IsPastDue = true);

nfExecARInvoices =
  Filter(
    HVCG_Invoices,
    InvoiceStatus in ["Sent", "Partial", "Past Due"]
  );

nfExecAROutstanding =
  Sum(
    nfExecARInvoices,
    Coalesce(Amount, 0) - Coalesce(AmountCollected, 0)
  );

nfExecCashCollectedMTD =
  Sum(
    Filter(
      HVCG_Invoices,
      !IsBlank(AmountCollected) &&
      Year(InvoiceDate) = Year(Today()) &&
      Month(InvoiceDate) = Month(Today())
    ),
    AmountCollected
  );

nfExecRevenueForecastWeighted =
  Sum(HVCG_RevenueForecastLines, WeightedAmount);

nfExecCapitalPipeline =
  Sum(
    Filter(
      HVCG_CapitalOpportunities,
      !(FundingStatus in ["Closed", "Declined", "Withdrawn"])
    ),
    WeightedValue
  );

nfExecProjectsAtRisk =
  Filter(HVCG_Projects, ProjectHealth in ["Red", "Yellow"]);

nfExecClientsRed =
  Filter(HVCG_Clients, IsActive = true && OverallHealth = "Red");

nfExecDecisionQueue =
  Filter(HVCG_Decisions, RequiresExecutiveAttention = true);

nfExecClientsAttention =
  Filter(HVCG_Clients, RequiresExecutiveAttention = true);

nfExecProjectsAttention =
  Filter(
    HVCG_Projects,
    RequiresExecutiveAttention = true || ProjectHealth = "Red"
  );

nfExecMajorRisks =
  Filter(
    HVCG_Risks,
    RiskLevel in ["High", "Critical"] &&
    !(RiskStatus in ["Closed", "Accepted"])
  );

nfExecPendingApprovals =
  Filter(HVCG_Approvals, ApprovalStatus = "Pending");

nfExecPendingExpenseApprovals =
  Filter(HVCG_ExpenseApprovals, ApprovalStatus = "Pending");

nfExecDeliverablesNeedingApproval =
  Filter(
    HVCG_Deliverables,
    RequiresExecutiveApproval = true &&
    !(DeliverableStatus in ["Approved", "Cancelled"])
  );

nfExecProposalsAwaiting =
  Filter(HVCG_Proposals, ProposalStatus = "Sent");

nfExecMeetingsNext14 =
  Filter(
    HVCG_Meetings,
    MeetingDate >= Today() &&
    MeetingDate <= DateAdd(Today(), 14, Days)
  );

nfExecStrategicRelationships =
  Filter(
    HVCG_Relationships,
    StrategicValue in ["High", "Critical"]
  );

nfExecMyApprovals =
  Filter(
    nfExecPendingApprovals,
    ApproverEmail = User().Email
  );

// Capacity (simplified — refine with weekly TimeEntries join in BI)
nfExecTeamCapacityHours =
  Sum(HVCG_TeamMembers, CapacityHoursPerWeek);

nfExecBillableHoursLogged =
  Sum(Filter(HVCG_TimeEntries, IsBillable = true), Hours);

nfExecUtilizationPct =
  If(
    nfExecTeamCapacityHours = 0,
    0,
    nfExecBillableHoursLogged / nfExecTeamCapacityHours
  );

nfShowExecFinanceTiles =
  nfIsFinanceViewer;

nfShowExecFullHome =
  nfIsExecutive;
