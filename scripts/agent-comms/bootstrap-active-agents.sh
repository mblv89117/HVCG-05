#!/usr/bin/env bash
# Pre-register known agents, drop bootstrap inbox packets, copy prompt into worktrees.
# Does NOT inject into Cursor chat UIs (unsupported). Does NOT touch live CRM deploy.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
_find_root() {
  local d="$SCRIPT_DIR"
  while [ "$d" != "/" ]; do
    if [ -d "$d/.agent-comms" ] || [ -d "$d/.git" ] || [ -f "$d/.git" ]; then
      echo "$d"; return 0
    fi
    d="$(dirname "$d")"
  done
  cd "$SCRIPT_DIR/../.." && pwd
}
ROOT="$(_find_root)"
export HVCG_REPO_ROOT="$ROOT"
COMMS="$ROOT/scripts/agent-comms/lib/comms.py"
PROMPT="$ROOT/AGENT_BOOTSTRAP_PROMPT.md"

python3 "$COMMS" bootstrap >/dev/null

bootstrap_one() {
  local id="$1" branch="$2" wt="$3"
  python3 "$COMMS" register \
    --agent-id "$id" \
    --branch "$branch" \
    --worktree-path "$wt" \
    --status IN_PROGRESS >/dev/null
  python3 "$COMMS" heartbeat --agent-id "$id" --status IN_PROGRESS >/dev/null

  local target
  if [ "$wt" = "." ]; then
    target="$ROOT"
  else
    target="$ROOT/$wt"
  fi
  if [ -d "$target" ]; then
    if [ "$(cd "$(dirname "$PROMPT")" && pwd)/$(basename "$PROMPT")" != "$target/AGENT_BOOTSTRAP_PROMPT.md" ]; then
      cp "$PROMPT" "$target/AGENT_BOOTSTRAP_PROMPT.md"
    fi
    cat > "$target/AGENT_COMMS_ACTIVATE.md" <<EOF
# Activate Agent Communications

Your agent id: \`$id\`

1. Open \`AGENT_BOOTSTRAP_PROMPT.md\` in this worktree (or repo root).
2. Run the register / heartbeat / read-inbox / test-message commands with AGENT_ID=\`$id\`.
3. Acknowledge Master PM "System Online" when it arrives in \`.agent-comms/inbox/$id/\`.

Do not interrupt active deployment, smoke tests, or authentication.
EOF
  fi
}

bootstrap_one master-pm "cursor/master-pm-orchestrator" ".worktrees/master-pm-orchestrator"
bootstrap_one crm "cursor/v1.1.0-intelligence-ai-ops" "."
bootstrap_one executive "cursor/executive-command-center" ".worktrees/executive-command-center"
bootstrap_one operations "cursor/operations-hub" ".worktrees/operations-hub"
bootstrap_one finance "cursor/finance-operations" ".worktrees/finance-operations"
bootstrap_one client-portal "cursor/client-portal-data-rooms" ".worktrees/client-portal-data-rooms"
bootstrap_one ai-governance "cursor/ai-governance-work-queues" ".worktrees/ai-governance-work-queues"
bootstrap_one integration "agent/crm-integration" ".worktrees/crm-integration"

BODY="Agent communications infrastructure is live on branch cursor/agent-communications.

Action required:
1. Read AGENT_BOOTSTRAP_PROMPT.md
2. Register (if needed), heartbeat, read inbox
3. ACK this message
4. Send INFO Bootstrap complete to master-pm

Do not interrupt CRM Maker OA / auth / smoke."

for id in crm executive operations finance client-portal ai-governance integration; do
  python3 "$COMMS" send \
    --from master-pm \
    --to "$id" \
    --type REQUEST \
    --priority HIGH \
    --subject "Activate agent communications" \
    --body "$BODY" \
    --requested-action "Register, heartbeat, ACK, send bootstrap complete" \
    --requires-ack true >/dev/null
done

echo "Bootstrap packets delivered. Registry:"
python3 "$COMMS" list-agents
