# PERMISSIONS MATRIX

Legend: **F** Full Control · **E** Edit/Contribute · **R** Read · **N** None · **A** Assigned clients only (via HVCG-Client-{Code} + app filter)

| Resource | Owner | Admin | Ops Mgr | PM | Capital Adv | Fin Analyst | Ops Asst | Contractor | Ext Pro | ReadOnly | Client Contact |
|----------|-------|-------|---------|----|-------------|-------------|----------|------------|---------|----------|----------------|
| CommandCenter site settings | F | F | R | N | N | N | N | N | N | N | N |
| HVCG_Clients list | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Contacts | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Leads / Opportunities | E | E | E | E | E | R | E | N | N | R | N |
| HVCG_Engagements | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Projects / Tasks | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_DocumentRequests | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Deliverables | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Meetings / Communications | E | E | E | E | E | E | E | A | A | R | N |
| HVCG_Decisions | E | E | E | E | E | E | E | A | N | R | N |
| HVCG_Risks / Issues / Changes | E | E | E | E | E | E | E | A | N | R | N |
| HVCG_FinancialMilestones | E | E | E | R | R | R | E | N | N | N | N |
| Success fee / profitability fields | E | E | E | N | N | N | N | N | N | N | N |
| HVCG_AutomationLogs | E | E | R | R | N | N | N | N | N | N | N |
| HVCG_Templates | E | E | E | R | R | R | R | N | N | R | N |
| Client document library | E | E | E | A | A | A | A | A | A | A | Upload-only if enabled |
| Knowledge SOPs | E | E | E | R | R | R | R | R | R | R | N |
| Executive dashboard | E | E | R | N | N | N | N | N | N | N | N |
| Ops dashboard | E | E | E | E | E | E | E | N | N | R | N |

## v1.1.0 — Intelligence Layer

| Resource | Owner | Admin | Ops Mgr | PM | Capital Adv | Fin Analyst | Ops Asst | Contractor | Ext Pro | ReadOnly | Client Contact |
|----------|-------|-------|---------|----|-------------|-------------|----------|------------|---------|----------|----------------|
| **HVCG_Relationships** | E | E | E | A | A | A | R | N | N | N | **N** |
| Cross-client edges (`IsCrossClient`) | E | E | R | N | N | N | N | N | N | N | N |

Contractors see only relationships for assigned `ClientCode`. Guests have **no** access.

## v1.1.0 — AI Orchestration

| Resource | Owner | Admin | Ops Mgr | PM | Capital Adv | Fin Analyst | Ops Asst | Contractor | Ext Pro | ReadOnly | Client Contact |
|----------|-------|-------|---------|----|-------------|-------------|----------|------------|---------|----------|----------------|
| **HVCG_AIWorkers** | E | E | R | N | N | N | N | N | N | N | **N** |
| **HVCG_AIJobs** | E | E | E | E | E | E | R | N | N | N | **N** |
| **HVCG_AIJobSteps** | E | E | E | E | E | E | R | N | N | N | **N** |
| **HVCG_AIContext** | E | E | E | E | E | E | N | N | N | N | **N** |
| **HVCG_AIPrompts** | E | E | R | N | N | N | N | N | N | N | **N** |
| **HVCG_AIToolRegistry** | E | E | R | N | N | N | N | N | N | N | **N** |
| **HVCG_AIOutputs** | E | E | E | E | E | E | R | N | N | N | **N** |
| **HVCG_AIApprovals** | E | E | E | E | E | E | N | N | N | N | **N** |
| **HVCG_AIFeedback** | E | E | E | E | E | E | E | N | N | N | **N** |
| **HVCG_AIAuditLog** | E | E | R | N | N | N | N | N | N | N | **N** |
| **HVCG_AICostTracking** | E | E | R | R | N | R | N | N | N | N | **N** |

All AI orchestration lists are **internal staff only**. Guests and client contacts have **no** access. Contractors have **no** access.

## v1.1.0 — Operational Monitoring

| Resource | Owner | Admin | Ops Mgr | PM | Capital Adv | Fin Analyst | Ops Asst | Contractor | Ext Pro | ReadOnly | Client Contact |
|----------|-------|-------|---------|----|-------------|-------------|----------|------------|---------|----------|----------------|
| **HVCG_OperationalAlerts** | E | E | E | R | N | N | N | N | N | N | **N** |

## Field-level sensitivity (app enforced)

Hide from non-Owner/Admin/OpsMgr in Power Apps:
- MonthlyRetainer, SetupFee, SuccessFeePercent, EstimatedSuccessFee, EngagementProfitability, RevenueAtRisk, InternalNotes, RiskLevel (internal), PricingException flags
- Invoice amounts (non-finance roles), ExpenseApprovals, Subscriptions/RecurringExpenses amounts (non-Ops)
- All `HVCG_AI_*` queues (hide from Contractor / Client Contact)
- All AI orchestration lists (hide from Contractor / Client Contact / Guest)
- Relationships with `IsCrossClient=true` (hide from non-Owner/Admin)
- Portal* lists until PortalEnabled and V2 launch

## HVCG OS domain access (summary)

| Domain | Owner | Ops | PM | Capital | Analyst | Contractor |
|--------|-------|-----|----|---------|---------|------------|
| CRM / Proposals | E | E | E | E | R | N |
| Capital desk | E | E | E | E | E | A |
| Finance invoices/collections | E | E | R | R | R | N |
| Operations Hub vendors/$ | E | E | R | N | N | N |
| AI queues | E | E | E | E | E | N |
| AI orchestration (v1.1.0) | E | E | E | E | E | N |
| Relationships (v1.1.0) | E | E | E | A | A | N |
| OperationalAlerts (v1.1.0) | E | E | E | R | N | N |
| Portal prep entities | E | E | R | N | N | N |

## Contractor rule

Contractors must be in **both** a role group and specific `HVCG-Client-{Code}` groups. Access expires via Entra group membership end date (documented process).

## Guest rule (v1.1.0)

Guests and client contacts have **no** access to Relationships, AI orchestration lists, OperationalAlerts, or any `HVCG_AI_*` queue.
