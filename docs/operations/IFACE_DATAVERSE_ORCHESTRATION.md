# Interface Specification — Operations Hub ↔ Dataverse / Orchestration

**Agent:** `operations-hub`  
**Worktree:** `.worktrees/operations-hub-sprint1`  
**Branch:** `cursor/operations-hub-sprint1`  
**Status:** SPEC ONLY — not implemented against live Dataverse  
**Date:** 2026-07-20  

## Purpose

Define how the Operations Hub specialist consumes structured operational records **without duplicating** Project/Task systems. Dataverse (and current SharePoint list schemas that map to Dataverse/model-driven entities) remain the source of truth.

## Assumptions

1. Canonical project/task entities are `HVCG_Projects` / `HVCG_Tasks` (and related Workstreams, Milestones, Issues, SOPs, TeamMembers, Notifications, Meetings).
2. The React Operations Hub SPA (`apps/hvcg-operations-hub/`) is currently **mock-only**; live binding requires an approved ADR.
3. Sprint 12 `ORCHESTRATION/registry/agents.json` does **not** yet include `operations-hub` — Master PM / documentation must register before `atlas-orch claim` can succeed.
4. Agent-comms bus ID `operations-hub` is active on the main-repo `.agent-comms` SoR.
5. No external communications, Production changes, merges, or deploys from this agent without authorization.
6. This agent does **not** self-approve or release work.

## Orchestration registration request (dependency)

| Field | Value |
|-------|-------|
| Requested `agentId` | `operations-hub` |
| Display name | Operations Hub |
| `commsAgentId` | `operations-hub` (also legacy alias `operations`) |
| Default branch prefix | `cursor/operations-hub-` |
| Owned paths (proposed) | `apps/hvcg-operations-hub/`, `docs/operations/`, `docs/operations-sprint1/`, `PROJECT_ATLAS/Architecture/OperationsHub*.md`, `PROJECT_ATLAS/Handoffs/OperationsHub*.md`, `PROJECT_ATLAS/QA/OperationsHub*/`, `PROJECT_ATLAS/Sprints/Sprint_OperationsHub*.md`, `tests/operations/`, `sample-data/operations/` |
| Escalates to | `master-pm` |
| First Ready task (proposed) | Wire Ops Hub adapters to Dataverse read models (Dev only) after QA of Atlas mock package |

**Do not implement** registration inside `.worktrees/sprint12-engineering-orchestration` from this agent (other-agent workspace). Master PM / ATLAS-T-1305 owns onboarding.

## Adapter contracts (mock → live)

All external dependencies mocked until adapters are approved and bound in Dev.

```ts
// Spec only — future src/adapters/*

export interface TenantContext {
  tenantId: string
  role: string
}

export interface ProjectRecord {
  id: string
  title: string
  clientId?: string
  status: string
  health: 'Green' | 'Yellow' | 'Red'
  ownerEmail?: string
  percentComplete?: number
  dueDate?: string
}

export interface TaskRecord {
  id: string
  title: string
  projectId: string
  status: string
  priority?: string
  assigneeEmail?: string
  dueDate?: string
  isOverdue?: boolean
}

export interface OpsQueueItem {
  id: string
  kind: 'task' | 'approval' | 'escalation' | 'handoff' | 'exception'
  title: string
  severity: 'Info' | 'Action' | 'Critical'
  owner?: string
  due?: string
  sourceEntity: string
  sourceId: string
}

export interface ProjectAdapter {
  listActive(ctx: TenantContext): Promise<ProjectRecord[]>
  get(ctx: TenantContext, projectId: string): Promise<ProjectRecord | null>
}

export interface TaskAdapter {
  listByProject(ctx: TenantContext, projectId: string): Promise<TaskRecord[]>
  listWorkQueue(ctx: TenantContext): Promise<OpsQueueItem[]>
  listOverdue(ctx: TenantContext): Promise<TaskRecord[]>
}

export interface CapacityAdapter {
  listTeamLoad(ctx: TenantContext): Promise<{ member: string; utilization: number; capacity: number }[]>
}

export interface SopAdapter {
  search(ctx: TenantContext, query: string): Promise<{ id: string; title: string; version: string; approval: string }[]>
}

export interface NotificationAdapter {
  listInternal(ctx: TenantContext): Promise<{ id: string; title: string; read: boolean; severity: string }[]>
  markRead(ctx: TenantContext, id: string): Promise<void>
}

export interface CalendarAdapter {
  listMeetings(ctx: TenantContext): Promise<{ id: string; title: string; when: string; attendees: string }[]>
}
```

### Binding map (schema → adapter)

| Adapter method | SoR list / entity | Notes |
|----------------|-------------------|-------|
| `ProjectAdapter.listActive` | `HVCG_Projects` | Filter ProjectStatus ≠ Completed/Cancelled |
| `TaskAdapter.listWorkQueue` | `HVCG_Tasks` + Approvals | Compose queue; do not fork task store |
| `TaskAdapter.listOverdue` | `HVCG_Tasks` + `HVCG_OverdueTaskEscalation` flow outputs | Escalations surface as queue items |
| `CapacityAdapter` | `HVCG_TeamMembers` + TimeEntries (optional) | Mock until approved |
| `SopAdapter` | `HVCG_SOPs` | Version/approval fields |
| `NotificationAdapter` | `HVCG_Notifications` | Internal only; no client send |
| `CalendarAdapter` | Architecture-only until provider ADR | No Graph credentials in mock |

## Explicit non-goals

- Do not create a parallel project/task database in the SPA.
- Do not write to Production Dataverse without Deployment Manager + owner authorization.
- Do not send client email/SMS/Teams from Ops Hub UI (`VITE_BLOCK_LIVE_CLIENT_COMMS` posture).
- Do not modify Revenue, Client Portal, ECC, Finance, CRM, Activation, Track 1, or Sprint 12 orchestration worktrees.

## Current specialist state

| Item | State |
|------|-------|
| Agent-comms registration | Active (`operations-hub`) |
| Heartbeat | `IN_PROGRESS` / awaiting orchestration registration + QA |
| Atlas mock SPA | Ready for QA; **not** self-approved |
| Orchestration Ready queue | No claimable tasks for `operations-hub` until registered |
| Locks | None required until implementation task claimed |

## Next authorized actions (gated)

1. Master PM registers `operations-hub` in ORCHESTRATION agents registry.  
2. QA validates Ops Hub Atlas package.  
3. Owner/Master PM assigns Ready task for adapter wiring (Dev).  
4. This agent claims task, acquires file locks on owned paths only, implements, then hands off — **no self-release**.
