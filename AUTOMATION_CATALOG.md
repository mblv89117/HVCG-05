# AUTOMATION CATALOG

All production flows owned by the **HVCG Ops Automation** service account.  
Each flow writes to `HVCG_AutomationLogs`. Idempotency via `HVCG_IdempotencyKey`.

**Mission:** Executive Dashboard release support  
**Health report (Master PM):** [`docs/automation/AUTOMATION_HEALTH_REPORT.md`](docs/automation/AUTOMATION_HEALTH_REPORT.md)  
**Inventory:** [`src/power-automate/inventory/automation-inventory.json`](src/power-automate/inventory/automation-inventory.json)  
**Center:** [`docs/automation/AUTOMATION_CENTER.md`](docs/automation/AUTOMATION_CENTER.md)  
**Duplicates:** [`docs/automation/DUPLICATE_FLOW_FINDINGS.md`](docs/automation/DUPLICATE_FLOW_FINDINGS.md)

Active count: **22** (4 deferred under `src/power-automate/archive/exec-dashboard-deferred/`).

| Flow | Trigger | Purpose | Release | Human approval |
|------|---------|---------|---------|----------------|
| HVCG_TaskDueSoonReminders | Daily 07:00 PT | Task due-soon reminders | ReleaseCandidate | Internal only |
| HVCG_OverdueTaskEscalation | Daily 07:30 PT | Overdue escalate owner→PM→Ops | ReleaseCandidate | Exec only if rule |
| HVCG_DeliverableApproval | Deliverables review states | Approval routing | ReleaseCandidate | Approver acts |
| HVCG_ApprovalOutcomeNotify | Approvals Approved/Rejected | Outcome notify + audit | ReleaseCandidate | Already human |
| HVCG_ChangeRequestIntake | ChangeStatus=Submitted | Change approval routing | ReleaseCandidate | Owner if fee impact |
| HVCG_CreateDocumentRequests | Manual/child | Seed document requests | ReleaseCandidate | No |
| HVCG_MissingDocumentReminders | Daily | Missing doc cadence | ReleaseCandidate | Client email flag |
| HVCG_ExecutiveWeeklyBrief | Mon 07:45 PT | Executive KPI brief | ReleaseCandidate | Owner content |
| HVCG_ExecutiveDecisionEscalation | RequiresExecutiveAttention | Exec escalation | ReleaseCandidate | Alert only |
| HVCG_ProjectStatusReminder | Weekly Thu | PM status reminder | ReleaseCandidate | Internal PM |
| HVCG_UpdateProjectHealth | Daily | Green/Yellow/Red | ReleaseCandidate | No |
| HVCG_WeeklyStatusSummary | Monday | **Ops** digest only | ReleaseCandidate | No exec KPI |
| HVCG_AutomationFailureDigest | Hourly | Failed-flow digest | Supporting | Ops only |
| HVCG_PaymentPastDueAlert | Daily | Past-due milestones | Supporting | Exec if material |
| HVCG_RenewalReminders | Daily | Renewal tasks | Supporting | No |
| HVCG_ClientOnboarding | Client Active | Onboarding orchestration | Supporting | Welcome if flag |
| HVCG_CreateClientWorkspace | Child | Client library | Supporting | No |
| HVCG_CreateProjectFromTemplate | Child | Template expand | Supporting | No |
| HVCG_LeadQualifiedCreateOpportunity | Lead Qualified | CRM | **Blocked** | OA-CRM |
| HVCG_OpportunityStageChangedNotify | Stage changed | CRM | **Blocked** | OA-CRM |
| HVCG_OpportunityWonCloseout | Won | CRM | **Blocked** | OA-CRM |
| HVCG_CapitalFundingStatusNotify | FundingStatus | CRM/Capital | **Blocked** | OA-CAP |

## Policy

- Do not invent new automations without Master PM assignment.  
- Do not deploy client-facing automations until QA issues GO.  
- Do not self-approve Production On.
