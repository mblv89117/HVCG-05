# Agent Communications Handoff

**Branch:** `cursor/agent-communications`  
**Status:** Infrastructure complete, tests green, System Online broadcast sent  
**Production:** Untouched

## What was built

- `.agent-comms/` registry, inboxes, outboxes, archive, locks, events, templates
- Python core: `scripts/agent-comms/lib/comms.py`
- Bash CLIs under `scripts/agent-comms/*.sh`
- PowerShell CLIs under `scripts/agent-comms/powershell/`
- Docs under `docs/agents/`
- Bootstrap prompt: `AGENT_BOOTSTRAP_PROMPT.md`
- Tests: `scripts/agent-comms/tests/test_comms.py` (16 passing)

## Activate (any agent)

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
cd "$HVCG_REPO_ROOT"

# First time on a machine / clean tree
./scripts/agent-comms/bootstrap.sh

# Register + heartbeat (example: executive)
./scripts/agent-comms/register-agent.sh --agent-id executive --status IN_PROGRESS
./scripts/agent-comms/heartbeat.sh --agent-id executive --status IN_PROGRESS
./scripts/agent-comms/read-inbox.sh --agent-id executive

# ACK System Online (use messageId from inbox JSON)
./scripts/agent-comms/ack-message.sh --agent-id executive --message-id <uuid>

# Test ping
./scripts/agent-comms/send-message.sh \
  --from executive --to master-pm \
  --type INFO --subject "Bootstrap complete" \
  --body "Executive agent live on communications channel." \
  --requires-ack true
```

PowerShell: `scripts/agent-comms/powershell/Initialize-AgentComms.ps1` etc.

## Activate all agents (infra helper)

```bash
./scripts/agent-comms/bootstrap-active-agents.sh
```

This pre-registers agents, copies prompts into worktrees, and drops activate packets. It does **not** inject into Cursor chats.

## Master PM

```bash
./scripts/agent-comms/master-dashboard.sh
./scripts/agent-comms/summary.sh
./scripts/agent-comms/broadcast.sh --from master-pm --subject "..." --body "..."
./scripts/agent-comms/request-status.sh
```

System Online already broadcast once during bootstrap. Re-broadcast if needed after agents join.

## Exact paste for every agent chat

Open `AGENT_BOOTSTRAP_PROMPT.md` and paste the entire file into the chat. Set `AGENT_ID` correctly.

Worktrees also have `AGENT_COMMS_ACTIVATE.md` with the agent id.

## Important constraints

1. Worktrees on other branches must set `HVCG_REPO_ROOT` to the main repo path above (where `.agent-comms` lives on this branch).
2. Never put secrets in messages.
3. Do not interrupt CRM Maker OA / auth / smoke.
4. Request locks before editing shared files.
5. Resolved messages: archive only, never hard-delete.

## Verify

```bash
python3 scripts/agent-comms/tests/test_comms.py -v
./scripts/agent-comms/list-agents.sh
./scripts/agent-comms/master-dashboard.sh
```

## Status ledger

See `docs/agents/BOOTSTRAP_STATUS.md` for per-agent bootstrap / manual actions.
