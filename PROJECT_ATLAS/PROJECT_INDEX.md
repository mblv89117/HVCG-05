# PROJECT_INDEX

**As of:** 2026-07-16 19:52 UTC
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
| Business launch / Revenue OS | Revenue Systems Engineer; `.worktrees/revenue-sprint4/` @ `7fd8bf2` (Sprints 1–4 Phase 1 complete) |
| Deployment / Prod freeze | `.worktrees/deployment-engineer/deployment/release-ops/` + `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` |
| CRM module | `docs/crm/`, `src/power-automate/`, `.worktrees/crm-*` |
| Historical OS releases | `releases/v1.0.0`, `releases/v1.1.0`, migrations |
| Parallel products | Executive Command Center Sprint 1 (owner review) / Client Portal Sprint 1 (complete) / operations / finance / AI worktrees |

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
| Track index | [TRACK_INDEX.md](TRACK_INDEX.md) |
| Sprint index | [SPRINT_INDEX.md](SPRINT_INDEX.md) |
| Agent index | [AGENT_INDEX.md](AGENT_INDEX.md) |
| Decisions | [DECISIONS.md](DECISIONS.md) |
| Issues | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |
| Releases | [RELEASES.md](RELEASES.md) |
| Pre-Sprint 4 checkpoint | [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) |

## What each Track owns

| Track | Owns | Status |
|-------|------|--------|
| [1](Tracks/Track1_Production.md) | Internal Prod CRM freeze | **FROZEN LIVE—INTERNAL** |
| [2](Tracks/Track2_RevenueOS.md) | Revenue OS / EVA / conversion | Sprints 1–3 + Sprint 4 Phase 1 **COMPLETE** |
| [3](Tracks/Track3_Website.md) | Website staging → public | In progress; DNS gated |
| [4](Tracks/Track4_ClientPortal.md) | Portal / data rooms | Sprint 1 **COMPLETE**; invites gated BL-C1 |
| [5](Tracks/Track5_ClientOnboarding.md) | Onboarding specs/automation | Gated D-002/BL-C1 |
| [6](Tracks/Track6_AI.md) | AI governance | Worktree active |
| [7](Tracks/Track7_InternalOperations.md) | Ops/exec/finance/Draft flows | Executive Command Center Sprint 1 **COMPLETE** |
| [8](Tracks/Track8_Enterprise.md) | Scale / v2 | Horizon |

## What each Sprint accomplished

| Sprint | Result |
|--------|--------|
| [1](Sprints/Sprint1.md) | EVA → Dev CRM — **COMPLETE** |
| [2](Sprints/Sprint2.md) | Multi-step EVA — **COMPLETE** @ `0073bf4` |
| [3](Sprints/Sprint3.md) | Conversion engine — **COMPLETE** @ `0073bf4` |
| [4](Sprints/Sprint4.md) | Phase 1 Activation Framework **COMPLETE** (Dev/Staging) |
| [Client Portal 1](Sprints/Sprint_ClientPortal1.md) | **COMPLETE** |
| [Executive Command Center 1](Sprints/Sprint_ExecutiveCommandCenter1.md) | **COMPLETE** |

## Revenue tip

- Branch: `cursor/revenue-sprint4-activation`  
- Commit: `7fd8bf270dc080eea9a3326184707169a3b120ca`  
- Role: Revenue Systems Engineer — **COMPLETE** for Sprints 1–4 Phase 1

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

Priority theme: **protect Track 1 freeze** → **preserve completed Executive Sprint 1** → gated website preview / soft UAT / pilot.
