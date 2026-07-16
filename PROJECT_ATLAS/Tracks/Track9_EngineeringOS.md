# Track 9 — Engineering Operating System (EOS)

**As of:** 2026-07-16 23:20 UTC
**Status SoR:** [../CURRENT_STATE.md](../CURRENT_STATE.md)
**Branch (Sprint 1):** `cursor/track9-eos-sprint1`
**Worktree:** `.worktrees/track9-eos-sprint1`
**Base:** `cursor/project-atlas-rc1` @ `bd07e61`

## Purpose

Automate and manage software engineering across the HVCG Operating System.
**Not** part of the Revenue Operating System.

## Business objectives

- Reduce owner coordination
- Automate engineering management
- Increase delivery speed and engineering visibility
- Reduce project risk
- Protect Project Atlas
- Improve scalability and institutional knowledge

## Sprint 1 status

**COMPLETE AND PUSHED (Development only) — APPROVED WITH MINOR CHANGES**

## Modules (Sprint 1)

| Module | Location |
|--------|----------|
| Engineering Command Center | `apps/hvcg-engineering-os/index.html` |
| Master PM Automation | `apps/hvcg-engineering-os/js/master-pm-automation.js` |
| Workflow Engine | `apps/hvcg-engineering-os/js/workflow-engine.js` |
| Agent Bus 2.0 | `apps/hvcg-engineering-os/js/agent-bus-v2.js` |
| Change Request System | `apps/hvcg-engineering-os/js/change-request-system.js` |
| Engineering Analytics | `apps/hvcg-engineering-os/js/engineering-analytics.js` |
| Executive Engineering Dashboard | `apps/hvcg-engineering-os/executive.html` |

## Agent ownership

| Role | Agent |
|------|-------|
| Track owner / coordinator | Master Project Management Agent |
| QA | QA Engineer (on request) |
| Deployment | Deployment Engineer (gated — no deploy this sprint) |

## Dependencies (reuse only)

Project Atlas · Agent framework / registry · Worktree model · Branching strategy · QA process · Deployment process · Existing documentation · Agent-comms v1 (Bus 2.0 additive)

## Constraints

No Production · No Track 1 · No Revenue Sprint 4 mutation · No merge/deploy · No email/Teams · Development only

## Roadmap / future sprints

See [../Sprints/Sprint_EOS1.md](../Sprints/Sprint_EOS1.md) and [../Sprints/Sprint_EOS2_Planning.md](../Sprints/Sprint_EOS2_Planning.md).

## Acceptance / QA / Deployment

- Acceptance: [../Sprints/Sprint_EOS1.md](../Sprints/Sprint_EOS1.md)
- QA: [../QA/Track9EosSprint1/QA_NOTES.md](../QA/Track9EosSprint1/QA_NOTES.md)
- Deployment: **NOT AUTHORIZED** this sprint

## Docs package

`docs/eos-sprint1/` — impact, architecture, plan, backlog, risks, testing, release notes, handoff.
