# Master PM Routing

The Master PM (`master-pm`) is the hub for escalation, conflict, and program visibility.

## Automatic routes

| Condition | Route |
|-----------|-------|
| `type=BLOCKER` | cc `master-pm` |
| `type=DECISION` | cc `master-pm` |
| `priority=CRITICAL` | event file under `.agent-comms/events/` |
| ownership conflict on `relatedFiles` | `type=CONFLICT`, cc `master-pm` + `integration` |
| stale agent (`IN_PROGRESS`, no HB ≥ 30m) | shown on dashboard |

## Master commands

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
cd "$HVCG_REPO_ROOT"

./scripts/agent-comms/master-dashboard.sh
./scripts/agent-comms/summary.sh
./scripts/agent-comms/broadcast.sh --from master-pm \
  --subject "System Online" \
  --body "Agent communications channel is live. Acknowledge and send heartbeat." \
  --type REQUEST --priority HIGH --requires-ack true
./scripts/agent-comms/request-status.sh
./scripts/agent-comms/check-conflicts.sh
```

## Dashboard fields

- Agent status + last heartbeat + unread count
- Stale agents
- Open blockers
- Pending decisions
- Unresolved conflicts
- Unacknowledged CRITICAL messages
- Active locks
- Ready-for-integration handoffs

## Routing etiquette

1. Module agents keep day-to-day chatter peer-to-peer when possible.
2. Escalate blockers/decisions; do not wait silently.
3. Handoffs go to `integration` **and** `master-pm`.
4. Master PM does not interrupt CRM live Maker OA / auth / smoke unless the owner asks.
5. Master PM recommends merges; does not merge or deploy without approval.
