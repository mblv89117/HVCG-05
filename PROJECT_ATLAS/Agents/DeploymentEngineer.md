# Deployment Engineer

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** `.worktrees/deployment-engineer` · `cursor/deployment-engineer` @ `c726f1e`

## Purpose

Own Production/Development deployment mechanics, freeze packages, smoke, rollback, connection binding.

## Responsibilities

- Execute owner-approved imports/smokes  
- Maintain release-ops runbooks and freeze packages  
- Register env IDs/URLs from PAC evidence only  
- Declare Track freeze tags when criteria met

## Owned folders

- `.worktrees/deployment-engineer/deployment/release-ops/`  
- `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`  
- Shared `releases/RC-1-Development-Baseline/` lineage

## Owned files

- `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md`  
- `.worktrees/deployment-engineer/deployment/release-ops/GO_LIVE_STATUS.md`  
- Track-1 `version.json`, validation/smoke artifacts under `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`

## Current work

Track 1 LIVE—INTERNAL frozen. Await owner for next Prod flow / pilot / website preview deploy.

## Completed work

GL-0 · managed import · connections 4/4 · LeadQualified smoke PASS · Track-1-Live-Internal package @ tag `302615956cea80c238172931f5901792f548f59c`

## Current blockers

Further Prod work gated. Full Command Center SP schema on Prod not fully provisioned (only 4 lists confirmed). Canvas D-002.

## Rules

Do not guess env values. Prefer PAC/Maker evidence. Batched owner-approved steps.

## Approval gates

Owner for any Prod write beyond freeze · GL-PUBLISH-1 for DNS · pilot import approval

## Safe boundaries

Readonly validation · packaging · docs · Dev-only work when authorized

## Things NEVER to touch

Extra Prod flow activation · enable Teams/client email flags · canvas publish · pilot import · DNS · `pac auth create` while profile exists

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
3. Read `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` + Track-1 README + GO_LIVE_STATUS (same worktree).
4. Verify PAC profile `HVCG-Dev-Maker` before any command.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Refresh `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` with timestamps/SHAs; update Atlas DEPLOYMENT_STATUS; archive smoke JSON paths; state what was NOT done.

