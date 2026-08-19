# SYSTEM ARCHITECTURE — HVCG Project Management System (HVCG OS)

| Field | Value |
|-------|--------|
| Owner | architect (`cursor/system-architect`) |
| Status | ACTIVE |
| As of | 2026-07-15 |
| Product version | 1.1.0 |
| Production | Untouched (architect does not deploy) |

## 1. Purpose

Authoritative technical overview for module agents, Master PM, and QA. Module implementation details remain in module docs; this document defines system shape, systems of record, solution boundaries, and integration rules.

Companion standards (same folder):

- `NAMING_CONVENTIONS.md`
- `SHARED_COMPONENT_CATALOG.md`
- `TECHNICAL_DEBT_REGISTER.md`
- `ARCHITECTURE_REVIEW_QUEUE.md`
- `ARCHITECTURE_DECISIONS/`

Legacy compatibility stub: `docs/architecture/ARCHITECTURE.md` → root `ARCHITECTURE.md`. Prefer **this** file for cross-module governance.

## 2. Platform posture (v1)

| Layer | Decision |
|-------|----------|
| System of record (v1) | **SharePoint lists + libraries** on dedicated HVCG sites |
| App shell | Power Apps canvas — **HVCG OS Command Center** |
| Automation | Power Automate (solution-aware preferred) |
| Analytics | Power BI semantic model over SharePoint (see `POWERBI_ENTERPRISE_MODEL.md`) |
| AI | Human-gated orchestration + `HVCG_AI_*` queues — no external auto-send |
| Dataverse | **Not** v1 SoR; reserved for V2 graph / RLS candidates |
| Environments | Dev → Test → Production promotion; Production changes require Manny + QA gate |

## 3. Module map

| Module | Agent | Branch / worktree | Owns (implementation) | Consumes (shared) |
|--------|-------|-------------------|-----------------------|-------------------|
| CRM | `crm` | live tree / `agent/crm-*` | CRM flows, canvas, CRM docs | Clients, Leads, Opportunities, … |
| Executive | `executive` | `cursor/executive-command-center` | Executive app/BI/flows | Shared lists (read), alerts |
| Operations | `operations` | `cursor/operations-hub` | `HVCG_Ops*` flows, ops views | Ops knowledge lists; shared Approvals pattern |
| Finance | `finance` | `cursor/finance-operations` | `HVCG_Finance*` exclusive lists | Invoices, Budgets, Collections, … |
| Client Portal | `client-portal` | `cursor/client-portal-data-rooms` | Data rooms, portal lists/flows | Clients, Deliverables, Portal\* |
| AI Governance | `ai-governance` | `cursor/ai-governance-work-queues` | AI orchestration + AI queue lists | Job links to Clients/Projects |
| Integration / QA | `integration` | `cursor/qa-release-manager` | QA_*, release gates | All packages for validation |
| Master PM | `master-pm` | `cursor/master-pm-orchestrator` | MASTER_*, coordination | N/A |
| Architect | `architect` | `cursor/system-architect` | `docs/architecture/`, `docs/data-model/` | Reviews shared contracts |

## 4. Shared entity systems of record (canonical)

| Entity | Canonical list | Owning steward | Notes |
|--------|----------------|----------------|-------|
| Client | `HVCG_Clients` | CRM (schema); all consume | Business key: `ClientCode` |
| Lead | `HVCG_Leads` | CRM | Converts → Opportunity / Client |
| Opportunity | `HVCG_Opportunities` | CRM | |
| Project / Task / Deliverable | `HVCG_Projects`, `HVCG_Tasks`, `HVCG_Deliverables` | Delivery / CRM win path | |
| Invoice / Collections / Budget | `HVCG_Invoices`, `HVCG_CollectionsActivities`, `HVCG_Budgets` | Finance steward | Finance may add exclusive `HVCG_Finance*` extensions |
| Approval (cross-domain) | `HVCG_Approvals` | **Shared** — architect gate | Domain-specific approval lists may exist; must not fork core contract silently |
| Audit (platform) | `HVCG_AuditEvents` | Platform | Domain audits: `HVCG_AIAuditLog`, `HVCG_PortalAuditLog` |
| Notification | `HVCG_Notifications` | Platform | |
| AI work item | `HVCG_AIJobs` + `HVCG_AI_*` queues | AI Governance | Human approval default |
| Data room | `HVCG_DataRooms` (+ participants/library) | Client Portal | Exclusive package pattern (good) |

Full key/field contracts: evolve in `docs/data-model/` under architect ownership.

## 5. Solution / packaging boundaries

| Package | Role |
|---------|------|
| `HVCGCommandCenterDev` | Unmanaged Dev solution — env vars, connection refs, flows/apps as authored |
| `HVCGOS` / `HVCGOS_managed` | Product packaging path |
| Module exclusive paths | Portal/Finance/Ops exclusive indexes and lists — preferred over editing shared `_index.json` |

**Publisher:** `HVCG`, prefix `hvcg`, option value prefix `88000`.

**Connection references (canonical):**

- `hvcg_sharedsharepointonline`
- `hvcg_sharedoffice365`
- `hvcg_sharedteams`
- `hvcg_sharedapprovals`

Do **not** create parallel connection references for the same connectors without architect approval.

## 6. Environment variables (canonical family)

Solution logical names use publisher prefix + PascalCase, e.g.:

- `hvcg_CommandCenterSiteUrl`, `hvcg_ClientsSiteUrl`, `hvcg_KnowledgeSiteUrl`
- `hvcg_ExecutiveEmail`, `hvcg_OpsEmail`
- `hvcg_EnableClientEmails`, `hvcg_CrmEnableTeamsNotify`, `hvcg_CrmTestRecipient`
- Teams channel/group IDs: `hvcg_TeamsCrmChannelId`, `hvcg_TeamsCrmChannelGroupId`, …

Flow documentation often mirrors these as `HVCG_*` display aliases. **Canonical logical name = solution `hvcg_*`.** New env vars require architecture review.

## 7. Integration patterns (approved)

1. SharePoint list CRUD via shared SharePoint connection reference  
2. Outlook notify via `hvcg_sharedoffice365` with `hvcg_EnableClientEmails` guard for client-facing mail  
3. Teams notify via `hvcg_sharedteams` with CRM Teams flags  
4. Approvals connector via `hvcg_sharedapprovals` + list audit row  
5. Power BI import/DirectQuery per BI standards (no dual semantic models for same entity)  
6. Copilot: read-approved surfaces only; no write without human gate  

Forbidden without Manny + architect: Production direct edit, broad external sharing of client data rooms, secret materialization in repo/bus.

## 8. Reliability minimums

Idempotency keys (`HVCG_IdempotencyKey` pattern), retry/backoff + 429 handling, duplicate prevention, structured logs to `HVCG_AutomationLogs` / OperationalAlerts, safe re-runs, no destructive defaults.

## 9. Architecture review gate

Required before changing: shared list schemas, shared indexes, shared env vars, shared connection refs, auth/security boundaries, cross-module contracts, deployment architecture.

Outcomes: APPROVED | APPROVED WITH CONDITIONS | CHANGES REQUIRED | REJECTED | DEFERRED.

## 10. Health snapshot (initial inventory 2026-07-15)

| Signal | Assessment |
|--------|------------|
| Shared CRM core schemas (`Clients`/`Leads`/`Opportunities`/…) | Aligned across module worktrees (hash-identical) |
| AI list schemas | **Drift** — AI worktree diverged on 19 AI lists vs baseline |
| Ops shared lists | **Drift** — Approvals (+Amount/Requester), plus Ops knowledge lists diverge on Ops tip |
| Shared indexes | **Known QA conflict CF-001** — Ops tip residue on locked `_index.json` / `command-center-views.json` |
| Dual agent registration | `operations` + `operations-hub` — consolidate |
| Architecture standards pack | Bootstrapping (this document + naming/catalog/debt/ADRs) |

**Architecture health (initial):** **62%** — solid v1 platform shape and CRM core alignment; shared-schema stewardship and index discipline incomplete.

## 11. Authority limits

Architect does not merge, deploy, touch Production, override QA gates, or rewrite module implementations for style. Escalates business/security/licensing to Manny via Master PM.
