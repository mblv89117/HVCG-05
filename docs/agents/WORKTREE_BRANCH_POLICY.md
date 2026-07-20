# Worktree / Branch Policy (Agent Comms + Orchestration)

Canonical policy lives in:

- `PROJECT_ATLAS/ORCHESTRATION/BRANCH_WORKTREE_STRATEGY.md`
- `PROJECT_ATLAS/ORCHESTRATION/MIGRATION_WORKTREE_UNIQUENESS.md`
- ADR-0003

**Summary:** every specialist agent uses a dedicated branch `cursor/<agentId>/<purpose>[-<taskId>]` and worktree `.worktrees/<agentId>-<purpose>`. Never check out `cursor/agent-communications` from a `.worktrees/*` path.
