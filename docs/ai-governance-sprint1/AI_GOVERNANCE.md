# Project Atlas AI Governance Framework

**Authority:** High Value Capital Group LLC
**Owner:** AI Governance Manager
**Applies to:** Every AI agent participating in Project Atlas
**Status:** Proposed governance baseline for owner review
**Scope:** Documentation only

## 1. Purpose

This framework defines how HVCG identifies, authorizes, supervises, audits, recovers, and retires AI agents. It keeps human authority explicit while enabling agents to perform bounded engineering and operating work.

The framework must:

- protect Production, Track 1, client data, financial data, credentials, and institutional knowledge;
- preserve module ownership;
- prevent autonomous high-impact actions;
- make every agent, prompt, permission, cost, action, and handoff visible;
- support safe interruption, recovery, rollback, and retirement;
- keep Project Atlas as institutional memory and system of record.

## 2. Governance principles

1. **Human authority:** AI recommends and executes bounded work; humans approve governed actions.
2. **Default deny:** Missing permission means no permission.
3. **Exclusive ownership:** Agents modify only assigned paths.
4. **Production protection:** Production access is never autonomous.
5. **Evidence before trust:** Claims require repository, test, audit, or approval evidence.
6. **Immutable versions:** Approved prompts and released governance artifacts are not silently edited.
7. **Minimum context:** Agents receive only the information necessary for assigned work.
8. **No self-approval:** Requester and approver must be distinct for governed actions.
9. **Fail closed:** Ambiguous permission, identity, environment, or approval stops execution.
10. **Documented recovery:** Every critical capability has a safe pause and recovery procedure.

## 3. Governance objects

| Object | Purpose | Authoritative record |
|--------|---------|----------------------|
| Agent | Stable identity and operational assignment | Agent Registry |
| Role | Reusable responsibility and privilege bundle | Permissions model |
| Assignment | Sprint, branch, worktree, task, owner | Agent Registry / Project Atlas |
| Prompt | Versioned operating instructions | Prompt Registry |
| Permission | Agent-resource-action-environment decision | Permissions Matrix |
| Approval | Human decision for a governed action | Approval Queue |
| Audit event | Immutable action and evidence record | Audit Log |
| Memory record | Approved institutional or working knowledge | Memory Standard |
| Risk finding | Governance exception requiring disposition | Risk Register |
| Handoff | Evidence-backed transfer of work or ownership | Project Atlas Handoffs |

## 4. Human roles

### Owner

Final authority for Production, financial transactions, external communication, sensitive client actions, public publication, agent activation/retirement, critical cost exceptions, and governance overrides.

### Master PM

Owns shared Project Atlas indexes, assigns work, resolves ownership collisions, coordinates sprints, and routes decisions to the Owner.

### AI Governance Manager

Owns the governance framework, registries, standards, permission definitions, risk criteria, audit requirements, and governance dashboard. The role does not inherit authority over other modules.

### System Architect / Technical Lead

Reviews cross-system architecture, security boundaries, data handling, tool design, and changes with broad blast radius.

### QA and Release Manager

Independently validates completion claims, regression evidence, protected-path compliance, and release readiness.

### Deployment Engineer

Owns approved deployment execution, environment safety, Track 1 freeze controls, rollback execution, and post-deployment validation.

### Module Engineer

Owns only the assigned module paths and sprint deliverables.

### Auditor

Has read-only access to approved governance records, evidence, and reports.

## 5. Agent lifecycle

```text
Proposed
  ↓ identity + owner + role + paths defined
Registered
  ↓ prompt + permissions + sprint approved
Inactive
  ↓ activation approval
Active
  ├─ Online
  ├─ Running
  ├─ Idle
  ├─ Awaiting Approval
  └─ Blocked
  ↓ task or sprint finished
Complete
  ↓ retention or replacement decision
Retired
```

Exceptional states:

- **Suspended:** temporary disable due to risk, incident, stale state, or owner direction.
- **Quarantined:** tools removed and evidence preserved during incident investigation.
- **Failed:** task cannot continue safely; recovery or reassignment required.

### Registration requirements

- unique Agent ID;
- display name and role;
- human owner;
- module ownership;
- owned and protected paths;
- branch and worktree policy;
- current sprint;
- approved prompt ID/version;
- model assignment;
- tool and permission profile;
- budget;
- escalation target;
- expected heartbeat;
- audit identity.

### Activation requirements

- registry record complete;
- prompt status Approved;
- permission review complete;
- branch/worktree isolation verified;
- no unresolved path collision;
- human owner assigned;
- applicable risk review complete;
- activation approval recorded.

### Suspension triggers

- unauthorized path modification;
- Production access attempt;
- missing or expired approval;
- credential exposure;
- cross-client data exposure;
- repeated failed tasks;
- stale heartbeat during active execution;
- excessive cost;
- prompt/version mismatch;
- unsafe retry behavior;
- owner or Master PM direction.

### Retirement requirements

- stop new work;
- remove tools and permissions;
- release locks;
- deprecate active prompts;
- archive audit and handoff evidence;
- reassign open tasks;
- record final cost and status;
- update Project Atlas through the authorized owner.

## 6. Approval matrix

| Action | Default | Minimum approver | Additional conditions |
|--------|---------|------------------|-----------------------|
| Read owned repository files | Allowed | None | Within assigned scope |
| Modify owned files | Allowed | None | Dedicated branch/worktree |
| Modify shared file | Blocked | Master PM / file owner | Lock or explicit ownership |
| Commit | Approval required | Human requestor / designated lead | QA proportionate to risk |
| Push | Approval required | Human requestor / designated lead | Commit exists; branch confirmed |
| Merge | Approval required | Master PM + Owner when material | Independent QA |
| Deployment | Approval required | Owner + Deployment Engineer | Release/rollback package |
| Production access | Owner only | Owner | Time-bound; audited |
| External email/message | Approval required | Designated human owner | Draft-first; recipient review |
| Financial transaction | Prohibited for AI | Owner performs or separately authorizes system | Segregation of duties |
| Prompt promotion | Approval required | AI Governance + human owner | QA and rollback version |
| Permission elevation | Approval required | Resource owner + AI Governance | Expiry and audit |
| Agent activation | Approval required | Master PM / Owner | Registration complete |
| Agent suspension | Allowed for safety | AI Governance, Master PM, or Owner | Notify owner; audit event |
| Agent retirement | Approval required | Master PM + Owner | Handoff and evidence archive |
| Cost exception | Approval required | Owner or delegated budget owner | Reason and new threshold |
| Governance override | Owner only | Owner | Time-bound and fully audited |

## 7. Communication standards

### Required message fields

- message ID;
- thread ID;
- timestamp;
- sender Agent ID;
- recipient Agent ID or human role;
- type;
- priority;
- subject;
- complete body;
- related branch/files;
- requested action;
- due date when applicable;
- acknowledgement requirement;
- status;
- reply reference.

### Message types

| Type | Use |
|------|-----|
| INFO | Status or evidence |
| REQUEST | Action required |
| BLOCKER | Work cannot safely continue |
| DECISION | Human or governance decision required |
| HANDOFF | Work ready for transfer or review |
| CONFLICT | Ownership, path, branch, or worktree collision |
| ACK | Receipt and understanding |
| RESOLVED | Thread closure |
| INCIDENT | Security or safety event |

### Rules

1. Read the official inbox before work and major milestones.
2. Acknowledge required directives.
3. Report blockers immediately.
4. Use one thread for one decision or incident.
5. Include evidence references, not unsupported completion claims.
6. Never include credentials, secrets, tokens, or unnecessary client data.
7. Handoffs must state branch, worktree, commit or dirty state, QA, risks, rollback, and next owner.
8. Critical incidents go to Owner, Master PM, AI Governance, Security, and the affected resource owner.

## 8. Escalation paths

| Trigger | First escalation | Second escalation | Stop condition |
|---------|------------------|-------------------|----------------|
| Path/ownership collision | Master PM | System Architect | No edit until resolved |
| Prompt or permission uncertainty | AI Governance | Owner | No tool execution |
| QA failure | QA Manager | Master PM | No commit/merge/deploy |
| Production request | Deployment Engineer | Owner | No access without approval |
| Client data risk | AI Governance / Security | Owner | Quarantine affected work |
| Financial action | Finance owner | Owner | AI does not transact |
| Cost threshold warning | Budget owner | Owner | Pause at hard limit |
| Security incident | Security / AI Governance | Owner | Suspend/quarantine |
| Repeated tool failure | Agent owner | System Architect | Disable unsafe tool |
| Unresolved blocker | Master PM | Owner | Reassign or defer |

## 9. Error handling

Agents classify errors before retry:

| Class | Examples | Response |
|-------|----------|----------|
| Validation | Missing field, invalid path | Correct input; no blind retry |
| Transient | Temporary network or service failure | Bounded retry with backoff |
| Conflict | Lock, branch, worktree, ownership collision | Stop and escalate |
| Authorization | Permission denied, expired approval | Stop; do not seek workaround |
| Data integrity | Mismatch, duplicate, incomplete evidence | Quarantine output |
| Security | Secret, cross-client data, Production attempt | Suspend and initiate incident |
| Budget | Threshold or quota exceeded | Pause and request exception |
| Unknown | Unclassified failure | Fail closed; escalate |

### Retry standard

- maximum attempts defined per tool;
- exponential backoff for transient failures;
- no automatic retry for external send, financial action, deployment, merge, permission change, or Production action;
- idempotency required for write retries;
- every failed and retried action audited;
- terminate retries when failure class changes or approval expires.

## 10. Recovery procedures

1. **Stabilize:** stop the task and prevent new side effects.
2. **Preserve:** retain logs, prompts, inputs, outputs, diffs, approvals, and tool results.
3. **Classify:** identify error, severity, environment, data class, and blast radius.
4. **Contain:** remove tools, revoke permission, release or retain locks as appropriate, quarantine output.
5. **Notify:** route to required human and governance roles.
6. **Recover:** resume from last verified checkpoint, rollback, or create a clean branch/worktree.
7. **Validate:** run targeted and regression QA.
8. **Approve:** obtain reactivation or continuation approval.
9. **Close:** write incident, recovery, and lesson-learned records.

Never recover by deleting evidence, bypassing approval, changing Production directly, or overwriting another agent’s work.

## 11. Governance dashboard

The dashboard must present:

- agent count by lifecycle, status, health, role, owner, and sprint;
- stale heartbeat, failed tasks, blockers, dirty work, branch drift, documentation, and QA;
- prompt versions by lifecycle and agent;
- tool/permission matrix with environment;
- pending approvals by risk and age;
- cost by agent, sprint, model, and completed task;
- open risks and incidents;
- audit events and evidence coverage;
- missing handoffs, QA, memory review, and documentation;
- Production and protected-resource access attempts;
- upcoming permission, prompt, memory, and agent review dates.

Dashboard data must distinguish:

- observed fact;
- agent-reported claim;
- human approval;
- calculated risk;
- stale or missing evidence.

## 12. Review cadence

| Review | Cadence | Owner |
|--------|---------|-------|
| Agent heartbeat / blockers | Continuous / daily | Agent owner |
| Approval queue | Daily | Owner / Master PM |
| Prompt and permission drift | Weekly | AI Governance |
| Cost thresholds | Weekly and monthly | Budget owner |
| Risk and incident review | Weekly; immediate for critical | AI Governance / Owner |
| Registry completeness | Monthly | AI Governance |
| Memory and documentation | Per sprint / quarterly | Knowledge Manager |
| Policy effectiveness | Quarterly | AI Governance / System Architect |
| Agent retirement candidates | Quarterly | Master PM |

## 13. Governance evidence

A sprint is not governance-complete until:

- registry identity is current;
- owned/protected paths are declared;
- prompt version is approved;
- permissions match the assignment;
- required approvals exist;
- QA is complete;
- audit evidence is resolvable;
- handoff and rollback are documented;
- Project Atlas updates are routed to the authorized owner;
- no unresolved critical risk remains.
