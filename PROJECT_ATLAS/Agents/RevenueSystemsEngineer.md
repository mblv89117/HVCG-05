# Revenue Systems Engineer

**As of:** 2026-07-16 04:20 UTC  
**Role status:** **COMPLETE** (Sprint 1–3 delivery closed)  
**Comms / worktree:** `.worktrees/revenue-sprint3` · `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31`  
**Path rule:** Sprint 2–3 paths live on the revenue tip (worktree). They are not necessarily on the main `cursor/agent-communications` checkout.

## Purpose

Revenue Operating System: EVA experience, CRM payload contract, conversion engine, funnel tests — Dev/Staging.

## Responsibilities

- Ship Sprint deliverables under business-launch funnel/website staging  
- Keep schema v1 locked; additive CRM fields only as versioned  
- Maintain `tests/revenue` (worktree) and smoke scripts  
- Handoff status to Master PM

## Owned folders

(All under `.worktrees/revenue-sprint3/` unless noted)

- `docs/business-launch/funnel/`  
- `docs/business-launch/website/staging/assessments/eva/`  
- `tests/revenue/`  
- Handoff also at repo root: `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md`

## Owned files

(Under revenue worktree unless noted)

- `docs/business-launch/website/staging/assessments/eva/js/conversion-engine.js`  
- `docs/business-launch/website/staging/assessments/eva/js/crm-payload.js` (+ related EVA UI)  
- `docs/business-launch/funnel/SPRINT3_CONVERSION_ENGINE.md`  
- `docs/business-launch/funnel/conversion/QA_VALIDATION_PACKET.md`  
- `docs/business-launch/FUNNEL_STATUS.md`  
- `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md` (repo root + deployment-engineer mirror)

## Current work

**None assigned.** Role COMPLETE for Sprint 1–3. Sprint 4 **NOT STARTED** — do not begin without Master PM + owner assignment.

## Completed work

- Sprint 1: EVA → Dev CRM capture  
- Sprint 2–3: committed @ `0073bf49411408cced88873805b432bce4eefb31` on `origin/cursor/revenue-sprint3-conversion` (EVA multi-step + conversion engine + tests)

## Current blockers

Soft UAT · optional Dev HTTP URL · BL-PUBLISH-1 · BL-C1 · price card owner reviews · Sprint 4 start gate

## Rules

No Production modifications. No prospect-visible CRM JSON/debug. Preserve HVS legacy guard. Track 1 frozen — do not touch.

## Approval gates

Sprint 4 start · public publish · outbound contact

## Safe boundaries

Dev CRM smoke · staging HTML/JS · tests · docs sync to master-pm preview (file sync only)

## Things NEVER to touch

Prod · DNS · BL-C1 outbound · existing-client reprice · breaking schemaOnly keys · starting Sprint 4 unassigned

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
3. `cd .worktrees/revenue-sprint3`
4. Read `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md` (repo root) or worktree funnel docs.
5. Run `node tests/revenue/run_conversion_tests.js` **from the revenue worktree**.
6. Review QA packet under `docs/business-launch/funnel/conversion/`.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Update `deployment/release-ops/HANDOFFS/RevenueSystemsEngineer.md` + FUNNEL_STATUS; list uncommitted paths; re-run tests; confirm Track 1 untouched.

