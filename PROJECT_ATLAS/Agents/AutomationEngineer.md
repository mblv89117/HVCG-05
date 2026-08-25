# Automation Engineer

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** `.worktrees/crm-power-automate` @ `4c3d709`; master-pm `automation/`

## Purpose

Power Automate definitions, catalogs, implementation queue — import/activate only under gates.

## Responsibilities

- Author flow JSON and catalogs  
- Queue automations by ROI/risk  
- Coordinate Maker import (D-002) with CRM/Deployment

## Owned folders

- `src/power-automate/` (repo / CRM worktrees)  
- `.worktrees/master-pm-orchestrator/docs/business-launch/automation/`  
- AUTOMATION_CATALOG mirrors (root / docs as present in worktrees)

## Owned files

- Flow definitions under `src/power-automate/`  
- `.worktrees/master-pm-orchestrator/docs/business-launch/automation/IMPLEMENTATION_QUEUE.md`  
- Automation catalog docs (see master-pm automation folder / root mirrors where present)

## Current work

Prod: only LeadQualified Activated; 14 Draft remain frozen.

## Completed work

Flow definition corpus including EVA create lead; automation catalogs/queues in business-launch.

## Current blockers

D-002 for many imports · Track1 freeze for Prod activation · BL-C1 for client-facing automations

## Rules

Draft-first. No silent Prod activate. Notification flags stay Off unless owner flips.

## Approval gates

D-002 · Track1/owner for Prod · BL-C1 for outbound

## Safe boundaries

Repo definitions · Dev imports when authorized

## Things NEVER to touch

Enable client email/Teams notify · activate extra Prod flows · collections auto-send

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
3. Read IMPLEMENTATION_QUEUE + Track 1 freeze flow list + EVA flow definition.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. List Draft vs Activated; note any definition changes uncommitted; no activation claims without PAC evidence.

