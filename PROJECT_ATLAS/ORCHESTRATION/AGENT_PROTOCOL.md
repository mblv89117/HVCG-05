# Agent Protocol — Orchestration Participation

## Session bootstrap (mandatory from Sprint 13)

1. `git status` / confirm worktree + branch.
2. `bash scripts/orchestration/list-ready.sh --agent <your-agentId>`
3. If no Ready work: `bash scripts/orchestration/heartbeat.sh --agent <id> --status Idle --action "awaiting Ready queue"`
4. If Ready work exists: claim → start → heartbeat → implement → complete → await review.

## agentId values

See `registry/agents.json` (`master-pm`, `system-architect`, `deployment-manager`, `qa-release`, `documentation`, `ai-governance`, `elite-ui`, `power-platform`, `azure-platform`, `data-engineering`, `security`, `revenue-systems`, `client-workspace`, `knowledge-platform`, `communications`, `analytics`, `automation`, `administration`).

## Registering a future agent

1. Append object matching `schemas/agent.schema.json` to `registry/agents.json` (or use future `register-agent` helper).
2. Add ownedPaths that do not collide without Master PM mediation.
3. Publish an Idle heartbeat.
4. Seed first Ready task if work is known.

## Completing work

```bash
bash scripts/orchestration/atlas-orch.sh complete ATLAS-T-#### --agent <id> \
  --summary "what shipped" \
  --commit <sha> \
  --artifact PROJECT_ATLAS/...
```

Reviewers move status through QA → Architecture Review → Security Review → Approved → Merged → Released/Closed.

## Integration with agent-comms

- Blockers: post `.agent-comms` BLOCKER **and** set task `status=Blocked` with `blockedBy`.
- Status requests from Master PM: update orchestration heartbeat first, then ACK inbox.
