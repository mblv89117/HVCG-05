# Project Atlas Agent Permissions and RBAC

**Policy owner:** AI Governance Manager
**Resource owners:** HVCG Owner, Master PM, System Architect, Deployment Engineer, module owners
**Default:** Deny

## 1. Authorization model

An action is authorized only when all conditions are true:

```text
Registered identity
+ Active assignment
+ Role permits capability
+ Resource owner grants scope
+ Environment permits action
+ Data classification is within ceiling
+ Required human approval is valid
+ Tool is enabled and version-approved
+ No suspension, incident, collision, or expired gate
= Authorized action
```

Missing or contradictory information denies the action.

## 2. Permission vocabulary

| Level | Definition |
|-------|------------|
| None | Resource is unavailable |
| Read | View approved information |
| Write | Create/modify within owned scope |
| Execute | Run approved bounded operation |
| Approval Required | Each use requires a valid human decision |
| Owner Only | HVCG Owner is the decision authority |

Permissions are resource-, action-, environment-, assignment-, and time-specific. “Write” never implies permission to deploy, merge, send externally, transact, or access Production.

## 3. RBAC roles

### Owner

- final governance authority;
- approves Production, deployment, public publication, financial actions, external client actions, critical permissions, overrides, activation, and retirement;
- can view all governance records subject to legal/privacy constraints.

### Master PM

- assigns agents and work;
- owns shared Project Atlas indexes;
- resolves path/branch/worktree conflicts;
- approves routine assignment activation, commit, and push when delegated;
- cannot bypass Owner-only Production or financial gates.

### AI Governance Manager

- manages Agent, Prompt, Tool, Permission, Risk, Approval, and Audit governance definitions;
- suspends agents for safety;
- recommends prompt/permission promotion;
- cannot self-approve its own elevation or modify other module workspaces.

### System Architect / Technical Lead

- reviews architecture, data boundary, tool design, cross-system dependency, and high-blast-radius changes;
- can reject unsafe technical design;
- cannot deploy or modify module-owned code without assignment.

### QA and Release Manager

- reads module source and evidence;
- executes approved tests in non-Production environments;
- records independent QA result;
- cannot alter implementation to manufacture a pass.

### Deployment Engineer

- executes approved deployment and rollback;
- administers approved environment connections;
- has no standing autonomous Production write authority;
- operates only within approved release windows.

### Documentation and Knowledge Manager

- writes assigned documentation paths;
- reads approved source/evidence required for accuracy;
- proposes shared Atlas updates to Master PM;
- cannot expose Restricted information.

### Module Engineer

- reads and writes owned module paths;
- executes local build/test/browser tools;
- cannot edit protected modules or shared indexes;
- cannot merge, deploy, publish, send externally, transact, or modify Production.

### Auditor

- read-only governance/evidence access;
- no prompts, permissions, approvals, execution, or source modifications.

## 4. Baseline role matrix

Legend: `R` Read, `W` Write, `X` Execute, `A` Approval Required, `O` Owner Only, `—` None.

| Resource | Owner | Master PM | AI Governance | Architect | QA | Deployment | Docs | Module Engineer | Auditor |
|----------|-------|-----------|---------------|-----------|----|------------|------|-----------------|---------|
| Agent Registry | O | W | W | R | R | R | R | R own | R |
| Prompt Registry | O | A | W | R | R | R | R | R own | R |
| Permission Registry | O | A | W | R | R | R | R | R own | R |
| Audit Log | R | R | R | R | R | R | R | R own | R |
| Approval Queue | O | A | R | R | R | R | R | R own | R |
| Risk Register | O | W | W | W | W | W | W | W own | R |
| Project Atlas shared indexes | O | W | — | R | R | R | R/propose | R/propose | R |
| Module-owned source | R | R | — | R | R | R | R | W own | R |
| Git branch/worktree | R | W/assign | W own | W own | R | W own | W own | W own | R |
| Commit | A | A | A | A | A | A | A | A | — |
| Push | A | A | A | A | A | A | A | A | — |
| Merge | O | A | — | R | R | A | — | — | R |
| Development deploy | A | A | — | R | R | X with approval | — | — | R |
| Production deploy | O | R | — | R | R | X with Owner approval | — | — | R |
| External communication | O | A | — | — | — | — | Draft | Draft | R approved |
| Financial transaction | O | — | — | — | — | — | — | — | R evidence |
| Cost exception | O | A delegated | Recommend | Recommend | R | Recommend | Recommend | Recommend | R |
| Agent suspension | O | X | X | Recommend | Recommend | X during incident | Recommend | Self-pause | R |
| Agent retirement | O | A | Recommend | Recommend | R | Recommend | Recommend | Recommend | R |

## 5. Tool permission matrix

| Tool/resource | Module Engineer | AI Governance | QA | Deployment | Restrictions |
|---------------|-----------------|---------------|----|------------|--------------|
| Filesystem | W owned | W governance | R + test output | W deployment-owned | Path allow-list |
| Git read | R | R | R | R | Repository evidence |
| Git branch/worktree | X assignment | X governance assignment | R | X deployment assignment | Dedicated worktree |
| Git commit | A | A | A | A | Human authorization |
| Git push | A | A | A | A | Human authorization |
| Terminal | X local | X local | X tests | X approved ops | Command scope |
| Browser | X local/non-Prod | X local | X QA | X approved env | No credential bypass |
| Microsoft 365 | — by default | — | — | A | Environment/data scope |
| Gmail | — | — | — | — | No AI autonomous access |
| Calendar | R only if assigned | — | — | — | Minimum necessary |
| Production | — | — | R evidence | A / time-bound | Owner approval |
| Deployment | — | — | R | X approved | Release package |
| Client data | R minimum necessary | R governance metadata | R test-safe | R deployment need | Classification ceiling |
| Financial data | A / role-specific | R governance metadata | R masked | R deployment need | Owner/Finance gate |

## 6. Environment policy

| Environment | Default posture |
|-------------|-----------------|
| Local mock | Module tools allowed within owned paths |
| Development | Read/write only when assignment and resource owner permit |
| Test/Staging | QA and approved integration behavior |
| Production | Owner-gated; Deployment executes; all actions audited |

Development permission does not imply Production permission.

## 7. Data classifications

| Classification | Examples | AI access |
|----------------|----------|-----------|
| Public | Published website content | Read/write within assignment |
| Internal | Non-sensitive operating docs | Minimum necessary |
| Confidential | Client or business internal data | Explicit role and assignment |
| Restricted | Financial, legal, credentials, regulated data | Owner/data-owner approval; minimized |
| Secret | Passwords, tokens, private keys | Never place in prompts/memory/audit |

## 8. Approval matrix

| Request | Requester allowed | Approver | Expiry |
|---------|-------------------|----------|--------|
| Prompt promotion | Prompt owner | AI Governance + human owner | Until superseded |
| Tool enablement | Agent owner | Tool/resource owner | Assignment or shorter |
| Permission elevation | Agent owner | Resource owner + AI Governance | Time-bound |
| Commit/push | Assignment agent | Human owner / delegated lead | Specific diff/commit |
| Merge | Master PM/integration | Owner or delegated authority | Specific commit set |
| Deployment | Deployment Engineer | Owner / release authority | Release window |
| Production access | Deployment Engineer | Owner | Shortest practical window |
| Cost exception | Agent/budget owner | Owner/delegated budget owner | Billing period/assignment |
| External communication | Assigned staff | Designated human sender | Specific message/recipient |
| Financial action | Authorized human | Owner/finance authority | Specific transaction |

## 9. Permission request record

Every request includes:

- requester Agent ID and Assignment ID;
- resource and action;
- environment;
- data classification;
- business purpose;
- requested start/expiry;
- tool/version;
- risk and blast radius;
- safeguards;
- evidence;
- approver;
- decision and conditions.

## 10. Segregation of duties

The same agent cannot:

- request and approve its own permission elevation;
- implement and independently certify QA;
- approve and execute an Owner-only Production action;
- create and approve its own prompt promotion;
- request and approve its own cost exception;
- modify audit evidence for its own governed action.

## 11. Revocation

Permissions are revoked when:

- assignment completes or expires;
- prompt is deprecated/replaced;
- agent is suspended, quarantined, or retired;
- role or human owner changes;
- incident occurs;
- heartbeat becomes stale during active high-risk work;
- resource owner withdraws access;
- approval expires;
- least-privilege review identifies excess access.

Revocation must be audited and verified.
