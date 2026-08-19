# MASTER DECISION LOG

**Owner:** Master PM  
**As of:** 2026-07-15 15:56 PT  
**Bus mirror:** D-002 open (`cda6aaac`); D-001 closed by evidence

## Open — owner (Manny)

| ID | Decision | Priority | Blocks |
|----|----------|----------|--------|
| D-002 | Build/publish CRM canvas or schedule Maker session (OA-CRM-09) | HIGH | CRM UI smoke / live exit |
| D-003 | Merge approval into release/main when Master issues packet | — | Not requested yet |
| D-004 | Any **new** agent-communications infrastructure beyond tip `2c064b3` | CRITICAL if raised | Default **DENIED** — use committed bus only |

## Closed

| ID | Decision | Outcome |
|----|----------|---------|
| D-001 | Maker connector consent (HVCG Development) | **CLOSED** — 4/4 connections bound |
| COMMS-CANON | Treat committed Agent Communications as SoR | **AFFIRMED** 2026-07-15 — tip `2c064b3` pushed; no rebuild/fork |

## Shared-file change windows

| Req | Files | Ruling |
|-----|-------|--------|
| SF-001 | Ops shared `_index.json` + `command-center-views.json` | **CLOSED** — exclusive SoR; indexes restored to `b75b19b` on Ops tip `a584f61` |

## Master resolves without asking

- Status classification, READY calls, routing, conflict ownership, idle/stale determination, offline validation ownership, merge **order** recommendations (not merges).
- Enforcement: agents use committed `.agent-comms` only; reject duplicate infra unless D-004 approved.
