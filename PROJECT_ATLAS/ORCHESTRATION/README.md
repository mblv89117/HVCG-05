# Atlas Engineering Orchestration Platform

**Version:** 1.0  
**Sprint:** 12  
**Owner:** Manuel Barela  
**Operator:** Master PM  

This directory is the **permanent engineering operating system** for Project Atlas.

It is the system of record for work.  
`.agent-comms/` remains the asynchronous message bus.

Cursor does **not** auto-launch specialist agents. Agents discover `Ready` tasks here and pull work.

---

## Quick start (every agent, every session)

```bash
# 1. See work assigned to you
bash scripts/orchestration/list-ready.sh --agent elite-ui

# 2. Claim + lock paths
bash scripts/orchestration/claim-task.sh ATLAS-T-1303 --agent elite-ui \
  --branch cursor/elite-ui-appinsights \
  --worktree .worktrees/elite-ui-appinsights

# 3. Mark in progress + heartbeat
bash scripts/orchestration/atlas-orch.sh start ATLAS-T-1303 --agent elite-ui
bash scripts/orchestration/heartbeat.sh --agent elite-ui --task ATLAS-T-1303 \
  --branch cursor/elite-ui-appinsights --action "wiring App Insights" --progress 20

# 4. Board / conflicts
bash scripts/orchestration/board.sh
bash scripts/orchestration/atlas-orch.sh conflicts
```

---

## Folder map

| Path | Purpose |
|------|---------|
| `schemas/` | JSON Schema contracts for tasks, agents, locks, heartbeats, decisions, sprints, releases |
| `registry/` | Agents, environments, infrastructure, branches, ownership |
| `queue/tasks/` | One JSON file per task (`ATLAS-T-####`) — **work SoR** |
| `queue/templates/` | Starter task shapes |
| `queue/index.json` | Fast status index (rebuild with `reindex`) |
| `sprints/` | Sprint goals, capacity, backlog pointers |
| `locks/` | File/dir/task/worktree/branch locks + TTL |
| `heartbeats/` | Per-agent live status |
| `decisions/` | ADR + owner decisions + rejected ideas |
| `memory/` | Architecture memory, lessons, standards, debt, risks, opportunities |
| `knowledge/` | Component relationship graph |
| `reviews/` | Review queue + workflow |
| `releases/` | Promotion pipeline + merge queue |
| `calendar/` | Engineering calendar |
| `dependencies/` | Task dependency graph |
| `metrics/` | Measurable engineering metrics |
| `dashboards/` | Executive + owner dashboard inputs |
| `CONSTITUTION.md` | Non-negotiable operating rules |
| `AGENT_PROTOCOL.md` | How agents must participate |

Runtime CLI: `scripts/orchestration/`

---

## Microsoft constraint

Orchestration coordinates engineering. It does **not** replace Entra, Dataverse, Power Platform, SharePoint, Teams, Graph, or Azure. Those remain the product platforms.

---

## Escalation to Manuel Barela

Only when: financial approval, Microsoft permission, legal/compliance, destructive action, or multiple valid architectural paths needing business direction.

Otherwise agents continue autonomously via this platform.
