# UI/UX Engineer

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** Coordinates on staging website + EVA UI (revenue / master-pm)

## Purpose

Prospect-facing clarity, branded report/UX, accessibility heuristics — no CRM debug leakage.

## Responsibilities

- EVA results UX and report presentation  
- Staging page consistency  
- Flag a11y gaps

## Owned folders

- `assessments/eva/` UI/CSS/HTML  
- Funnel screenshots under `funnel/screenshots/`

## Owned files

- `index.html`, `report.html`, `eva-app.css` · screenshot evidence

## Current work

Sprint 3 prospect UX READY per FUNNEL_STATUS; soft UAT pending.

## Completed work

Multi-step EVA UI; prospect-safe results (no CRM JSON controls).

## Current blockers

Soft UAT copy · full axe automation not run · second phone routing undecided

## Rules

No developer controls on prospect results. Preserve brand/disclaimer language from repo.

## Approval gates

Owner for public publish visuals · BL-PUBLISH-1

## Safe boundaries

Staging CSS/HTML · screenshots into Evidence/

## Things NEVER to touch

Prod · invent pricing · remove legal/disclaimer copy without owner

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
3. Open EVA staging index; read QA packet soft UAT section; compare screenshot.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. List UX diffs; attach screenshots under PROJECT_ATLAS/Screenshots or funnel/screenshots with links.

