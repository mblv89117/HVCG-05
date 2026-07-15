# SECURITY MODEL

## Principles

1. Least privilege  
2. Client data isolation by default  
3. MFA via Entra ID / Conditional Access  
4. No secrets in source control  
5. Auditability of privileged actions  
6. Time-bound contractor access  

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
| HVCG-Client-{ClientCode} | Access to that client’s library + related items (via views/flows) |

## SharePoint Permission Pattern

**CommandCenter site:** Staff role groups have Contribute/Edit on lists as per matrix. Contractors get limited list views via app filtering + item-level where practical; V1 uses app-layer filtering by assignment + library ACLs for files.

**Clients site:** Each library breaks inheritance. Grant:
- HVCG-Role-Owner, Administrator, OperationsManager: Edit
- PM/Analyst/Advisor on that engagement: Edit via membership in `HVCG-Client-{Code}`
- Client contacts: optional Contribute to upload folders only (01–14) if guest enabled — default V1: **upload via request links only**, no standing client membership

## Data Classification

| Class | Examples | Controls |
|-------|----------|----------|
| Restricted Client Financial | Tax returns, bank stmts, models | Label, no anonymous share, limited groups |
| Internal Confidential | Pricing, profitability, success fees | Internal groups only; hidden from client views |
| Internal General | SOPs, templates | Knowledge site; staff read |

## External Sharing

- Anonymous links: **Denied** on HVCG-Clients  
- Specific people / guest links: allowed with expiration (7–30 days recommended)  
- Guest accounts reviewed quarterly  

## Audit & Logging

- SharePoint audit (Purview) enabled tenant-wide (admin)  
- `HVCG_AutomationLogs` for flow actions  
- `HVCG_AuditEvents` for app-significant business events (approvals, stage changes)

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

## Incident Response (summary)

1. Contain sharing links / disable user  
2. Purview audit search  
3. Notify Owner  
4. Document in `HVCG_Issues` with type Security  

Full runbook: `docs/sops/SOP_Security_Incident_Response.md`
