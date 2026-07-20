# AGENT_HANDOFF

**Audience:** New Cursor agent · new ChatGPT conversation · new engineer  
**As of:** 2026-07-19 (Master PM program audit)  
**Goal:** Resume with **zero** prior chat history.

## 60-second orientation

1. This repo is the **HVCG Project Management System** (High Value Capital Group platform).  
2. **PROJECT_ATLAS/** is the **canonical source of truth** — docs only. Start at [CURRENT_STATE.md](CURRENT_STATE.md).  
3. **Elite Integration RC1** is the current product release SoR: `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/` — **CONDITIONAL GO** local Owner UAT · **NO-GO** Production.  
4. **Track 1 is FROZEN — LIVE—INTERNAL** in HVCG Production. Do not change Prod without new owner approval.  
5. **Revenue OS Sprints 1–4 are COMPLETE** (Dev/Staging). S3 tip `0073bf4`; S4 tip `bf34c93`. Revenue is **deferred from Elite RC1** until gated.  
6. **QBO tip exists** at `c892215` but is **not merged** into RC1 (Accounting shows BLOCKED).  
7. Prefer **repository evidence** over chat. Root `PROJECT_STATUS.md` Maker OA text is widely **stale**.  
8. Executive report: [Reports/EXECUTIVE_PROGRAM_STATUS_2026-07-19.md](Reports/EXECUTIVE_PROGRAM_STATUS_2026-07-19.md).  
9. Naming: Jul 16 [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) ≠ Elite Integration **RC1**.

## Canonical SoR

Every new agent begins with [PROJECT_INDEX.md](PROJECT_INDEX.md). Read Atlas before work; update Atlas before ending. Role details: [Agents/](Agents/).

## Read order (mandatory)

1. [CURRENT_STATE.md](CURRENT_STATE.md)  
2. [Reports/EXECUTIVE_PROGRAM_STATUS_2026-07-19.md](Reports/EXECUTIVE_PROGRAM_STATUS_2026-07-19.md)  
3. Elite RC1 Release pack under `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/`  
4. [NEXT_ACTIONS.md](NEXT_ACTIONS.md) · [ROADMAP.md](ROADMAP.md) · [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)  
5. [AGENT_ASSIGNMENTS.md](AGENT_ASSIGNMENTS.md)  
6. Your role handbook under [Agents/](Agents/)  
7. [Tracks/](Tracks/) + [Sprints/](Sprints/) as needed  
8. [OWNERSHIP.md](OWNERSHIP.md) + [DECISIONS.md](DECISIONS.md)  
9. Jul 16 [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) only for pre-S4 anchors (not Elite RC1)

## Authoritative evidence (do not invent)

| Topic | Prefer |
|-------|--------|
| Elite product release / Owner UAT | `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/` |
| Program status | [CURRENT_STATE.md](CURRENT_STATE.md) + executive report |
| Track 1 Prod freeze | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` + GO_LIVE_STATUS |
| Revenue Sprints 1–3 | `0073bf4` · `.worktrees/revenue-sprint3` |
| Revenue Sprint 4 | `bf34c93` · `.worktrees/revenue-sprint4` |
| QBO tip (unmerged) | `c892215` · `.worktrees/quickbooks-integration` |
| Plaid tip | `6d78514` · `.worktrees/plaid-integration` |
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
- No new features on Elite RC1 integration branch (stabilization/QA only)  
- No QBO merge into RC1 before written QA ACK  
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
# Always: read PROJECT_ATLAS/CURRENT_STATE.md first
git worktree list
# Elite RC1: .worktrees/atlas-integration-release @ 95ec0fa
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
