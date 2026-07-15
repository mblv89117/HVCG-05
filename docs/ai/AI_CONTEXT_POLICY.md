# AI Context Policy — HVCG OS

## Purpose

Define how context packages are assembled for AI jobs so models receive **minimum necessary**, **client-isolated**, and **classification-aware** data.

## What AI may access

| Allowed (when job-scoped) | Denied |
|---------------------------|--------|
| Client fields on the job’s `ClientCode` | Other clients’ records |
| Engagement/project metadata for that client | Cross-client Relationships unless Owner-approved job |
| Document **titles**, request status, folder paths | Full Restricted Financial file contents unless classification allows and review is required |
| Meeting agendas/notes marked Internal / job-linked | Unrelated mailbox contents |
| Prompt versions from `HVCG_AIPrompts` | Raw secrets, tokens, connection strings |
| Tool registry permissions for the Worker | Tools marked Prohibited / SendExternal |

## Context package assembly (`HVCG_AIContext`)

1. Resolve job → ClientCode → DataClassification ceiling.
2. Collect InputReferences (IDs only) then hydrate via approved Tools.
3. Apply redaction rules (SSN, full account numbers, tax IDs → mask).
4. Stamp PromptVersion, WorkerId, Cost estimate.
5. Persist package metadata; keep payload in secure storage / Note with retention.

## Client-data isolation

- Every job should carry `ClientCode` when client-related.
- Context assembly filters must include `ClientCode eq '{code}'`.
- Relationships with `IsCrossClient=true` are excluded unless JobType is Owner strategy and ApprovalStatus path is Owner.

## Role-based AI access

| Role | May request | May approve |
|------|-------------|-------------|
| Owner | All (internal) | Material capital / legal / pricing |
| Ops Manager | Ops + delivery jobs | SOP publish, follow-ups |
| PM / Advisor / Analyst | Domain jobs | Domain drafts |
| Contractor | None by default | None |
| Client / Guest | Never | Never |

## Sensitive financial handling

Restricted Client Financial content requires:
- DataClassification ≥ Restricted on job
- HumanReviewRequired = true
- No ExternalSend
- Output retention per AI_GOVERNANCE

## Prompt version control

- Only Active prompts in `HVCG_AIPrompts` may run.
- Job stores PromptVersion immutably after start.
- Prompt changes create a new version; never silently mutate Active mid-job.

## Output retention

- Outputs kept in `HVCG_AIOutputs` with link on job.
- Rejected / superseded outputs marked; purge policy for drafts >90 days (ops decision).
- Audit events retained ≥1 year.

## Human approval

See `AI_APPROVAL_MATRIX.md`. Defaults: HumanReviewRequired=true, ExternalSendBlocked=true.

## Prohibited autonomous actions (v1.x)

- Send email/Teams/Outside messages
- Create external sharing links
- Change pricing, invoices, or legal terms without approval
- Auto-approve own outputs
- Cross-client inference for contractors

## Audit, feedback, cost

- `HVCG_AIAuditLog` on status transitions
- `HVCG_AIFeedback` for corrections → prompt improvement
- `HVCG_AICostTracking` with environment thresholds (MONITORING.md)

## Data minimization & providers

- Prefer summaries over full document dumps
- Restrict model providers to approved enterprise channels (Owner OA)
- No personal API keys in flows

## Redaction & incidents

- Redact before prompt call when classification Restricted
- On suspected leakage: stop Workers, revoke keys, open Security incident SOP, preserve AIAuditLog
