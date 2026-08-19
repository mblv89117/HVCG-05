# 03 — Platform ERD

```mermaid
erDiagram
    TENANT ||--o{ ORGANIZATION : contains
    ORGANIZATION ||--o{ WORKSPACE : owns
    ORGANIZATION ||--o{ CLIENT : party
    WORKSPACE ||--o{ CLIENT : scopes
    IDENTITY ||--o| USER : profiles
    USER }o--o{ TEAM : member
    WORKSPACE ||--o{ TEAM : hosts
    ROLE ||--o{ PERMISSION : grants
    USER }o--o{ ROLE : assigned
    CLIENT ||--o{ PROJECT : has
    PROJECT ||--o{ TASK : contains
    QUEUE ||--o{ TASK : routes
    WORKFLOW ||--o{ AUTOMATION : drives
    AUTOMATION ||--o{ AGENT : may_invoke
    AGENT ||--o{ CONVERSATION : participates
    PROJECT ||--o{ DECISION : registers
    PROJECT ||--o{ APPROVAL : requests
    USER ||--o{ NOTIFICATION : receives
    TENANT ||--o{ EVENT : emits
    CLIENT ||--o{ TIMELINE_ENTRY : history
    DOCUMENT ||--o| ARTIFACT : may_materialize
    WORKSPACE ||--o{ DASHBOARD : shows
    DASHBOARD ||--o{ WIDGET : layout
    WIDGET ||--o{ METRIC : binds
    TENANT ||--o{ AUDIT : records
    TENANT ||--o{ INTEGRATION : connects
    ORGANIZATION ||--o{ INTEGRATION : scopes
```

## Isolation path

`TenantId` → `Organization` → `Workspace` → (`Client` | platform resources)

Executive Dashboard uses WorkspaceType=`Executive` with Permission-gated cross-client Metric reads — not a separate schema.
