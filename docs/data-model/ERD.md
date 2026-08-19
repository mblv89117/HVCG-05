# Entity Relationship Diagram — HVCG OS

> **Platform OS (canonical):** [`ATLAS_PLATFORM_OS/03_PLATFORM_ERD.md`](ATLAS_PLATFORM_OS/03_PLATFORM_ERD.md)  
> **Product multi-org spine:** [`ATLAS_DATA_FOUNDATION/03_RELATIONSHIPS.md`](ATLAS_DATA_FOUNDATION/03_RELATIONSHIPS.md)  
> Diagram below remains the V1.1 delivery/CRM spine.

```mermaid
erDiagram
    HVCG_ReferralPartners ||--o{ HVCG_Referrals : refers
    HVCG_Referrals ||--o| HVCG_Leads : becomes
    HVCG_Leads ||--o{ HVCG_DiscoveryCalls : books
    HVCG_Leads ||--o| HVCG_Opportunities : converts
    HVCG_Opportunities ||--o{ HVCG_Proposals : proposes
    HVCG_Opportunities ||--o| HVCG_WinLossAnalyses : analyzes
    HVCG_Opportunities ||--o| HVCG_Clients : wins
    HVCG_Clients ||--o{ HVCG_Engagements : engages
    HVCG_Clients ||--o{ HVCG_CapitalOpportunities : raises
    HVCG_CapitalSources ||--o{ HVCG_Lenders : specializes
    HVCG_CapitalSources ||--o{ HVCG_Investors : specializes
    HVCG_CapitalOpportunities ||--o{ HVCG_FundingMilestones : tracks
    HVCG_CapitalOpportunities ||--o{ HVCG_LenderOutreach : markets
    HVCG_CapitalOpportunities ||--o{ HVCG_InvestorOutreach : markets
    HVCG_Clients ||--o{ HVCG_Invoices : billed
    HVCG_Invoices ||--o{ HVCG_CollectionsActivities : collected
    HVCG_Clients ||--o{ HVCG_Budgets : budgets
    HVCG_Budgets ||--o{ HVCG_ExpenseApprovals : expenses
    HVCG_Clients ||--o{ HVCG_PortalAccess : portal
    HVCG_Clients ||--o{ HVCG_PortalMessages : messages
    HVCG_Projects ||--o{ HVCG_Tasks : tasks
    HVCG_AI_DraftEmails }o--|| HVCG_Clients : optional
```

Delivery registers (Risks, Issues, Decisions, etc.) remain as in V1 core.
