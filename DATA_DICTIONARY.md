# DATA DICTIONARY — HVCG OS

Machine-readable schemas: `src/sharepoint/lists/*.json` (**67 lists**).

## Domain index

| Domain | Lists |
|--------|-------|
| CRM | Clients, Contacts, Leads, ReferralPartners, Referrals, DiscoveryCalls, Opportunities, Proposals, WinLossAnalyses |
| Capital | CapitalSources, Lenders, Investors, CapitalOpportunities, FundingMilestones, InvestorOutreach, LenderOutreach |
| Delivery | Engagements, Projects, Workstreams, Milestones, Tasks, DocumentRequests, Deliverables, Meetings, Communications, Decisions, Risks, Issues, ChangeRequests, Assumptions, Dependencies, Approvals |
| Finance | FinancialMilestones, Invoices, CollectionsActivities, Budgets, ExpenseApprovals, RevenueForecastLines |
| Operations Hub | SOPs, Templates, Policies, Vendors, SoftwareInventory, Subscriptions, RecurringExpenses, InternalProjects, MeetingPlaybooks, SalesScripts, TrainingCatalog, TeamMembers, TimeEntries |
| AI Ready | AI_Tasks, AI_Reviews, AI_GeneratedDocuments, AI_SuggestedActions, AI_DraftEmails, AI_MeetingSummaries, AI_SOPDrafts, AI_QualityReviews, AI_Escalations, AI_KnowledgeExtraction |
| Portal V2 prep | PortalAccess, PortalMessages, PortalDeliverableLinks |
| Platform | AutomationLogs, Notifications, AuditEvents |

## Systems of record (unchanged principle)

Operational CRM/PM/Capital/Finance-ops → **SharePoint Lists**. Files → **Libraries**. GL → **external accounting**. Identity → **Entra ID**.

## Notable fields

- **ClientLifetimeValue** / opportunity **ClientLifetimeValueEstimate** — CLV tracking  
- **FundingStatus**, **FundingProbability**, **ExpectedCloseDate** — capital desk  
- **PortalVisible** / **PortalEnabled** — V2 portal without redesign  
- **HumanApprovalRequired** on all AI queues — safety default  
- **CopilotKeywords** / **CopilotSummary** — Copilot grounding  
- **ExternalAccountingId** on Invoices — future QuickBooks link  

## ERD

See `docs/data-model/ERD.md` (expanded).
