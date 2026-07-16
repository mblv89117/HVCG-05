# AI Governance Sprint 1 — Permission Model

## Principles

1. Default deny.
2. Scope access to module ownership.
3. Production never receives autonomous Execute permission.
4. Deployment, client, and financial access require explicit human authority.
5. The UI role is not a substitute for backend enforcement.
6. Every permission change must create an audit event.

## Levels

| Level | Meaning |
|-------|---------|
| None | No access |
| Read | View approved data |
| Write | Create or modify within owned scope |
| Execute | Run an approved local/internal tool |
| Approval Required | Human decision required for each governed use |
| Owner Only | Reserved for HVCG owner authority |

## Phase 1 constraints

- Production values are only `None` or `Approval Required`.
- Gmail is `None` for every mock agent.
- Microsoft 365 is disabled except a mock approval-required state for Deployment.
- No live client or financial records are present.
- Approval buttons are disabled for Governance Admin and Auditor.
- Cost details are hidden from Auditor.
- Prompt creation is disabled for Auditor.

## Future enforcement sequence

1. Trusted identity and role claims.
2. Server-side policy decision.
3. Per-tool capability token with short TTL.
4. Action-specific approval evidence.
5. Tool execution with idempotency.
6. Append-only audit write.
7. Outcome and evidence reconciliation.

## Production rule

No AI agent may autonomously obtain Production write or Execute permission. Production changes require owner approval, deployment ownership, QA, rollback evidence, and the active release gate.
