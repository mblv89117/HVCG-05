# Track 4 — Client Portal

**Status:** Version 1 UI **COMPLETE — AWAITING QA**; uncommitted; **Prod portal invites NOT started** (BL-C1)
**As of:** 2026-07-16

## What Track 4 owns

Client portal & data rooms experiences, invite flows (gated), client-facing SharePoint/portal artifacts.

## Evidence

| Item | Path / note |
|------|-------------|
| Sprint 1 worktree | `.worktrees/client-portal-sprint1` · `cursor/client-portal-sprint1` |
| MVP app | `apps/hvcg-client-portal` (Vite/React; mocked integrations) |
| Architecture / QA / handoff | `docs/portal-sprint1/` |
| Prior schema package | `.worktrees/client-portal-data-rooms` · `cursor/client-portal-data-rooms` @ `b8b2005` |
| Comms agentId | `client-portal` |
| Invite / outbound | Blocked on **BL-C1** (OWNER_DECISIONS) |
| Automations Track note | GO_LIVE: no Prod activate beyond LeadQualified |

## Sprint 1 Phase 1

Secure multi-client dashboard: Home, Engagement, Funding (11 stages), Document Checklist, Messages, Tasks, Meetings, Advisor, Secure File Center. See [Sprint_ClientPortal1.md](../Sprints/Sprint_ClientPortal1.md).

## Version 1 QA candidate

Additive UI modules: Project Timeline, Milestones, Invoices, and dedicated Notifications. All external dependencies remain mocked. See [Sprint_ClientPortal_V1.md](../Sprints/Sprint_ClientPortal_V1.md).

## Do not

Send portal invites or client emails without BL-C1. Do not modify Track 1, Revenue Sprint 1–4, or CRM schema from this track.
