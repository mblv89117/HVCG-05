# Project Atlas Agent Registry and Identity System

**Registry owner:** AI Governance Manager
**Assignment owner:** Master PM
**Human authority:** HVCG Owner
**Status:** Proposed standard

## 1. Registry purpose

The Agent Registry is the authoritative inventory of every AI identity permitted to participate in Project Atlas. A chat session, model, process, branch, or worktree is not an agent identity by itself.

No agent may begin governed work until its identity and assignment are registered.

## 2. Identity hierarchy

```text
Organization: HVCG
  └── Agent Role (stable identity)
       └── Assignment (sprint/task)
            └── Session (ephemeral execution)
                 └── Action (audited event)
```

### Stable Agent ID

Format:

```text
AGT-{DOMAIN}-{ROLE}-{NNN}
```

Examples:

- `AGT-PM-MASTER-001`
- `AGT-AI-GOVERNANCE-001`
- `AGT-QA-RELEASE-001`

Rules:

- uppercase;
- globally unique;
- never recycled;
- remains stable across model, prompt, branch, and sprint changes;
- retired IDs stay reserved.

### Assignment ID

Format:

```text
ASN-{AGENT_ID}-{YYYYMMDD}-{NNN}
```

An assignment binds the agent to a current sprint, task, branch, worktree, prompt version, permissions, budget, and human owner.

### Session ID

Format:

```text
SES-{AGENT_ID}-{UTC_TIMESTAMP}-{RANDOM}
```

Sessions are ephemeral. Every audit event must include Agent ID, Assignment ID, and Session ID.

## 3. Required registry fields

### Identity

- Agent ID
- display name
- role
- domain/module
- identity status
- created date
- retired date

### Accountability

- assigned human owner
- Master PM assignment reference
- escalation target
- budget owner
- data owner when applicable

### Work assignment

- current track
- current sprint
- current task
- branch
- worktree
- base branch/commit
- owned paths
- protected paths
- shared-file restrictions

### Runtime configuration

- model provider and model ID
- Prompt ID and version
- tool profile
- permission profile
- data-classification ceiling
- context limit
- cost budget
- heartbeat interval

### Operational status

- lifecycle state
- current status
- health
- last heartbeat
- last activity
- last commit
- dirty file count
- branch drift
- open blockers
- QA status
- documentation status
- handoff status
- risk level

## 4. Identity status

| Status | Meaning |
|--------|---------|
| Proposed | Identity requested but incomplete |
| Registered | Stable identity exists |
| Inactive | Registered but cannot work |
| Active | May accept approved assignments |
| Suspended | Temporarily disabled |
| Quarantined | Disabled during incident investigation |
| Retired | Permanently inactive |

## 5. Operational status

| Status | Meaning |
|--------|---------|
| Online | Heartbeat current and ready |
| Idle | Active without current execution |
| Running | Performing assigned work |
| Blocked | Cannot safely continue |
| Awaiting Approval | Human gate pending |
| Stale | Heartbeat or evidence expired |
| Failed | Assignment terminated unsuccessfully |
| Complete | Assignment deliverables finished |

Identity status and operational status are separate. A Registered/Inactive agent cannot be Running.

## 6. Core Project Atlas registry

This catalog identifies governance roles without changing their tracks or owned files.

| Agent ID | Display name | Primary role | Governance owner | Default lifecycle |
|----------|--------------|--------------|------------------|-------------------|
| `AGT-PM-MASTER-001` | Master PM | Program coordination and shared Atlas ownership | HVCG Owner | Active |
| `AGT-AI-GOVERNANCE-001` | AI Governance Manager | Agent, prompt, permission, audit, risk governance | HVCG Owner | Active |
| `AGT-ARCH-TECHLEAD-001` | System Architect / Technical Lead | Cross-system architecture and boundaries | HVCG Owner | Active |
| `AGT-QA-RELEASE-001` | QA and Release Manager | Independent quality and release evidence | Master PM | Active |
| `AGT-DEPLOY-001` | Deployment Engineer | Environment, deployment, freeze, rollback | HVCG Owner | Active |
| `AGT-DOCS-KNOWLEDGE-001` | Documentation and Knowledge Manager | Institutional knowledge quality | Master PM | Active |
| `AGT-REVENUE-001` | Revenue Systems Engineer | Revenue module engineering | Master PM | Assignment-based |
| `AGT-CRM-001` | CRM Engineer | CRM Development engineering | Master PM | Assignment-based |
| `AGT-WEBSITE-001` | Website Engineer | Website staging and preview | Master PM | Assignment-based |
| `AGT-PORTAL-001` | Client Portal Engineer | Portal and data-room engineering | Master PM | Assignment-based |
| `AGT-EXECUTIVE-001` | Executive Command Center Engineer | Executive intelligence workspace | Master PM | Assignment-based |
| `AGT-FINANCE-001` | Finance Operations Engineer | Finance controls and reporting | Master PM | Assignment-based |
| `AGT-OPERATIONS-001` | Operations Hub Engineer | Internal operations workspace | Master PM | Assignment-based |
| `AGT-AUTOMATION-001` | Automation Engineer | Approved automation definitions | System Architect | Assignment-based |
| `AGT-DATA-001` | Data Engineer | Schema, migration, and import engineering | System Architect | Assignment-based |
| `AGT-UIUX-001` | UI/UX Engineer | Experience and accessibility | Master PM | Assignment-based |
| `AGT-ENGINEERING-OS-001` | Engineering OS Manager | Track 9 workspace only | HVCG Owner | Assignment-based |

The AI Governance workspace records identities and controls only. It does not grant itself ownership over Revenue Track 2, Engineering OS Track 9, Production, Track 1, or Client Portal.

## 7. Registration workflow

1. Master PM requests a role/identity.
2. AI Governance checks duplication and segregation of duties.
3. Stable Agent ID is allocated.
4. Human owner and escalation path are assigned.
5. Role and baseline permission profile are attached.
6. Prompt and model are selected.
7. Owned/protected paths are verified.
8. Budget and heartbeat are set.
9. Registration approval is recorded.
10. Agent remains Inactive until assignment activation.

## 8. Assignment workflow

Before every sprint or material task:

1. create Assignment ID;
2. state objective and non-goals;
3. verify base branch/commit;
4. create dedicated branch/worktree;
5. declare owned/protected paths;
6. check collisions;
7. bind prompt/model/tools;
8. set budget and due date;
9. obtain required approvals;
10. activate assignment;
11. audit all state transitions.

## 9. Identity assurance

Registry consumers must verify:

- Agent ID exists and is not retired;
- Session maps to an active Assignment;
- Assignment maps to a human owner;
- prompt and permission versions match registry;
- branch/worktree match assignment;
- approval remains valid;
- environment and data classifications are within limits.

If any check fails, execution stops.

## 10. Registry maintenance

| Event | Required update |
|-------|-----------------|
| New assignment | Sprint, task, branch, worktree, paths, prompt, budget |
| Prompt promotion | Active Prompt ID/version |
| Permission change | Permission profile/version and expiry |
| Model change | Provider/model, reason, compatibility QA |
| Blocker | Blocker, severity, escalation |
| Handoff | Evidence and receiving owner |
| Completion | QA, commit/push state, cost, residual risks |
| Suspension | Reason, evidence, removed capabilities |
| Retirement | Final status, archives, reassignment |

## 11. Prohibited identity practices

- sharing one Agent ID across unrelated roles;
- using model name as Agent ID;
- recycling retired IDs;
- running an unregistered session;
- changing Agent ID to avoid audit history;
- self-assigning protected paths;
- activating without a human owner;
- operating from an unregistered branch/worktree;
- retaining permissions after assignment end.
