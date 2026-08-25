# Agent Communications

Repository-backed messaging for all Cursor agents working on the HVCG Project Management System.

## Location

```
.agent-comms/
  registry.json
  inbox/<agent-id>/
  outbox/<agent-id>/
  archive/
  locks/
  events/
  templates/
```

No Slack, Teams, email, webhooks, databases, or paid APIs. Everything is local JSON in git-accessible paths.

## Agents

| agentId | Role | Typical worktree |
|---------|------|------------------|
| master-pm | Master Project Manager | `.worktrees/master-pm-orchestrator` |
| crm | Opportunity CRM | main working tree |
| executive | Executive Command Center | `.worktrees/executive-command-center` |
| operations | Operations Hub | `.worktrees/operations-hub` |
| finance | Finance Operations | `.worktrees/finance-operations` |
| client-portal | Client Portal & Data Rooms | `.worktrees/client-portal-data-rooms` |
| ai-governance | AI Governance & Work Queues | `.worktrees/ai-governance-work-queues` |
| integration | Integration | `.worktrees/crm-integration` |

## Bootstrap

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
cd "$HVCG_REPO_ROOT"
./scripts/agent-comms/bootstrap.sh
```

Then paste `AGENT_BOOTSTRAP_PROMPT.md` into each agent conversation.

## CLI (Bash)

| Script | Purpose |
|--------|---------|
| `register-agent.sh` | Register / update agent |
| `heartbeat.sh` | Update heartbeat (+ optional status) |
| `send-message.sh` | Send message |
| `read-inbox.sh` | Read inbox (non-destructive) |
| `ack-message.sh` | Acknowledge + update original status |
| `reply-message.sh` | Threaded reply |
| `resolve-message.sh` | Resolve thread |
| `watch-inbox.sh` | Poll without consuming |
| `archive-resolved.sh` | Move resolved msgs to archive |
| `check-conflicts.sh` | Owned-path overlaps |
| `lock-acquire.sh` / `lock-release.sh` | File locks |
| `master-dashboard.sh` | Master PM operational view |
| `broadcast.sh` | Message all agents |
| `request-status.sh` | Status request to all |
| `summary.sh` | Text summary |

PowerShell equivalents live under `scripts/agent-comms/powershell/`.

## Core rules

1. Atomic writes (temp file + rename).
2. Every message → recipient inbox(es) + sender outbox.
3. Duplicate `messageId` rejected.
4. History preserved; archive never deletes permanently.
5. BLOCKER / DECISION auto-cc `master-pm`.
6. CRITICAL also writes `.agent-comms/events/`.
7. Overlapping owned files → CONFLICT + cc `master-pm` + `integration`.
8. No silent lock overwrite.
9. Stale = `IN_PROGRESS` with no heartbeat for 30 minutes.
10. Never store secrets in messages.

## Master PM capabilities

- Broadcast / request status
- Identify stale agents
- Detect unacked CRITICAL messages
- See open blockers, decisions, conflicts, locks, handoffs
- `master-dashboard.sh` + `summary.sh`
