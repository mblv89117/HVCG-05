# Track 9 — Engineering Operating System (EOS)

**As of:** 2026-07-16 23:45 UTC
**Status SoR:** [../CURRENT_STATE.md](../CURRENT_STATE.md)
**Active branch:** `cursor/track9-eos-sprint2`
**Active worktree:** `.worktrees/track9-eos-sprint2`
**Sprint 1 tip:** `origin/cursor/track9-eos-sprint1` @ `6b36782`

## Purpose

Automate and manage software engineering across the HVCG Operating System.
**Not** part of the Revenue Operating System (Track 2).

## Sprint status

| Sprint | Status |
|--------|--------|
| EOS Sprint 1 | **COMPLETE AND PUSHED (Dev)** @ `6b36782` |
| EOS Sprint 2 | **IMPLEMENTATION COMPLETE (Dev)** — awaiting QA |

## Sprint 1 modules

| Module | Location |
|--------|----------|
| Engineering Command Center | `apps/hvcg-engineering-os/index.html` |
| Master PM Automation | `apps/hvcg-engineering-os/js/master-pm-automation.js` |
| Workflow Engine | `apps/hvcg-engineering-os/js/workflow-engine.js` |
| Agent Bus 2.0 | `apps/hvcg-engineering-os/js/agent-bus-v2.js` |
| Change Request System | `apps/hvcg-engineering-os/js/change-request-system.js` |
| Engineering Analytics | `apps/hvcg-engineering-os/js/engineering-analytics.js` |
| Executive Engineering Dashboard | `apps/hvcg-engineering-os/executive.html` |

## Sprint 2 hardening

| Module | Location |
|--------|----------|
| Workflow transition gates | `config/workflow-stages.json` + `js/workflow-engine.js` |
| KPI SoT | `config/kpi-definitions.json` |
| UI escaping | `js/eos-core.js` + app bootloaders |
| Live snapshot (read-only) | `js/live-snapshot-collector.js` |
| Bus persistence | `js/agent-bus-v2.js` + `store/` |
| Offline agent-comms bridge | `js/agent-bus-bridge.js` |

## Agent ownership

| Role | Agent |
|------|-------|
| Track owner / coordinator | Master Project Management Agent |
| QA | QA Engineer (on request) |
| Deployment | Deployment Engineer (gated — no deploy) |

## Constraints

No Production · No Track 1 · No Revenue Track 2 mutation · No merge/deploy · No live communications · Development only · No commit/push until QA + owner

## Docs

- Sprint 1: `docs/eos-sprint1/` · [Sprint_EOS1.md](../Sprints/Sprint_EOS1.md)
- Sprint 2: `docs/eos-sprint2/` · [Sprint_EOS2.md](../Sprints/Sprint_EOS2.md)
- QA Sprint 2: [../QA/Track9EosSprint2/QA_NOTES.md](../QA/Track9EosSprint2/QA_NOTES.md)
- Handoff: [../Handoffs/Track9EosSprint2.md](../Handoffs/Track9EosSprint2.md)
