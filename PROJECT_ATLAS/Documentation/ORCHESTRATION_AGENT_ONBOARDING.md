# Orchestration Agent Onboarding

| Field | Value |
|-------|--------|
| Title | Orchestration Agent Onboarding |
| Purpose | Teach every specialist to discover Ready work from the Atlas Engineering Orchestration Platform |
| Audience | All engineering agents |
| Owner | documentation (agent-comms: documentation-manager) |
| Status | DRAFT — pending ATLAS-T-1305 claim unlock |
| Last verified | 2026-07-20 |
| Evidence | `PROJECT_ATLAS/ORCHESTRATION/README.md`, `AGENT_PROTOCOL.md`, `CONSTITUTION.md`, Sprint 12 scripts |
| Task | ATLAS-T-1305 |
| Known limitations | Claim of ATLAS-T-1305 is blocked by `LOCK-ORCH-DIR-S12` (master-pm). This draft must not be treated as Merged until claim + review complete. |

## Authority

| System | Role |
|--------|------|
| `PROJECT_ATLAS/ORCHESTRATION/` | Work SoR (tasks, locks, heartbeats, decisions, sprints) |
| `.agent-comms/` | Message bus |
| `PROJECT_ATLAS/CURRENT_STATE.md` | Orientation status SoR |
| Chat history | Never authoritative |

Orchestration agentId for Documentation Manager: **`documentation`**.  
Agent-comms agentId for this worker: **`documentation-manager`**.

## Mandatory session startup

From a worktree that contains the orchestration tree (currently Sprint 12 worktree until promoted), or with scripts pointed at that root:

```bash
export HVCG_REPO_ROOT="<repo-or-worktree-with-PROJECT_ATLAS/ORCHESTRATION>"

# 1. List Ready work for your orchestration agentId
bash scripts/orchestration/list-ready.sh --agent <your-agentId>

# 2. If none: Idle heartbeat and stop inventing work
bash scripts/orchestration/heartbeat.sh --agent <your-agentId> \
  --status Idle --action "awaiting Ready queue"

# 3. If Ready work exists: claim with your branch/worktree
bash scripts/orchestration/claim-task.sh ATLAS-T-#### --agent <your-agentId> \
  --branch <your-branch> \
  --worktree <your-worktree>

# 4. Start + heartbeat while working
bash scripts/orchestration/atlas-orch.sh start ATLAS-T-#### --agent <your-agentId>
bash scripts/orchestration/heartbeat.sh --agent <your-agentId> --task ATLAS-T-#### \
  --branch <your-branch> --action "<current action>" --progress <0-100>

# 5. Board / conflicts
bash scripts/orchestration/board.sh
bash scripts/orchestration/atlas-orch.sh conflicts
```

Agent IDs are defined in `PROJECT_ATLAS/ORCHESTRATION/registry/agents.json`.

## Claim rules (Constitution)

1. Claim before editing owned paths.
2. Do not edit another agent’s workspace or branch.
3. Heartbeat while working; stale heartbeats make locks suspect.
4. Complete → Waiting Review; do not self-merge.
5. Never invent commands, URLs, resources, settings, test results, or completion status.

## Completing documentation work

```bash
bash scripts/orchestration/atlas-orch.sh complete ATLAS-T-#### --agent documentation \
  --summary "<what documentation shipped>" \
  --artifact PROJECT_ATLAS/...
```

Then notify Master PM on `.agent-comms/` that the task is Waiting Review.

## Where to read next

- Platform README: `PROJECT_ATLAS/ORCHESTRATION/README.md`
- Protocol: `PROJECT_ATLAS/ORCHESTRATION/AGENT_PROTOCOL.md`
- Constitution: `PROJECT_ATLAS/ORCHESTRATION/CONSTITUTION.md`
- Assignments: [../AGENT_ASSIGNMENTS.md](../AGENT_ASSIGNMENTS.md)
- Quick start (Atlas orientation): [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)

## Change history

- 2026-07-20 — Draft for ATLAS-T-1305 (claim blocked by LOCK-ORCH-DIR-S12).
