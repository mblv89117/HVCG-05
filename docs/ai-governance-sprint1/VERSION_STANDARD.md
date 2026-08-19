# Project Atlas AI Governance Version Standard

**Version authority:** AI Governance Manager
**Applies to:** Prompts, policies, permission profiles, tool contracts, agent roles, memory schemas, audit schemas, dashboards, and runbooks

## 1. Goals

Versioning must make it possible to determine exactly which governance configuration authorized and shaped an action, test compatible changes before activation, and recover without rewriting history.

## 2. Semantic versioning

Use:

```text
MAJOR.MINOR.PATCH
```

| Increment | Meaning |
|-----------|---------|
| MAJOR | Breaking authority, scope, security, schema, approval, or behavior change |
| MINOR | Backward-compatible capability, field, workflow, or control |
| PATCH | Non-breaking clarification, correction, or implementation fix |

Examples:

- `1.0.0` first approved baseline;
- `1.1.0` new optional audit field;
- `2.0.0` changed approval authority;
- `2.0.1` corrected non-semantic wording.

Pre-release labels may be used before approval:

```text
2.0.0-draft.1
2.0.0-rc.1
```

Only final Approved versions are runtime-eligible.

## 3. Versioned objects

| Object | Stable identifier example | Breaking change example |
|--------|---------------------------|-------------------------|
| Prompt | `PRM-AI-GOVERNANCE-MANAGER` | New authority or protected scope |
| Policy | `POL-HUMAN-APPROVAL` | Changed approval requirement |
| Permission profile | `PERM-MODULE-ENGINEER` | Production/tool access change |
| Tool contract | `TOOL-GIT-PUSH` | Changed side-effect or input schema |
| Agent role | `ROLE-MASTER-PM` | Changed ownership |
| Memory schema | `SCHEMA-MEMORY-RECORD` | Required field removed/renamed |
| Audit schema | `SCHEMA-AUDIT-EVENT` | Event interpretation changes |
| Dashboard model | `MODEL-GOVERNANCE-DASHBOARD` | Metric semantics change |
| Runbook | `RUN-AGENT-RECOVERY` | Changed recovery authority/order |

Agent ID, Assignment ID, Session ID, event ID, and approval ID are identities, not semantic versions.

## 4. Immutability

After approval:

- content and version metadata are immutable;
- corrections produce a new version;
- prior versions remain resolvable;
- status changes are append-only events;
- deletion follows retention/legal policy;
- a file replacement must retain historical content through repository history or registry artifact storage.

## 5. Required version metadata

- stable object ID;
- semantic version;
- state;
- owner;
- author;
- created/updated dates;
- effective/expiry dates;
- change summary;
- reason;
- compatibility requirements;
- affected agents/roles;
- security/risk impact;
- migration plan;
- test evidence;
- approver/date;
- predecessor;
- rollback version;
- replacement/supersession reference;
- source hash/commit.

## 6. Lifecycle

```text
Draft → Review → Approved → Active → Deprecated → Retired
                                    └────────────→ Replaced
```

| State | Use |
|-------|-----|
| Draft | Authoring only |
| Review | Test/review only |
| Approved | Eligible for activation |
| Active | Current runtime baseline |
| Deprecated | Existing bounded use only if explicitly allowed |
| Replaced | Successor is authoritative |
| Retired | No runtime use |

## 7. Change classification

### MAJOR

- adds/removes human approval;
- changes Owner/Master PM/resource-owner authority;
- expands protected resource or Production access;
- changes data classification handling;
- alters external-action or financial-action policy;
- removes required audit/evidence;
- changes required schema fields incompatibly;
- changes identity meaning;
- changes retry/side-effect guarantees.

### MINOR

- adds optional field;
- adds a bounded role capability within existing controls;
- adds an event type;
- adds a dashboard metric;
- expands test coverage;
- introduces a compatible workflow step.

### PATCH

- typo/format correction;
- clearer example with no rule change;
- bug fix preserving contract;
- metadata correction that does not alter authority.

When uncertain, use the higher version impact.

## 8. Dependency declaration

Each active Assignment binds:

- Agent role version;
- Prompt version;
- Permission profile version;
- Policy baseline version;
- Tool versions;
- Memory schema/version;
- Audit schema/version;
- model/provider version or identifier;
- repository base commit.

Runtime starts only when the dependency set is compatible.

## 9. Compatibility

Compatibility checks include:

- prompt expects only granted tools;
- permission profile recognizes tool actions;
- audit schema captures required fields;
- policy baseline supports approval types;
- model supports required structured/tool behavior;
- memory records satisfy schema;
- dashboard metric definitions match source schema.

Compatibility is evidence-backed, not assumed from version numbers.

## 10. Promotion workflow

1. create Draft version;
2. classify change;
3. identify affected objects/agents;
4. review security, authority, data, cost, and operational impact;
5. run unit, integration, scenario, adversarial, and rollback tests as applicable;
6. document migration and rollback;
7. obtain independent review;
8. obtain required human approval;
9. mark Approved;
10. activate in a controlled window;
11. audit and monitor;
12. deprecate/revoke predecessor when safe.

## 11. Rollback

Rollback is a governed activation change, not an edit.

Requirements:

- current version suspended when unsafe;
- rollback target previously Approved;
- dependency compatibility revalidated;
- data/schema backward compatibility checked;
- human approval obtained;
- runtime binding updated;
- evidence and audit events recorded;
- post-rollback validation completed.

If rollback is incompatible, create and approve a new corrective version.

## 12. Emergency change

Critical security containment may suspend a version immediately. Emergency activation of a replacement still requires Owner or delegated emergency authority, documented scope, short expiry, audit evidence, and retrospective review.

Emergency status cannot be used to bypass evidence or conceal a failure.

## 13. Version drift

Drift exists when runtime or documentation does not match the registered active version.

On drift:

1. stop affected governed actions;
2. capture actual/expected versions;
3. assess actions performed under drift;
4. restore an approved compatible set;
5. rerun relevant QA;
6. audit and escalate by risk.

## 14. Release manifest

Each governance release records:

```text
Release ID
Policy baseline
Prompt versions
Permission profiles
Tool contracts
Role definitions
Memory schema
Audit schema
Dashboard model
Tests/evidence
Approvals
Effective date
Rollback release
```

The manifest is the reproducible governance baseline for audit and recovery.
