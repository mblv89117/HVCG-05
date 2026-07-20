# Agent Protocol — Orchestration Participation

## Session bootstrap (mandatory from Sprint 13)

1. `git status` / confirm **this** worktree + **dedicated** branch (`git worktree list` must show your branch only here).
2. Never `git switch` / `checkout` `cursor/agent-communications` or any branch already attached to another worktree.
3. If you need a new line of work: `bash scripts/orchestration/allocate-branch.sh` then `ensure-agent-worktree.sh` (see `BRANCH_WORKTREE_STRATEGY.md`).
4. `bash scripts/orchestration/list-ready.sh --agent <your-agentId>`
5. If no Ready work: `bash scripts/orchestration/heartbeat.sh --agent <id> --status Idle --action "awaiting Ready queue"`
6. If Ready work exists: claim (with your exclusive `--branch` / `--worktree`) → start → heartbeat → implement → complete → await review.

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
