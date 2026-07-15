# AUTOMATION CATALOG

All production flows owned by the **HVCG Ops Automation** service account.  
Each flow writes to `HVCG_AutomationLogs`. Idempotency via `HVCG_IdempotencyKey`.

| Flow | Trigger | Purpose | Premium? | Human approval |
|------|---------|---------|----------|----------------|
| HVCG_ClientOnboarding | ClientStage → Active Client | Orchestrate master checks, engagement, project, workspace, docs, tasks, billing, logging | No | Welcome email if customized |
| HVCG_CreateProjectFromTemplate | Manual / child of onboarding | Expand template JSON into tasks/docs/deliverables/milestones | No* | No |
| HVCG_CreateClientWorkspace | Called by onboarding | Library + folders + permissions + update Client.SharePointLibraryUrl | No* | No |
| HVCG_CreateDocumentRequests | Child | Seed document requests from template | No | No |
| HVCG_MissingDocumentReminders | Daily scheduled | Cadence 0/3/7/14 business days; escalate to PM | No | Client email enabled only if flag true |
| HVCG_OverdueTaskEscalation | Daily | Mark overdue; notify owner→PM→Ops; executive only if critical+rule | No | No |
| HVCG_DeliverableApproval | Status → Internal Review / Client Review | Create approval task / Adaptive card | No | Approver must act |
| HVCG_RenewalReminders | Daily | 60/30/14 day renewal tasks | No | No |
| HVCG_ExecutiveDecisionEscalation | RequiresExecutiveAttention = true | Notify Manny + log | No | Content is alert only |
| HVCG_WeeklyStatusSummary | Monday morning | Ops digest; separate Monday executive digest | No | No |
| HVCG_UpdateProjectHealth | Daily / on task change | Green/Yellow/Red rules from config | No | No |
| HVCG_PaymentPastDueAlert | Daily | Flag past due; notify Ops; executive if material | No | No |
| HVCG_ChangeRequestIntake | ChangeStatus = Submitted | Route approval; flag out-of-scope | No | Owner if fee impact |

## AI queues (ready, not autonomous)

Ten `HVCG_AI_*` lists accept future agent writes. **Policy:** `HumanApprovalRequired=true` by default; never auto-send `HVCG_AI_DraftEmails`. No V1 flows publish AI content externally.

## Idempotency Patterns

- Key format: `{artifact}|{clientCode}|{templateKey}|{businessDate}|{itemKey}`
- Before create: Filter list by HVCG_IdempotencyKey; skip if found; log `SkippedDuplicate`

## Error Handling

- Scope try/catch on each major stage
- Log Failed with message
- Notify HVCG-Role-Administrator on failure
- Do not retry unlimited; max 3 with delay

## Definition Packages

Logical flow definitions: `src/power-automate/flows/*.json` (portable design specs for rebuild in Power Automate designer / PAC).
