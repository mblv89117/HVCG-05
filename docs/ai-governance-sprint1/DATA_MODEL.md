# AI Governance Sprint 1 — Data Model

All Phase 1 records are synthetic TypeScript objects in `apps/hvcg-ai-governance/src/data/mockData.ts`.

## Entities

### AgentRecord

Primary key: `id`

Contains identity, role, module ownership, branch, worktree, sprint, status, health, activity, commit, task, human owner, responsibilities, owned/protected paths, prompt/model/tools, blockers, activity, handoffs, QA, cost, and risk.

### AgentHealth

One-to-one with AgentRecord:

- heartbeat age;
- context usage;
- failed tasks;
- blockers;
- uncommitted files;
- branch drift;
- documentation status;
- QA status.

### PromptRecord

Primary key: `id`; version identity is `id + version`.

Contains lifecycle status, owning agent, created/updated dates, approver, change summary, and rollback version.

### PermissionRecord

Composite key: `agentId + resource`.

Resources: Filesystem, Git, Terminal, Browser, Microsoft 365, Gmail, Calendar, Production, Deployment, Client data, Financial data.

### AuditEntry

Primary key: `id`.

Append-style evidence event with timestamp, agent, action, target, result, risk, approval status, and evidence reference.

### ApprovalRequest

Primary key: `id`.

Represents Commit, Push, Merge, Deployment, Production access, Tool permission, Prompt promotion, Agent activation/deactivation, and Cost exception gates.

### RiskFinding

Primary key: `id`.

Represents all eleven Sprint 1 compliance categories with agent, severity, state, evidence, and remediation.

### PolicyRecord

Primary key: `id`.

Readable governance policy with title, summary, owner, review date, and required controls.

## Relationship map

```text
AgentRecord 1 ── * PromptRecord
AgentRecord 1 ── * PermissionRecord
AgentRecord 1 ── * AuditEntry
AgentRecord 1 ── * ApprovalRequest
AgentRecord 1 ── * RiskFinding
AgentRecord 1 ── 1 AgentHealth
AgentRecord 1 ── 1 CostSummary
PolicyRecord (independent control catalog)
```

## Future persistence requirements

- tenant and environment scope on every record;
- immutable prompt versions and audit events;
- server-generated timestamps and actor identity;
- referential integrity to approved agent IDs;
- least-privilege row and field access;
- retention policies;
- no secrets or raw credentials;
- explicit owner approval evidence for critical actions.
