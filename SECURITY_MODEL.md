# SECURITY MODEL

## Principles

1. Least privilege  
2. Client data isolation by default  
3. MFA via Entra ID / Conditional Access  
4. No secrets in source control  
5. Auditability of privileged actions  
6. Time-bound contractor access  
7. **No autonomous external AI communications** (v1.1.0)

## Identity

- All internal users authenticate with Entra ID.
- MFA required (tenant Conditional Access — owner OA).
- Prefer security groups over individual SharePoint permissions.

## Role Groups (Entra)

| Group | Purpose |
|-------|---------|
| HVCG-Role-Owner | Full business oversight; executive list views |
| HVCG-Role-Administrator | Site settings, provisioning, flow admin |
| HVCG-Role-OperationsManager | Ops dashboards, assignments, escalations |
| HVCG-Role-ProjectManager | Projects/tasks/docs for assigned work |
| HVCG-Role-CapitalAdvisor | Capital workstreams + packages |
| HVCG-Role-FinancialAnalyst | Models, financial docs |
| HVCG-Role-OperationsAssistant | Day-to-day data entry |
| HVCG-Role-Contractor | Limited; must also be in client groups |
| HVCG-Role-ExternalProfessional | B2B guest baseline |
| HVCG-Role-ReadOnlyReviewer | Read across permitted clients |
| HVCG-Client-{ClientCode} | Access to that client's library + related items (via views/flows) |

## SharePoint Permission Pattern

**CommandCenter site:** Staff role groups have Contribute/Edit on lists as per matrix. Contractors get limited list views via app filtering + item-level where practical; V1 uses app-layer filtering by assignment + library ACLs for files.

**Clients site:** Each library breaks inheritance. Grant:
- HVCG-Role-Owner, Administrator, OperationsManager: Edit
- PM/Analyst/Advisor on that engagement: Edit via membership in `HVCG-Client-{Code}`
- Client contacts: optional Contribute to upload folders only (01–14) if guest enabled — default V1: **upload via request links only**, no standing client membership

## Intelligence Layer — Relationships (v1.1.0)

- **Client isolation:** Every relationship row carries `ClientCode`. App and flow queries filter by assigned clients.
- **Cross-client edges:** `IsCrossClient=true` only for Owner/Admin-approved links (e.g., shared referral partners). Default is `false`.
- Contractors and guests **cannot** view Relationships list or cross-client edges.
- Relationship creation is flow/app-mediated — no bulk manual import without audit.

See `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md` for approved query patterns.

## AI Security (v1.1.0)

### Context policy
- `HVCG_AIContext` assembles scoped context per job per `docs/ai/AI_CONTEXT_POLICY.md`.
- Context is limited to entities the requesting user can access (ClientCode filter).
- No cross-client context assembly unless user is Owner/Admin.

### No autonomous external sends
- `ExternalSendBlocked=true` on all `HVCG_AIJobs`.
- Approving an AI output in `HVCG_AIApprovals` does **not** trigger email, Teams, or portal delivery.
- External communication requires a separate authorized human action outside the AI pipeline.

### Prompt injection
- `HVCG_AIPrompts` stores versioned system prompts — not user-editable at runtime.
- User-provided content (documents, meeting notes) is treated as **untrusted input** and sandboxed in context assembly.
- Flows must not concatenate raw user HTML/text into system prompts.
- Reject jobs where context assembly detects oversized or malformed input.

### Malicious documents
- AI jobs processing uploaded documents require human review before any output is acted upon.
- Source document hash and path recorded in `HVCG_AIAuditLog`.
- Suspicious documents: disable worker, write `HVCG_OperationalAlerts` type Security, follow `SOP_Security_Incident_Response.md`.

### Audit
- `HVCG_AIAuditLog` — immutable trail of job creation, context assembly, output generation, approval/rejection.
- `HVCG_AICostTracking` — cost attribution per job/worker.
- Purview audit for privileged SharePoint actions (admin).

Full AI security model: `docs/ai/AI_SECURITY_MODEL.md`

## Data Classification

| Class | Examples | Controls |
|-------|----------|----------|
| Restricted Client Financial | Tax returns, bank stmts, models | Label, no anonymous share, limited groups |
| Internal Confidential | Pricing, profitability, success fees | Internal groups only; hidden from client views |
| Internal General | SOPs, templates | Knowledge site; staff read |
| **AI Context** | Assembled job context | Scoped per AI_CONTEXT_POLICY; never in external sends |

## External Sharing

- Anonymous links: **Denied** on HVCG-Clients  
- Specific people / guest links: allowed with expiration (7–30 days recommended)  
- Guest accounts reviewed quarterly  

## Audit & Logging

- SharePoint audit (Purview) enabled tenant-wide (admin)  
- `HVCG_AutomationLogs` for flow actions  
- `HVCG_AuditEvents` for app-significant business events (approvals, stage changes)
- `HVCG_AIAuditLog` for AI job lifecycle (v1.1.0)
- `HVCG_OperationalAlerts` for operational/security incidents (v1.1.0)

## Secrets

- `.env` never committed  
- Graph app: certificate in Key Vault or secure laptop store  
- Power Automate: connection references under service account  

## Environment Separation

Dev sites must not contain real SSNs/Tax IDs/full bank statements. Use synthetic sample data.

## Offboarding

1. Remove from all `HVCG-Role-*` and `HVCG-Client-*`  
2. Transfer flow ownership if any personal  
3. Revoke guest invites  
4. Confirm OneDrive/Teams shared content  
5. Disable `HVCG_AIWorkers` entries for departing user  

## Incident Response (summary)

1. Contain sharing links / disable user / disable AI worker  
2. Purview audit search + AIAuditLog review  
3. Notify Owner  
4. Document in `HVCG_Issues` with type Security  
5. Write `HVCG_OperationalAlerts` row  

Full runbook: `docs/sops/SOP_Security_Incident_Response.md`
