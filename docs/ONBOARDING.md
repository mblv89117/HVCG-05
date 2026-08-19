# Onboarding

| Field | Value |
|-------|--------|
| Title | HVCG Repository Onboarding |
| Purpose | Orient new contributors and agents without relying on chat history |
| Audience | New agents, developers, operators |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Source | README, AGENT_COMMUNICATIONS, master-pm MASTER_* |
| Related | [INDEX](INDEX.md), [GLOSSARY](GLOSSARY.md), [agents/AGENT_COMMUNICATIONS.md](agents/AGENT_COMMUNICATIONS.md) |
| Known limitations | Module-specific onboarding remains in module worktrees |

## 1. Read first (authority)

1. Root [README.md](../README.md) — product purpose and install commands
2. [INDEX.md](INDEX.md) — documentation navigation
3. `.worktrees/master-pm-orchestrator/MASTER_PROJECT_STATUS.md` — current program status
4. `.worktrees/system-architect/docs/architecture/SYSTEM_ARCHITECTURE.md` — technical shape
5. [agents/AGENT_COMMUNICATIONS.md](agents/AGENT_COMMUNICATIONS.md) — bus protocol

## 2. Environments (evidence-based)

| Environment | Docs implication |
|-------------|------------------|
| development | Default for install/health scripts in README |
| Production | **Untouched** per master-pm and integration RC status as of 2026-07-15 |

Do not document Production availability without integration + master-pm verification.

## 3. Branch / worktree model

Agents work in **isolated worktrees** under `.worktrees/<name>` on dedicated branches. Do not modify another agent's owned paths without a lock + REQUEST.

Canonical steward branch for docs: `cursor/documentation-knowledge-manager` → `.worktrees/documentation-knowledge-manager`.

## 4. Agent communications

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
./scripts/agent-comms/bootstrap.sh
./scripts/agent-comms/register-agent.sh --agent-id <id> ...
./scripts/agent-comms/heartbeat.sh --agent-id <id> --status IN_PROGRESS
./scripts/agent-comms/read-inbox.sh --agent-id <id>
```

Never store secrets in bus messages.

## 5. Where to put new documentation

| Kind | Location | Owner |
|------|----------|-------|
| Program status | `MASTER_*.md` (master-pm worktree) | master-pm |
| Architecture / ADR | `docs/architecture/` | architect |
| Module impl docs | `docs/<module>/` in module worktree | module agent |
| QA / RC | `docs/qa/`, `docs/release/` | integration |
| Cross-cutting index / glossary | `docs/INDEX.md`, `docs/GLOSSARY.md` | docs |
| SOP | `docs/sops/` | docs (with process owner) |

## 6. Quick start (Development only)

See root README — Install / health / upgrade / backup PowerShell entry points under `deployment/`.

## Change history

- 2026-07-15 — Initial onboarding from repository evidence.
