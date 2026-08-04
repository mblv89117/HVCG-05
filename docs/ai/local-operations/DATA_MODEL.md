# Phase 1 — Data model changes

## Hub (authoritative for Phase 1 runtime)

- `AiJobRecord` — governed job lifecycle
- `AiAuditEvent` — immutable correlation trail
- `OperationsQueueItem` — role-neutral queue
- Blocked authoritative write attempts log

## SharePoint (schema only — not deployed)

### `HVCG_AIJobs` additive fields

SourceRecordType, SourceRecordId, RequestedOperation, AssignedAiRole, WorkValueTier, RedactionStatus, ValidationStatus, OutputPayload, OutputSummary, RecommendedNextAction, RequiresMannyApproval, MannyDecision, MannyDecisionDate, ErrorType, AuditCorrelationId, ProcessingStatusExtended

### New list `HVCG_OperationsQueue`

Assignee (configurable owners), Priority, Deadline, WorkValueTier, QueueStatus, EscalationReason, DependencyIds, SourceRecordType/Id, RequiresMannyApproval, Description, HVCG_IdempotencyKey

## Work-value classification fields

Tier, Requires Manny Judgment/Approval, AI/Automation Eligible, Future Human Role, time/value/impact/risk, recommended owner/disposition, escalation/duplicate/repeat/automation flags, estimated/actual Manny time.
