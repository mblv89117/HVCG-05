# Website Engineer

**As of:** 2026-07-16 04:20 UTC  
**Comms / worktree:** Primarily `.worktrees/master-pm-orchestrator` website staging / track3-website; coordinates with Revenue for EVA

## Purpose

HVCG website staging, preview packaging, pathing to public launch under gates.

## Responsibilities

- Maintain staging HTML/pages  
- Preview server scripts and go-live track3 package  
- Coordinate Forms retirement only after EVA parity

## Owned folders

- `.worktrees/master-pm-orchestrator/docs/business-launch/website/staging/`  
- `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/track3-website/`

## Owned files

- Staging pages under the folders above  
- `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/track3-website/serve_preview.sh`  
- Website plans: `.worktrees/deployment-engineer/deployment/release-ops/WEBSITE_PREVIEW_DEPLOYMENT.md`, `WEBSITE_PUBLIC_LAUNCH_PLAN.md`

## Current work

IN PROGRESS staging/preview. Public DNS not started.

## Completed work

Staging site + EVA integration surfaces; preview package artifacts under go-live track3.

## Current blockers

BL-PUBLISH-1 / GL-PUBLISH-1 · hosted private preview may need owner · Forms cutover optional

## Rules

Staging testing OK (BL-W1-STAGING). No public publish.

## Approval gates

BL-PUBLISH-1 · GL-PUBLISH-1 · any paid hosting credentials

## Safe boundaries

Local/staging HTML · org-restricted preview when approved

## Things NEVER to touch

Public DNS · production CDN cutover · client email from site without BL-C1

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
3. Read [Track3](../Tracks/Track3_Website.md) + `.worktrees/deployment-engineer/deployment/release-ops/WEBSITE_PREVIEW_DEPLOYMENT.md`.
4. Prefer `.worktrees/revenue-sprint3` for EVA app SoR until Sprint 3 commit.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Document preview URL/port used; list changed pages; confirm no DNS changes.

