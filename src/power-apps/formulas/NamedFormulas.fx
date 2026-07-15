// HVCG Power Fx — named formulas / snippets for App.Formulas and screen OnVisible
// Paste into Power Apps as appropriate after connecting SharePoint lists.

// Current user role
nfUserRole =
  Coalesce(
    LookUp(HVCG_TeamMembers, Email = User().Email).PrimaryRole,
    "OperationsAssistant"
  );

nfIsFinanceViewer =
  nfUserRole in ["Owner", "Administrator", "OperationsManager"];

nfIsExecutive =
  nfUserRole in ["Owner"];

// Active clients
nfActiveClients =
  Filter(HVCG_Clients, IsActive = true && ClientStage = "Active Client");

// My open tasks
nfMyOpenTasks =
  Filter(
    HVCG_Tasks,
    OwnerEmail = User().Email &&
    !(TaskStatus in ["Completed", "Cancelled"])
  );

// Overdue tasks (ops)
nfOverdueTasks =
  Filter(HVCG_Tasks, IsOverdue = true && !(TaskStatus in ["Completed", "Cancelled"]));

// Missing critical docs
nfMissingCriticalDocs =
  Filter(
    HVCG_DocumentRequests,
    IsCritical = true &&
    !(RequestStatus in ["Accepted", "Waived", "Cancelled"])
  );

// Executive attention union helper — load OnStart into colExecQueue
// ClearCollect(colExecQueue,
//   ShowColumns(Filter(HVCG_Decisions, RequiresExecutiveAttention), ...),
//   ...
// );

// Health color
nfHealthColor(h) =
  Switch(
    h,
    "Green", Color.DarkSeaGreen,
    "Yellow", Color.Goldenrod,
    "Red", Color.IndianRed,
    Color.Gray
  );

// Days since contact display
nfDaysSinceContact(c) =
  Coalesce(c.DaysSinceLastContact, DateDiff(c.LastMeaningfulContact, Today(), Days));

// --- Opportunity CRM ---
// Roles that may edit leads / opportunities / activities (not Contractor)
nfCanEditCRM =
  nfUserRole in [
    "Owner",
    "Administrator",
    "OperationsManager",
    "ProjectManager",
    "CapitalAdvisor",
    "OperationsAssistant"
  ];

// Exec / ops leadership may view All-scope pipeline
nfIsCRMExecutiveViewer =
  nfUserRole in ["Owner", "Administrator", "OperationsManager"];

// Analysts are read-only on CRM forms but may see commercial fee fields
nfIsCRMReadOnly =
  nfUserRole in ["FinancialAnalyst", "ReadOnly"] || !nfCanEditCRM;

nfOpenPipeline =
  Filter(HVCG_Opportunities, WinLossStatus = "Open");

nfMyOpportunities =
  Filter(
    HVCG_Opportunities,
    WinLossStatus = "Open" &&
    (
      SalesOwnerEmail = User().Email ||
      OwnerEmail = User().Email
    )
  );

// Scope: pass varCRMScope from scrCRM ("My" | "Team" | "All")
// Maker: set Items of board/list galleries to nfVisiblePipeline
nfVisiblePipeline =
  If(
    varCRMScope = "All" && nfIsCRMExecutiveViewer,
    nfOpenPipeline,
    If(
      varCRMScope = "Team" && nfIsCRMExecutiveViewer,
      nfOpenPipeline,
      nfMyOpportunities
    )
  );

nfQualifiedLeads =
  Filter(HVCG_Leads, LeadStatus = "Qualified");

nfOpenLeads =
  Filter(
    HVCG_Leads,
    !(LeadStatus in ["Converted", "Disqualified"])
  );

nfMyLeads =
  Filter(nfOpenLeads, OwnerEmail = User().Email);

nfVisibleLeads =
  If(
    varCRMScope = "All" && nfIsCRMExecutiveViewer,
    nfOpenLeads,
    nfMyLeads
  );

nfCapitalHandoffsReady =
  Filter(
    HVCG_Opportunities,
    CapitalHandoffStatus in ["Ready", "HandedOff"]
  );

nfOverdueNextActions =
  Filter(
    nfVisiblePipeline,
    !IsBlank(NextActionDate) && NextActionDate < Today()
  );

nfUpcomingNextActions =
  Filter(
    nfVisiblePipeline,
    !IsBlank(NextActionDate) &&
    NextActionDate >= Today() &&
    NextActionDate <= DateAdd(Today(), 7, Days)
  );

nfPipelineWeightedValue =
  Sum(nfVisiblePipeline, WeightedValue);

nfCommitForecastValue =
  Sum(Filter(nfVisiblePipeline, ForecastCategory = "Commit"), WeightedValue);

nfOpenDealCount =
  CountRows(nfVisiblePipeline);

nfActivitiesForSelectedOpp =
  Sort(
    Filter(
      HVCG_OpportunityActivities,
      OpportunityId.Id = varSelectedOpportunity.ID
    ),
    ActivityDate,
    Descending
  );

nfIsCapitalEligibleType(t) =
  t in ["Capital Raise", "Hybrid"];

nfRecalcWeightedValue(amount, probability) =
  Coalesce(amount, 0) * (Coalesce(probability, 0) / 100);

nfStageColor(stage) =
  Switch(
    stage,
    "Discovery", Color.SteelBlue,
    "Assessment", Color.Teal,
    "Proposal", Color.DarkOrange,
    "Negotiation", Color.Purple,
    "Won", Color.DarkSeaGreen,
    "Lost", Color.IndianRed,
    Color.Gray
  );

nfHandoffColor(status) =
  Switch(
    status,
    "NotApplicable", Color.Gray,
    "Ready", Color.Goldenrod,
    "HandedOff", Color.SteelBlue,
    "InFunding", Color.Teal,
    "Funded", Color.DarkSeaGreen,
    "Declined", Color.IndianRed,
    Color.Gray
  );
