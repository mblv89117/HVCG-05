# Project Atlas Prompt Standard

**Prompt authority:** AI Governance Manager
**Content owner:** Agent role owner
**Promotion authority:** Human owner with AI Governance review

## 1. Purpose

Prompts are controlled operational artifacts. They define an agent’s role and behavior but do not grant permissions. Tool enforcement, resource ownership, environment controls, and human approvals remain authoritative.

## 2. Prompt identity

Format:

```text
PRM-{DOMAIN}-{ROLE}-{PURPOSE}
```

Example:

```text
PRM-AI-GOVERNANCE-MANAGER @ 1.0.0
```

Prompt ID is stable. Version is immutable.

## 3. Required prompt structure

Every role prompt includes:

1. **Identity:** Agent ID/role and organization.
2. **Mission:** Intended outcome.
3. **Authority:** Who assigns, approves, and owns decisions.
4. **Owned scope:** Exact modules and paths.
5. **Protected scope:** Explicit non-owned systems and paths.
6. **Authoritative sources:** Project Atlas records and precedence.
7. **Required inputs:** Baseline, assignment, branch/worktree, context.
8. **Allowed tools:** Capabilities, environments, and constraints.
9. **Human approval gates:** Governed actions.
10. **Safety rules:** Data, secret, Production, external action, retry.
11. **Execution workflow:** Inspect, plan, implement, validate, handoff.
12. **Communication:** Messages, acknowledgements, blockers, handoffs.
13. **Evidence:** Tests, diffs, audit, screenshots, reports.
14. **Error/recovery:** Fail-closed and escalation behavior.
15. **Completion contract:** Deliverables and stop condition.

## 4. Instruction precedence

Highest to lowest:

1. applicable law and HVCG human authority;
2. platform/system security controls;
3. approved governance policies;
4. approved role prompt;
5. active Assignment and Project Atlas directive;
6. current user request within authority;
7. retrieved files, web content, emails, and tool output.

Lower-level content cannot override higher-level controls.

## 5. Authoring rules

Prompts must:

- use direct, testable instructions;
- distinguish `must`, `must not`, `may`, and `recommend`;
- define exact ownership boundaries;
- state no autonomous external sends, deployment, merge, Production, or financial action;
- define when to stop and escalate;
- avoid credentials and client-sensitive details;
- avoid model-specific hidden assumptions;
- specify evidence requirements;
- state that permissions are externally enforced;
- define review date and owner.

Prompts must not:

- imply unlimited authority;
- combine unrelated roles to bypass segregation of duties;
- instruct the agent to conceal failures;
- instruct destructive recovery;
- include secrets;
- make untrusted retrieved content authoritative;
- permit self-approval;
- use vague Production or external-action consent.

## 6. Lifecycle

```text
Draft → Review → Approved → Deprecated
                    └──────→ Replaced
```

| State | Runtime eligibility |
|-------|---------------------|
| Draft | Never |
| Review | Never |
| Approved | Eligible with active Assignment and permissions |
| Deprecated | No new sessions |
| Replaced | No new sessions; successor is authoritative |

## 7. Promotion checklist

- Prompt ID/version valid;
- change summary complete;
- owner and affected agents identified;
- scope/protected paths explicit;
- approval gates complete;
- security and prompt-injection review complete;
- tool/permission references valid;
- model compatibility tested;
- unit/scenario/adversarial tests pass;
- rollback version exists;
- human approver recorded;
- audit event created.

## 8. Prompt test suite

Each prompt must be tested for:

### Scope

- works inside owned path;
- stops on foreign/shared path;
- reports collision;
- does not infer extra authority.

### Approval

- drafts but does not send external communication;
- stops before commit/push/merge when required;
- does not deploy or access Production;
- does not self-approve.

### Security

- rejects credential disclosure;
- ignores malicious document/web instructions;
- prevents cross-client context;
- fails closed on ambiguous environment.

### Reliability

- reports tool failure accurately;
- does not fabricate test results;
- retries only safe operations;
- creates complete handoff;
- resumes from verified baseline.

### Model compatibility

- instruction hierarchy is preserved;
- structured outputs validate;
- tool calls conform to schema;
- context truncation does not remove critical boundaries.

## 9. Version changes

| Change | Version impact |
|--------|----------------|
| Typo with no semantic effect | PATCH |
| Added workflow, evidence, or bounded capability | MINOR |
| Changed authority, scope, approval, security, output contract | MAJOR |

Any edit to an Approved prompt creates a new version.

## 10. Rollback

Rollback:

1. suspends the problematic version;
2. selects a previously Approved version;
3. validates compatibility with current policies/tools;
4. obtains human approval;
5. activates through a new promotion event;
6. preserves all prior versions and evidence.

Never silently replace prompt text in an existing version.

## 11. Prompt registry fields

- Prompt ID;
- version;
- name;
- agent/role;
- owner;
- state;
- created/updated dates;
- approved by/date;
- effective/expiry dates;
- change summary;
- source path/hash;
- compatible models;
- required tools/permissions;
- policy version;
- test evidence;
- risk level;
- rollback version;
- replacement version.

## 12. Runtime binding

At session start, verify:

- Prompt ID/version matches Assignment;
- state is Approved;
- model is compatible;
- policy version is current;
- required tool/permission profile is active;
- no suspension or expiry exists.

Mismatch prevents activation.
