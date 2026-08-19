# Release Deployment Coordinator — README

**Role:** Event-driven release orchestrator for Project Atlas  
**Agent:** `deployment-manager`  
**Auto-deploy:** **NEVER**

## Deploy requires (all three)

1. QA formal **GO**
2. Master PM **approval**
3. Owner **approval**

## Mode

**Event-driven only** — see `EVENT_DRIVEN_ORCHESTRATOR.md`.  
Timed polling is retired (`run-monitor-loop.sh` deprecated).

## Package layout

| Path | Purpose |
|------|---------|
| `EVENT_DRIVEN_ORCHESTRATOR.md` | Event model + emit instructions |
| `checklists/` | Readiness + refuse rules |
| `events/inbox/` | Incoming events |
| `events/processed/` | Handled events |
| `inventory/RC_INVENTORY.json` | Release candidate inventory |
| `validation/` | Deployment / rollback / smoke validation |
| `reports/PRODUCTION_READINESS_REPORT.md` | Production readiness report |
| `rc-packages/` | Prepared RC packages |
| `scripts/emit-release-event.py` | Emit events |
| `scripts/handle-release-event.py` | Process events |
| `scripts/watch-release-events.sh` | Filesystem event watcher |

## Synchronization

Remain synchronized with Master PM via:

- Orchestration heartbeats
- `.agent-comms` messages on RC ready / refuse / incident / rollback
- `SYNC_REQUESTED` events from Master PM
