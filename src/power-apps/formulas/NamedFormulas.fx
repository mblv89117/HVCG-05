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
nfOpenPipeline =
  Filter(HVCG_Opportunities, WinLossStatus = "Open");

nfMyOpportunities =
  Filter(
    HVCG_Opportunities,
    SalesOwnerEmail = User().Email && WinLossStatus = "Open"
  );

nfQualifiedLeads =
  Filter(HVCG_Leads, LeadStatus = "Qualified");

nfOpenLeads =
  Filter(
    HVCG_Leads,
    !(LeadStatus in ["Converted", "Disqualified"])
  );

nfCapitalHandoffsReady =
  Filter(
    HVCG_Opportunities,
    CapitalHandoffStatus in ["Ready", "HandedOff"]
  );

nfPipelineWeightedValue =
  Sum(nfOpenPipeline, WeightedValue);

nfCommitForecastValue =
  Sum(Filter(nfOpenPipeline, ForecastCategory = "Commit"), WeightedValue);
