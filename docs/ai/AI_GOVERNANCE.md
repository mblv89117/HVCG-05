# AI Governance — HVCG OS

Product AI controls package (inventory, metadata, risks, matrix, patterns, review, audit, disclosure, release sign-off): [PRODUCT_AI_GOVERNANCE_INDEX.md](PRODUCT_AI_GOVERNANCE_INDEX.md).

## Principles

1. AI drafts; humans decide.
2. No external send in v1.x without human approval **and** explicit send step (never auto).
3. Client isolation is a hard boundary.
4. Every job is auditable (who, what, when, cost, confidence).
5. Cost and retention are controlled.

## System of record

| Concern | List |
|---------|------|
| Job orchestration | HVCG_AIJobs / HVCG_AIJobSteps |
| Bounded workers | HVCG_AIWorkers |
| Prompts | HVCG_AIPrompts |
| Tools | HVCG_AIToolRegistry |
| Context | HVCG_AIContext |
| Outputs | HVCG_AIOutputs |
| Approvals / reviews | HVCG_AIApprovals, HVCG_AI_Reviews |
| Feedback | HVCG_AIFeedback |
| Audit / cost / escalate | HVCG_AIAuditLog, HVCG_AICostTracking, HVCG_AI_Escalations |

Specialized queues (`HVCG_AI_MeetingSummaries`, …) remain for domain routing; link via JobId.

## Bounded agent tasks (future-ready)

Workers may be configured for: meeting summaries, task extraction, status reports, missing docs, client follow-up **drafts**, SOP drafts, executive briefs, next actions, inconsistency detection, lender/investor package **drafts**.

## Job lifecycle

`Queued → Running → AwaitingReview → Approved|Rejected → Completed`  
Failures: `Failed` with ErrorMessage + RetryCount. Escalations via `HVCG_AI_Escalations`.

## Status transitions (enforced by process)

- Cannot jump to Completed while HumanReviewRequired and ApprovalStatus ≠ Approved.
- Cannot set ExternalSend from any automation.
- PromptVersion and ToolPermissions required before Running.

## Cost controls

- Estimate at queue time; actual at complete.
- Threshold alerts via OperationalAlerts / MONITORING.
- Owner may pause Workers when spend exceeds week budget.

## Feedback & correction

Reviewers log corrections in Feedback → Ops updates Prompts → new PromptVersion.

## Ownership

| Role | Responsibility |
|------|----------------|
| Owner | Provider approval, capital/legal gates, cost ceilings |
| Administrator | Workers, tools, connections |
| Ops Manager | Queue triage, SOP publish |
| Domain leads | Domain reviews |
