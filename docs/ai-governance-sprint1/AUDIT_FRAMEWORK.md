# Project Atlas AI Audit Framework

**Audit owner:** AI Governance Manager
**Evidence owners:** Acting agent, human approver, resource owner, QA
**Principle:** If a governed action cannot be evidenced, it is not complete.

## 1. Objectives

The audit framework provides:

- attribution to a stable agent and human authority;
- reconstruction of decisions and side effects;
- evidence of ownership, approval, QA, and policy compliance;
- detection of unauthorized or anomalous behavior;
- support for incident response, rollback, cost review, and retirement;
- durable institutional memory without storing secrets or unnecessary client data.

## 2. Event envelope

Every event requires:

| Field | Description |
|-------|-------------|
| Event ID | Globally unique immutable identifier |
| Event version | Schema version |
| Occurred at | Trusted UTC event time |
| Recorded at | Trusted UTC persistence time |
| Agent ID | Stable acting identity |
| Assignment ID | Authorized task context |
| Session ID | Runtime instance |
| Human actor ID | Approver/operator when applicable |
| Role | Effective RBAC role |
| Action | Controlled action taxonomy |
| Target | Resource identifier and version |
| Environment | Local, Development, Test, Staging, Production |
| Result | Pending, Success, Denied, Failed, Partial, Cancelled |
| Risk | Low, Medium, High, Critical |
| Approval ID | Bound human decision, if required |
| Prompt ID/version | Runtime instruction version |
| Tool ID/version | Executing tool |
| Policy version | Evaluated governance baseline |
| Correlation ID | End-to-end task/incident trace |
| Parent event ID | Causal predecessor |
| Evidence references | Diff, test, report, message, commit, artifact |
| Summary | Redacted human-readable description |
| Integrity value | Hash/signature metadata when implemented |

## 3. Event taxonomy

### Identity and lifecycle

- agent proposed;
- agent registered;
- assignment created;
- agent activated;
- heartbeat;
- status changed;
- agent suspended;
- agent quarantined;
- agent reactivated;
- assignment completed;
- agent retired.

### Prompt and memory

- prompt drafted;
- prompt reviewed;
- prompt approved/promoted;
- prompt rollback;
- prompt deprecated/replaced;
- memory proposed;
- memory approved;
- memory corrected;
- memory superseded;
- memory expired/deleted.

### Permissions and approvals

- permission requested;
- permission granted/denied;
- permission used;
- permission expired/revoked;
- approval requested;
- approval approved/denied/expired/revoked;
- owner override.

### Engineering

- branch/worktree created;
- file read/write/delete;
- collision detected;
- test/build/QA executed;
- commit requested/created;
- push requested/executed;
- merge requested/executed;
- deployment requested/executed;
- rollback requested/executed.

### Communications

- directive received/acknowledged;
- blocker raised;
- decision requested/recorded;
- handoff sent/accepted;
- external communication drafted/approved/sent by human.

### Security and operations

- policy denial;
- protected path attempt;
- Production access attempt;
- secret detected;
- data boundary violation;
- cost threshold warning/breach;
- retry;
- tool failure;
- incident opened/contained/recovered/closed.

## 4. Audit timing

| Event type | Required timing |
|------------|-----------------|
| Approval/permission request | Before decision |
| Approval/permission decision | Before governed execution |
| Tool action | Before attempt and after outcome |
| External/Production/financial action | Pre-flight and post-action reconciliation |
| Denial/failure | Immediately |
| Lifecycle transition | At transition |
| Incident | At detection and every major phase |

For side-effect actions, use paired `ATTEMPTED` and `COMPLETED/FAILED/UNKNOWN` events.

## 5. Evidence requirements

Evidence references must be:

- resolvable by an authorized reviewer;
- immutable or content-addressed where practical;
- specific to the audited action;
- retained at least as long as the event;
- redacted of secrets and unnecessary sensitive data.

Examples:

- repository path and diff;
- commit SHA;
- branch/worktree;
- test command and report;
- screenshot;
- approval decision record;
- message/thread ID;
- prompt or policy version;
- deployment/rollback report;
- incident report.

An agent assertion such as “tests passed” is not evidence without the command/result artifact.

## 6. Integrity controls

1. Accepted events are append-only.
2. Corrections are new events linked to the original.
3. Actor identity comes from trusted session binding.
4. Timestamps use trusted server time where implemented.
5. Event IDs are unique and non-reusable.
6. Sequence/correlation gaps are detectable.
7. Evidence hashes are recorded when practical.
8. Denied, failed, cancelled, and partial events are retained.
9. Audit writers cannot rewrite their own history.
10. Export and deletion are themselves audited.

## 7. Privacy and redaction

Audit records must not contain:

- passwords, tokens, keys, cookies, or connection strings;
- full raw prompts/context when a version reference is sufficient;
- unnecessary client documents or message bodies;
- regulated or financial data not required for evidence;
- hidden chain-of-thought or private model reasoning.

Use identifiers, classification labels, hashes, and redacted summaries.

## 8. Retention schedule

Final retention is subject to legal and compliance approval. Until superseded:

| Record | Minimum retention |
|--------|-------------------|
| Routine local read/test events | 1 year |
| Prompt, permission, agent lifecycle | 3 years |
| Commit, push, merge, release evidence | 3 years |
| Production, deployment, rollback | 7 years |
| Security incident and owner override | 7 years |
| Financial-action evidence | 7 years or finance policy |
| Approval decisions | Same as governed action |
| Denied/failed actions | Same as equivalent successful action |

Legal hold overrides deletion. Retention expiry creates a reviewable purge request, not automatic silent deletion.

## 9. Audit access

| Role | Access |
|------|--------|
| Owner | Full authorized view/export |
| Master PM | Program records; sensitive fields minimized |
| AI Governance | Governance records and metadata |
| Security | Security incidents and relevant traces |
| QA | Test/release evidence |
| Module owner | Own assignments/events |
| Auditor | Read-only approved records |
| Agent | Own current assignment, minimum necessary |

Export requires purpose, requester, scope, classification, approval where needed, and an export audit event.

## 10. Monitoring and alerts

Immediate alerts:

- Production access attempt;
- protected-path modification;
- secret detection;
- cross-client data event;
- missing/invalid approval;
- owner override;
- audit write failure;
- repeated denied tool use;
- high-cost anomaly;
- event/evidence integrity mismatch.

Dashboard measures:

- events by action/result/risk/agent;
- approval coverage;
- evidence completeness;
- denied/failed trends;
- stale unresolved attempts;
- Production/protected access attempts;
- permission usage versus grants;
- audit ingestion delay;
- integrity verification failures;
- open incidents and recovery status.

## 11. Reconciliation

At each milestone and handoff:

1. enumerate expected governed actions;
2. match each to events;
3. verify approvals predate execution;
4. verify evidence resolves;
5. reconcile partial/unknown outcomes;
6. confirm no prohibited action occurred;
7. record reconciliation result.

## 12. Audit failure procedure

If audit persistence or evidence capture fails:

1. stop governed side-effect actions;
2. preserve local non-secret evidence;
3. mark outcome unknown when uncertain;
4. notify AI Governance and resource owner;
5. restore audit capability;
6. reconcile before resuming;
7. never fabricate or backdate evidence.
