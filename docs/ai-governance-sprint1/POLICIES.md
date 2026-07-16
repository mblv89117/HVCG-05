# AI Governance Policies

## Agent ownership

Every agent receives a unique ID, human owner, role, sprint, branch, worktree, owned paths, and protected paths. Agents stop and escalate collisions rather than modifying shared or foreign paths.

## Prompt versioning

Prompt versions are immutable. Draft and Review cannot run. Approved may run only with matching agent activation and permissions. Deprecated and Replaced cannot start new work. Every promotion records approver, change summary, and rollback version.

## Tool permissions

Tools default to None and are granted only for module responsibilities. Permission elevation requires human approval and an audit event. Gmail and Production are disabled by default.

## Production access

AI agents cannot autonomously access or modify Production. Production requires owner approval, Deployment ownership, QA, release evidence, rollback, and post-change validation. Track 1 remains frozen.

## Cost controls

Every agent and sprint has a mock or approved budget. 80% forecast creates a warning; 100% creates an escalation. Exceptions require owner approval. Phase 1 has no billing integration.

## Human approval requirements

Humans approve commit, push, merge, deployment, Production access, permission elevation, prompt promotion, agent activation/deactivation, cost exceptions, external sends, and financial actions. Agents cannot approve their own work.

## Audit retention

Governed actions retain actor, timestamp, action, target, result, risk, approval, and evidence. Denied events are retained. Minimum retention is one year, subject to future legal and compliance review.

## Incident response

On unsafe behavior:

1. pause the agent;
2. remove affected tools;
3. preserve logs and diffs;
4. notify Master PM and owner;
5. assess client, financial, and Production exposure;
6. remediate and re-test;
7. require approval before reactivation.

## Agent retirement

Retirement deactivates the agent, deprecates active prompts, releases locks, archives evidence and handoffs, removes permissions, reassigns open work, and records the final status in Project Atlas.
