# Product AI Audit Requirements

## 1. Principle

If a governed AI action cannot be evidenced, it is not complete. Denied and failed attempts are retained.

## 2. Events that must be audited

| Event | When |
|-------|------|
| Job queued / started / completed / failed | Lifecycle |
| Context assembled | After package build (store refs, not secrets) |
| Output generated | With insight metadata snapshot |
| Review Pending / Accepted / Rejected / Dismissed | Decision time |
| Task conversion | On Accept path |
| Promote/publish attempt | Before and after |
| External send attempt | Must be human-initiated; AI attempt = deny + audit |
| Permission/tool denial | Immediately |
| Prompt-injection / secret / cross-client detection | Immediately |
| Prompt version change | On promotion |
| Worker enable/disable | Admin action |
| Disclaimer omitted at Approve | Deny + audit |

Primary store: `HVCG_AIAuditLog` (plus `HVCG_AIFeedback`, `HVCG_AICostTracking`, `HVCG_AI_Escalations`).

## 3. Required event fields

- Timestamp (UTC)
- Actor (WorkerId and/or human)
- JobId / CorrelationId / OutputId
- Action
- Target (list/item)
- ClientCode (if applicable)
- Result (Success / Denied / Failed / Pending)
- Risk level
- ApprovalStatus
- PromptId + PromptVersion
- Evidence references (source refs, decision reason, diff)
- Environment

No passwords, tokens, raw secrets, or unnecessary client payloads in audit bodies.

## 4. Retention

| Record | Minimum retention |
|--------|-------------------|
| AI drafts (rejected/superseded) | 90 days unless legal hold |
| Approved outputs + source refs | 3 years |
| Audit / approval / escalation | ≥ 1 year; 7 years for capital/finance/owner override / incidents |
| Cost tracking | 3 years |
| Prompt versions | Life of prompt + 3 years history |

Legal hold overrides purge. Purge is reviewed, never silent.

## 5. Integrity

- Append-only after acceptance
- Corrections = new linked events
- Actor from trusted identity where implemented
- Export of audit is itself audited

## 6. Reconciliation (release / sprint)

Before Production generative enablement:

1. Sample Approved outputs for source match.
2. Confirm no AI send attempts succeeded.
3. Confirm no verified SoR overwrites by AI workers.
4. Confirm reviewer ≠ generator for gated items.
5. Record reconciliation artifact for QA sign-off.
