# Agent-comms ↔ Orchestration heartbeat bridge

**Owner:** `communications`  
**Task:** ATLAS-T-1306  
**Status:** Procedure + sample sync script (no live Outlook/Teams/Graph sends)

## Purpose

Master PM status requests travel on two rails:

| Rail | Path | Carries |
|------|------|---------|
| Work state | `PROJECT_ATLAS/ORCHESTRATION/` | Tasks, locks, heartbeats, reviews |
| Messages | `.agent-comms/` | REQUEST / ACK / BLOCKER threads |

When Master PM broadcasts a status request (`.agent-comms` `request-status`), agents must **update the orchestration heartbeat first**, then optionally ACK the inbox message.

## Required response order

1. **Orchestration heartbeat** (source of truth for Sprint board / stale detection ≥45 min)

   ```bash
   bash scripts/orchestration/heartbeat.sh \
     --agent <agentId> \
     --status "In Progress" \
     --task ATLAS-T-#### \
     --action "short current action" \
     --progress 40 \
     --next "next concrete step"
   ```

   Or use the bridge helper (writes orchestration heartbeat and can ACK):

   ```bash
   bash scripts/agent-comms/sync-orch-heartbeat.sh \
     --agent <agentId> \
     --status "In Progress" \
     --task ATLAS-T-#### \
     --action "responding to Master PM status request" \
     --ack-message <messageId>
   ```

2. **Optional agent-comms ACK** — only after the orchestration heartbeat file exists under `PROJECT_ATLAS/ORCHESTRATION/heartbeats/agents/<agentId>.json`.

   ```bash
   bash scripts/agent-comms/ack-message.sh \
     --agent-id <agentId> \
     --message-id <messageId>
   ```

3. **Do not** treat `.agent-comms/registry.json` `lastHeartbeat` alone as sufficient for orchestration dashboards.

## Mapping: agent-comms status → orchestration status

| agent-comms `AGENT_STATUSES` | Suggested orchestration `--status` |
|------------------------------|------------------------------------|
| `IDLE` | `Idle` |
| `READY` | `Ready` |
| `IN_PROGRESS` | `In Progress` |
| `BLOCKED` | `Blocked` |
| `OFFLINE` | `Offline` |

Include `currentTask`, `currentAction`, `blockers[]`, and `nextAction` on the orchestration heartbeat whenever known.

## Blockers

If work cannot proceed:

1. Set orchestration task `status=Blocked` with `blockedBy` populated (via Master PM / claim holder).
2. Post `.agent-comms` `BLOCKER` (auto-cc `master-pm`).
3. Renew orchestration heartbeat with `--status Blocked --blocker "…"`.

## Locks while responding

- Renew orchestration locks via heartbeat (holders only).
- Do not force-overwrite foreign locks (`LOCK-ORCH-DIR-S12` and peers).
- Communications-owned paths for bridge artifacts: `.agent-comms/`, `scripts/agent-comms/`, `docs/agents/`, `PROJECT_ATLAS/ORCHESTRATION/heartbeats/`.

## Outbound Microsoft channels (unchanged policy)

This bridge is **repo-local only**. It does not send Outlook mail, Teams posts, meeting invites, or Graph notifications.

Product outbound rules remain:

- Teams/Outlook: human approval gates in `docs/crm/TEAMS_NOTIFICATION_SPEC.md` (`OA-CRM-*`, `OA-EXT-01`).
- AI-assisted drafts: `docs/ai/AI_APPROVAL_MATRIX.md` — `ExternalSendBlocked` until approval.
- Never store credentials or tokens in source, messages, or heartbeats.
- Client/internal communication history stays in SharePoint `HVCG_Communications` (and related lists), not in `.agent-comms`.

## Sample script

| Artifact | Role |
|----------|------|
| `scripts/agent-comms/sync-orch-heartbeat.sh` | CLI entry |
| `scripts/agent-comms/lib/orch_heartbeat_bridge.py` | Sync + optional ACK |
| `scripts/agent-comms/tests/test_orch_heartbeat_bridge.py` | Unit coverage |

## Acceptance check

- [ ] Procedure documented (this file)
- [ ] Sample sync script present and tested
- [ ] Status-request handling: orchestration heartbeat before ACK
- [ ] No live external sends from this workstream
