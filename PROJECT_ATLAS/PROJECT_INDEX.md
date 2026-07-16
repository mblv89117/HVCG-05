# PROJECT_INDEX

**As of:** 2026-07-16 04:20 UTC  
**Repo root:** `/Volumes/MacMiniPro2TB/HVCG Project Management System`  
**Canonical SoR:** this Atlas. Begin here before any other work.

## Current architecture (summary)

HVCG runs a Microsoft 365 / Power Platform stack: SharePoint lists + Dataverse solution **HVCGCommandCenterDev**, Power Automate flows, planned Power Apps canvas (unpublished), plus a **staging website** with EVA assessment app feeding **Dev CRM**.  

Detail: [ARCHITECTURE.md](ARCHITECTURE.md) · root/`docs/architecture/` · freeze packages under `releases/` and deployment-engineer worktree.

## How the system is organized

| Layer | Where |
|-------|-------|
| Orientation brain | `PROJECT_ATLAS/` (this tree) — **canonical SoR** |
| Agent messaging | `.agent-comms/` + `docs/agents/` + `scripts/agent-comms/` |
| Business launch / Revenue OS | `.worktrees/revenue-sprint3/` @ `0073bf4` (Sprint 2–3 SoR); master-pm mirrors |
| Deployment / Prod freeze | `.worktrees/deployment-engineer/deployment/release-ops/` + `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` |
| CRM module | `docs/crm/`, `src/power-automate/`, `.worktrees/crm-*` |
| Historical OS releases | `releases/v1.0.0`, `releases/v1.1.0`, migrations |
| Parallel products | executive / operations / finance / portal / AI worktrees |

## Where everything lives (Atlas map)

| Need | Open |
|------|------|
| What is true now | [CURRENT_STATE.md](CURRENT_STATE.md) |
| What to do next | [NEXT_ACTIONS.md](NEXT_ACTIONS.md) |
| Who owns work | [OWNERSHIP.md](OWNERSHIP.md) · [AGENT_ASSIGNMENTS.md](AGENT_ASSIGNMENTS.md) |
| Resume cold | [AGENT_HANDOFF.md](AGENT_HANDOFF.md) |
| Tracks | [Tracks/](Tracks/) |
| Sprints | [Sprints/](Sprints/) |
| Role handbooks | [Agents/](Agents/) |
| Decisions | [DECISIONS.md](DECISIONS.md) |
| Issues | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |
| Releases | [RELEASES.md](RELEASES.md) |

## What each Track owns

| Track | Owns | Status |
|-------|------|--------|
| [1](Tracks/Track1_Production.md) | Internal Prod CRM freeze | **FROZEN LIVE—INTERNAL** |
| [2](Tracks/Track2_RevenueOS.md) | Revenue OS / EVA / conversion | Sprints 1–3 **COMPLETE**; **ready for Sprint 4** (not started) |
| [3](Tracks/Track3_Website.md) | Website staging → public | In progress; DNS gated |
| [4](Tracks/Track4_ClientPortal.md) | Portal / data rooms | Invites gated BL-C1 |
| [5](Tracks/Track5_ClientOnboarding.md) | Onboarding specs/automation | Gated D-002/BL-C1 |
| [6](Tracks/Track6_AI.md) | AI governance | Worktree active |
| [7](Tracks/Track7_InternalOperations.md) | Ops/exec/finance/Draft flows | Parallel; Prod Draft-heavy |
| [8](Tracks/Track8_Enterprise.md) | Scale / v2 | Horizon |

## What each Sprint accomplished

| Sprint | Result |
|--------|--------|
| [1](Sprints/Sprint1.md) | EVA → Dev CRM — **COMPLETE** |
| [2](Sprints/Sprint2.md) | Multi-step EVA — **COMPLETE** @ `0073bf4` |
| [3](Sprints/Sprint3.md) | Conversion engine — **COMPLETE** @ `0073bf4` |
| [4](Sprints/Sprint4.md) | **NOT STARTED** (Track ready) |

## Revenue tip

- Branch: `origin/cursor/revenue-sprint3-conversion`  
- Commit: `0073bf49411408cced88873805b432bce4eefb31`  
- Role: Revenue Systems Engineer — **COMPLETE**

## What every agent owns

See [Agents/](Agents/) handbooks and [AGENT_ASSIGNMENTS.md](AGENT_ASSIGNMENTS.md).

## How deployments work

1. Prove in Development (RC-1 pattern).  
2. Owner approval.  
3. Deployment Engineer imports managed solution, binds connections, smokes.  
4. Freeze package + rollback guide.  
5. Track 1 currently **frozen** — no further Prod without new approval.  

Details: [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md).

## How releases work

Versioned folders under `releases/` (and worktree `releases/`) with `version.json`, checksums, validation, smoke, guides. Index: [RELEASES.md](RELEASES.md).

## Current roadmap / next milestones

[ROADMAP.md](ROADMAP.md) · [NEXT_ACTIONS.md](NEXT_ACTIONS.md) · [Sprints/BACKLOG.md](Sprints/BACKLOG.md)

Priority theme: **protect Track 1 freeze** → **Sprint 4 assignment** → gated website preview / soft UAT / pilot.
