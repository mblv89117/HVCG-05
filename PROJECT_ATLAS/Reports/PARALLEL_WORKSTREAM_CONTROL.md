# PARALLEL WORKSTREAM CONTROL — Authorization Packet

**Authority:** Master Project Management Agent (sole integration coordinator)
**Issued:** 2026-07-16T21:10:00Z
**Mode:** Concurrent Phase 1 authorization
**Feature code in this packet:** None (coordination only)

## Authorization

The following three workstreams are authorized to proceed **in parallel** under the path partitions below.

1. Operations Hub Sprint 1 Phase 1
2. AI Governance Sprint 1 Phase 1
3. Deployment Manager Sprint 1 Phase 1

Master PM alone reconciles shared Project Atlas root files after specialist handoffs.

---

## Global hard rules (all three)

1. No agent may modify another workstream’s code, docs, worktree, or sprint artifacts.
2. No merge, deploy, publish, Production write, flow activation, DNS, email/SMS enablement.
3. Forbidden modules (read-only unless Master PM opens a Change Request):
   - Revenue (`cursor/revenue-sprint3-conversion`, `cursor/revenue-sprint4-activation`, EVA/funnel/revenue apps)
   - Client Portal
   - Executive Command Center
   - Finance Operations
   - CRM schema / Dataverse solution schema
   - Activation Framework
   - Track 1 freeze package / Production
4. Shared Atlas root files are **Master PM lock**:
   - `PROJECT_ATLAS/CURRENT_STATE.md`
   - `PROJECT_ATLAS/ROADMAP.md`
   - `PROJECT_ATLAS/NEXT_ACTIONS.md`
   - `PROJECT_ATLAS/TRACK_INDEX.md`
   - `PROJECT_ATLAS/SPRINT_INDEX.md`
   - `PROJECT_ATLAS/AGENT_INDEX.md`
   - `PROJECT_ATLAS/CHANGELOG.md`
5. Specialists may create only: module architecture, sprint doc, QA evidence, screenshots, handoff, and a **proposed Atlas update** file.
6. Stop before commit/push unless a separate owner approval is recorded for that workstream.
7. Prefer namespaced `apps/hvcg-*` and `docs/*-sprint1/` paths; do not expand into sibling modules.

---

## Workstream A — Operations Hub Sprint 1 Phase 1

| Field | Assignment |
|-------|------------|
| Owner agent | `operations` (Operations Hub) |
| Branch | `cursor/operations-hub-sprint1` |
| Worktree | `.worktrees/operations-hub-sprint1` |
| Base observed | `5bb42c2` (same tip historically as executive sprint1 — **do not share paths**) |
| Track | Track 7 — Internal Operations |

### Exclusive application-code paths

- `apps/hvcg-operations-hub/**`

### Exclusive documentation / sprint paths

- `docs/operations-sprint1/**`
- `PROJECT_ATLAS/Sprints/Sprint_OperationsHub1.md`
- `PROJECT_ATLAS/Architecture/OperationsHubSprint1.md`
- `PROJECT_ATLAS/QA/OperationsHubSprint1/**`
- `PROJECT_ATLAS/Screenshots/OperationsHubSprint1/**` (or QA screenshots folder already used)
- `PROJECT_ATLAS/Handoffs/OperationsHubSprint1.md`
- `PROJECT_ATLAS/Handoffs/proposed/OperationsHubSprint1_ATLAS_UPDATE.md` (**only** place for shared-Atlas proposals)

### Explicitly forbidden for this agent

- All Master PM–locked Atlas roots listed above
- `PROJECT_ATLAS/Tracks/Track7_InternalOperations.md` (Master PM reconciles from proposal)
- `PROJECT_ATLAS/Sprints/Sprint_FinanceOperations1.md` (**Finance ownership** — delete/abandon from Ops WT)
- Executive / Finance / Portal / Revenue / CRM schema / Track 1 / Activation Framework
- Legacy WT `.worktrees/operations-hub` (detached HEAD) — do not implement Sprint 1 there

### Dependencies

- Design language may visually follow ECC patterns **by clone inside Ops app only** (no writes to Executive worktree).
- No Production / Power Automate activation. Mock data only unless Master PM opens a CR.

### Current status (observed)

- App + QA artifacts present under exclusive paths.
- **VIOLATION OPEN:** Ops WT has modified locked Atlas roots and Track7; also contains `Sprint_FinanceOperations1.md`.
- **Remediation required before commit:** revert locked Atlas root edits; move status claims into `Handoffs/proposed/OperationsHubSprint1_ATLAS_UPDATE.md`; remove Finance sprint doc from Ops scope.
- **Commit/push:** STOPPED pending owner approval **and** Master PM Atlas remediation.

---

## Workstream B — AI Governance Sprint 1 Phase 1

| Field | Assignment |
|-------|------------|
| Owner agent | `ai-governance` |
| Branch | `cursor/ai-governance-sprint1` |
| Worktree | `.worktrees/ai-governance-sprint1` |
| Base observed | `2290456` (`cursor/agent-communications` tip at branch create) |
| Track | Track 6 — AI |

### Exclusive application-code paths

- `apps/hvcg-ai-governance/**`

### Exclusive documentation / sprint paths

- `docs/ai-sprint1/**`
- `PROJECT_ATLAS/Sprints/Sprint_AIGovernance1.md`
- `PROJECT_ATLAS/Architecture/AIGovernanceSprint1.md`
- `PROJECT_ATLAS/QA/AIGovernanceSprint1/**`
- `PROJECT_ATLAS/Screenshots/AIGovernanceSprint1/**`
- `PROJECT_ATLAS/Handoffs/AIGovernanceSprint1.md`
- `PROJECT_ATLAS/Handoffs/proposed/AIGovernanceSprint1_ATLAS_UPDATE.md`

### Allowed read-only references

- Existing baseline under `docs/ai/` (AI_GOVERNANCE, AI_SECURITY_MODEL, AI_APPROVAL_MATRIX, AI_CONTEXT_POLICY) — **read-only** during Phase 1 unless a CR expands ownership.
- Legacy WT `.worktrees/ai-governance-work-queues` — reference only; Sprint 1 implementation stays in `ai-governance-sprint1`.

### Explicitly forbidden

- Master PM–locked Atlas roots
- Ops / Deploy Manager / Finance / Executive / Portal / Revenue apps and docs
- CRM schema / SharePoint list schema mutations for AI lists without CR
- Production AI enablement / client-visible AI actions without approval matrix gates

### Dependencies

- Must respect AI approval matrix before any client-visible action.
- No auto-contact clients (standing lock).

### Current status (observed)

- `apps/hvcg-ai-governance/` scaffold present (untracked).
- Collision risk with Ops/Deploy: **none** if namespaces above are respected.
- **Commit/push:** STOPPED pending owner approval.

---

## Workstream C — Deployment Manager Sprint 1 Phase 1

| Field | Assignment |
|-------|------------|
| Owner agent | Deployment Engineer / Deployment Manager (`deployment-engineer` role; handbook `Agents/DeploymentEngineer.md`) |
| Branch | `cursor/deployment-manager-sprint1` |
| Worktree | `.worktrees/deployment-manager-sprint1` |
| Base observed | `2290456` |
| Track | Track 1 / release-ops **tooling only** (not Production mutation) |

### Exclusive application-code paths

- `apps/hvcg-deployment-manager/**`

### Exclusive documentation / sprint paths

- `docs/deployment-sprint1/**`
- `PROJECT_ATLAS/Sprints/Sprint_DeploymentManager1.md`
- `PROJECT_ATLAS/Architecture/DeploymentManagerSprint1.md`
- `PROJECT_ATLAS/QA/DeploymentManagerSprint1/**`
- `PROJECT_ATLAS/Screenshots/DeploymentManagerSprint1/**`
- `PROJECT_ATLAS/Handoffs/DeploymentManagerSprint1.md`
- `PROJECT_ATLAS/Handoffs/proposed/DeploymentManagerSprint1_ATLAS_UPDATE.md`

### Explicitly forbidden

- `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/**` (freeze package)
- Any Production import / PAC deploy / flow activation / connection binding writes
- Shared Atlas roots (Master PM lock)
- Ops / AI / Finance / Executive / Portal / Revenue code
- CRM schema / Activation Framework

### Allowed read-only references

- Track 1 freeze evidence and Deployment Engineer handoff under `.worktrees/deployment-engineer/` (**read-only**)
- `releases/RC-1-Development-Baseline/` (**read-only**)

### Dependencies

- Production remains frozen. Phase 1 is a **manager UI / dry-run / documentation** surface only.
- Any live deploy path requires separate owner gate beyond this authorization.

### Current status (observed)

- `apps/hvcg-deployment-manager/` scaffold present (untracked).
- Collision with Track 1 freeze: **avoided** if freeze package remains untouched.
- **Commit/push:** STOPPED pending owner approval.

---

## Collision matrix

| Pair | Application paths | Sprint docs | Atlas roots | Status |
|------|-------------------|-------------|-------------|--------|
| Ops × AI | `apps/hvcg-operations-hub` vs `apps/hvcg-ai-governance` | Distinct sprint filenames | Shared roots locked to Master PM | **CLEAR** if namespaces held |
| Ops × Deploy | Distinct `apps/hvcg-*` | Distinct sprint filenames | Shared roots locked | **CLEAR** if Track-1 freeze untouched |
| AI × Deploy | Distinct `apps/hvcg-*` | Distinct sprint filenames | Shared roots locked | **CLEAR** |
| Ops × Finance | N/A app | **`Sprint_FinanceOperations1.md` in Ops WT** | — | **COLLISION — OPEN** |
| Ops × Master PM Atlas | — | Allowed Ops-only Atlas paths OK | **Ops edited locked roots + Track7** | **VIOLATION — OPEN** |
| Ops × Executive | Same historical tip `5bb42c2` | Distinct apps required | — | **CLEAR** if no ECC path writes |
| Deploy × Track 1 freeze | Deploy manager app only | — | Freeze package forbidden | **CLEAR** if read-only freeze |

### Pre-implementation resolution actions (required)

1. **Ops:** Stop all edits to locked Atlas roots; create `PROJECT_ATLAS/Handoffs/proposed/OperationsHubSprint1_ATLAS_UPDATE.md` from handoff claims.
2. **Ops:** Remove or relocate `PROJECT_ATLAS/Sprints/Sprint_FinanceOperations1.md` out of Ops ownership (Finance workstream only).
3. **Ops:** Revert `Track7_InternalOperations.md` local edits; propose Track7 updates via proposed Atlas file.
4. **All three:** Do not commit/push until owner approval is separately recorded.
5. **Master PM:** After each approved handoff, reconcile CURRENT_STATE / ROADMAP / NEXT_ACTIONS / indexes / CHANGELOG.

---

## Master PM integration queue

| Workstream | When specialist finishes | Master PM action |
|------------|--------------------------|------------------|
| Ops | Inspect `Handoffs/OperationsHubSprint1.md` + proposed Atlas update | Reconcile shared Atlas; reject Finance sprint file |
| AI | Inspect AI handoff + proposed Atlas update | Reconcile Track 6 / Sprint index entries |
| Deploy | Inspect Deploy Manager handoff + proposed Atlas update | Reconcile deployment status **without** thawing Track 1 |

---

## Protected refs (must remain unchanged by these workstreams)

| Ref | SHA |
|-----|-----|
| Revenue tip `origin/cursor/revenue-sprint3-conversion` | `0073bf49411408cced88873805b432bce4eefb31` |
| Track 1 tag `Track-1-Live-Internal` | `302615956cea80c238172931f5901792f548f59c` |
| Client Portal `cursor/client-portal-data-rooms` | `b8b2005b546797ffdaa276a060cc69e6b0058ba3` |
| Executive `cursor/executive-command-center` | `e074cfcc382b867365ea881e915a2407b63c2908` |
| Finance `cursor/finance-operations` | `c79d35b3ad30e7aef82f7e245c302db173436d8e` |

---

## Decision

**AUTHORIZED for concurrent Phase 1 execution** under exclusive path partitions above.

**NOT AUTHORIZED:** commit, push, merge, deploy, Production mutation, shared Atlas root edits, Finance/ECC/Portal/Revenue/CRM-schema/Track-1 writes.

Master PM remains sole reconciler of shared Project Atlas roots.
