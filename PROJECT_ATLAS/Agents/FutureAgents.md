# Future / parallel agents

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** Registered in AGENT_COMMUNICATIONS: executive, operations, finance, client-portal, ai-governance, integration (+ docs knowledge manager)

## Purpose

Capture parallel workstreams that exist as worktrees but are not the Sprint 1–3 Revenue critical path.

## Responsibilities

| agentId | Worktree | Focus |
|---------|----------|-------|
| executive | `.worktrees/executive-command-center` @ `e074cfc` | Executive command center |
| operations | `.worktrees/operations-hub` @ `a584f61` | Operations hub |
| finance | `.worktrees/finance-operations` @ `c79d35b` | Finance / AR drafts |
| client-portal | `.worktrees/client-portal-data-rooms` @ `b8b2005` | Portal & data rooms |
| ai-governance | `.worktrees/ai-governance-work-queues` @ `fc1fa79` | AI governance |
| integration | `.worktrees/crm-integration` @ `bbfeec9` | Integration + often agent-comms |
| documentation-knowledge-manager | `.worktrees/documentation-knowledge-manager` @ `2c064b3` | Docs hygiene |

## Owned folders

Each agent’s worktree + module docs; see `docs/agents/AGENT_COMMUNICATIONS.md`.

## Owned files

Module-owned docs inside respective worktrees; do not treat as Track 1 SoR.

## Current work

Parallel; defer to each WT’s README/status. Finance collections = draft + approval only.

## Completed work

Worktrees exist with branch tips listed in AGENT_ASSIGNMENTS.

## Current blockers

BL-C1 · BL-F1 · Track1 freeze for Prod · module-specific UNKNOWN until WT docs read

## Rules

Use agent-comms heartbeats; lock contested paths; no client auto-contact.

## Approval gates

Same global owner gates as DECISIONS.md

## Safe boundaries

Module docs and Dev-scoped work per WT charter

## Things NEVER to touch

Prod without Deployment+owner · outbound client contact · conflicting rewrite of Agent Comms

## PROJECT_ATLAS protocol (canonical SoR)

`PROJECT_ATLAS/` is the **canonical source of truth** for project orientation and status.

1. **Read PROJECT_ATLAS before beginning work.** Start with [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md) and this handbook.
2. **Update PROJECT_ATLAS before ending work.** Refresh any Atlas pages your session changed (Track/Sprint/agent notes as applicable). Leave the next agent able to resume from Atlas alone.
3. **Never rely on previous chat history.** Treat every session as cold-start.
4. **Repository evidence overrides chat history.** Prefer freeze packages, handoffs, smoke JSON, and git state over anything said in chat.
5. **Every completed sprint must update:**
   - [CURRENT_STATE.md](../CURRENT_STATE.md)
   - [ROADMAP.md](../ROADMAP.md)
   - [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)
   - [CHANGELOG.md](../CHANGELOG.md)
   - [NEXT_ACTIONS.md](../NEXT_ACTIONS.md)
6. **Every new agent must begin with [PROJECT_INDEX.md](../PROJECT_INDEX.md).**


## How to resume work

1. Open [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md).
2. Follow the PROJECT_ATLAS protocol above (read Atlas before work; never rely on chat history).
3. `git worktree list` → enter your worktree → read module README/handoff → heartbeat on bus.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Standard bus handoff + update Atlas Track page if track status changes with evidence.

