# 03 — Relationship Diagram

## Logical ERD (foundation spine)

```mermaid
erDiagram
    ORGANIZATION ||--o{ WORKSPACE : owns
    ORGANIZATION ||--o{ CLIENT : party
    WORKSPACE ||--o{ CLIENT : scopes
    ORGANIZATION ||--o{ ROLE : catalogs
    CLIENT ||--o{ CONTACT : has
    CLIENT ||--o{ ENGAGEMENT : engages
    CLIENT ||--o{ OPPORTUNITY : pipeline
    CLIENT ||--o{ CAPITAL_OPPORTUNITY : raises
    CLIENT ||--o{ EV_ASSESSMENT : values
    CLIENT ||--o{ DOCUMENT_REQUEST : requests
    CLIENT ||--o{ NOTE : annotated
    ENGAGEMENT ||--o{ PROJECT : delivers
    PROJECT ||--o{ MILESTONE : plans
    PROJECT ||--o{ TASK : work
    PROJECT ||--o{ RISK : registers
    PROJECT ||--o{ ISSUE : registers
    PROJECT ||--o{ DECISION : registers
    PROJECT ||--o{ MEETING : logs
    OPPORTUNITY ||--o| CAPITAL_OPPORTUNITY : handoff
    CAPITAL_OPPORTUNITY ||--o{ FINANCING_CONDITION : conditions
    CAPITAL_OPPORTUNITY ||--o{ LENDER_OUTREACH : markets
    CAPITAL_OPPORTUNITY ||--o{ INVESTOR_OUTREACH : markets
    CAPITAL_SOURCE ||--o{ LENDER : specializes
    CAPITAL_SOURCE ||--o{ INVESTOR : specializes
    EV_ASSESSMENT ||--o{ VALUE_DRIVER : drivers
    FINANCIAL_PERIOD ||--o{ BUDGET : period
    FINANCIAL_PERIOD ||--o{ FORECAST_LINE : period
    FINANCIAL_PERIOD ||--o{ KPI_RECORD : snapshots
    FORECAST ||--o{ FORECAST_LINE : contains
    REFERRAL_PARTNER ||--o{ REFERRAL : refers
    AI_JOB ||--o{ AI_INSIGHT : publishes
    CLIENT ||--o{ AUDIT_EVENT : audited
    WORKSPACE ||--o{ NOTIFICATION : notifies
```

## Join keys (stable)

| From | To | Key |
|------|----|-----|
| Most facts | Client | `ClientCode` (text) + optional `ClientId` lookup |
| Client | Organization | `OrganizationId` / `OrganizationCode` |
| Client | Workspace | `WorkspaceId` / `WorkspaceCode` |
| Opportunity | CapitalOpportunity | `CapitalOpportunityId` / `OpportunityId` bridge |
| KPI / Budget / Forecast | Period | `PeriodCode` / `FinancialPeriodId` |
| DocumentRequest | Library file | URL / DriveItem id (not duplicated content) |
| User actions | Entra | Email + `EntraObjectId` |

## Isolation edges

- Default query filter: `WorkspaceId = current workspace` **OR** (Executive workspace + role allows cross-workspace).
- `HVCG_Relationships.IsCrossClient` must remain false unless Security-approved.
- Colorado Craft Beef workspace rows must not appear in other client workspaces.

## Existing ERD

Legacy delivery/CRM diagram remains in [`../ERD.md`](../ERD.md). This foundation diagram **supersedes** it for Atlas multi-org planning.
