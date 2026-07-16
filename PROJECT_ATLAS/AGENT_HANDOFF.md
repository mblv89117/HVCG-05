# AGENT_HANDOFF

**Audience:** New Cursor agent · new ChatGPT conversation · new engineer
**As of:** 2026-07-16 22:46 UTC
**Goal:** Resume with **zero** prior chat history.

## 60-second orientation

1. This repo is the **HVCG Project Management System** (High Value Capital Group platform).
2. **PROJECT_ATLAS/** is the **canonical source of truth** — docs only.
3. **Track 1 is FROZEN — LIVE—INTERNAL** in HVCG Production. Do not change Prod without new owner approval.
4. **Revenue OS Sprints 1–4 are COMPLETE in Dev/Staging.** Sprint 4 implementation: `7e4eb10`; closure docs / branch tip: `bf34c93` on `origin/cursor/revenue-sprint4-activation`.
5. Sprint 5 is **PLANNING ONLY — NOT ASSIGNED / NOT STARTED**.
6. Prefer **repository evidence** over chat. Never rely on previous chat history.
7. Pre-Sprint 4 checkpoint: [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md). It locks committed SHAs and excludes dirty worktree content.

## Canonical SoR

Every new agent begins with [PROJECT_INDEX.md](PROJECT_INDEX.md). Read Atlas before work; update Atlas before ending. Role details: [Agents/](Agents/).

## Read order (mandatory)

1. [PROJECT_INDEX.md](PROJECT_INDEX.md)
2. [CURRENT_STATE.md](CURRENT_STATE.md)
3. [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)
4. [Tracks/Track1_Production.md](Tracks/Track1_Production.md)
5. [Tracks/Track2_RevenueOS.md](Tracks/Track2_RevenueOS.md)
6. [Sprints/Sprint3.md](Sprints/Sprint3.md) · [Sprints/Sprint4.md](Sprints/Sprint4.md)
7. Your role handbook under [Agents/](Agents/)
8. [KNOWN_ISSUES.md](KNOWN_ISSUES.md) + [NEXT_ACTIONS.md](NEXT_ACTIONS.md)
9. [OWNERSHIP.md](OWNERSHIP.md) + [DECISIONS.md](DECISIONS.md)
10. [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md)

## Authoritative evidence (do not invent)

| Topic | Prefer |
|-------|--------|
| Track 1 Prod freeze | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` + `.worktrees/deployment-engineer/deployment/release-ops/GO_LIVE_STATUS.md` |
| Deployment Engineer resume | `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` |
| Revenue Sprints 1–3 code tip | `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31` · worktree `.worktrees/revenue-sprint3` |
| Revenue Sprint 4 tip | `origin/cursor/revenue-sprint4-activation` @ `bf34c93` · implementation `7e4eb10` · worktree `.worktrees/revenue-sprint4` |
| Revenue handoff doc | [Handoffs/RevenueSprint4.md](Handoffs/RevenueSprint4.md) |
| RC-1 Dev baseline | `releases/RC-1-Development-Baseline/` |
| Owner gates | `.worktrees/master-pm-orchestrator/docs/business-launch/OWNER_DECISIONS.md` |
| Agent bus | `docs/agents/AGENT_COMMUNICATIONS.md` |

## Environments (verified in Deployment Engineer handoff)

| Env | URL |
|-----|-----|
| Production | `https://orgee2f7545.crm.dynamics.com/` |
| Development | `https://org1131a2b0.crm.dynamics.com/` |

PAC profile historically used: `HVCG-Dev-Maker` · do **not** re-run `pac auth create` while a valid profile exists (per prior ops guidance).

## Hard safety (standing)

- No Production changes without owner gate
- No extra Prod flow activation (only LeadQualified is Activated under freeze)
- No canvas publish (D-002 / OA-CRM-09 open)
- No client outbound / portal invite (BL-C1)
- No public DNS (BL-PUBLISH-1 / GL-PUBLISH-1)
- No existing-client reprice (ACCG Access Plus $4,539/mo locked; HVS legacy)
- No sample data to Prod
- No commit/push unless the human explicitly asks

## How to resume engineering work

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
cd "$HVCG_REPO_ROOT"
# Always: read PROJECT_ATLAS/PROJECT_INDEX.md first
git worktree list
# Revenue Sprint 4: .worktrees/revenue-sprint4 @ bf34c93 (implementation 7e4eb10)
# RC-1 remains the pre-Sprint 4 checkpoint; Sprint 4 is Dev/Staging only
# Enter the worktree for your role (see AGENT_ASSIGNMENTS.md)
```

## How to hand off when you leave

1. Update PROJECT_ATLAS before ending (protocol in agent handbooks).
2. If a sprint completed, update CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS.
3. Refresh Track / Sprint pages with evidence links.
4. Post agent-comms message if the bus is in use.
5. Do not merge, deploy, or activate flows as part of handoff unless owner-approved.

## Stale documentation warning

Master PM `docs/business-launch/go-live/GO_LIVE_STATUS.md` may still say Prod was blocked earlier. For Track 1, trust **Track-1-Live-Internal** + Deployment Engineer GO_LIVE_STATUS.
