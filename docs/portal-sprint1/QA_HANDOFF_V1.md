# QA Handoff — Client Portal V1

**Branch:** `cursor/client-portal-sprint1`
**Worktree:** `.worktrees/client-portal-sprint1`
**State:** Uncommitted by instruction
**Scope:** UI and mock data only

## Candidate routes

1. `/` — Client Dashboard
2. `/engagement` — Engagement Status
3. `/timeline` — Project Timeline
4. `/milestones` — Milestones
5. `/funding` — Capital Raise Tracker / Funding Progress
6. `/documents` — Document Upload / Checklist
7. `/messages` — Secure Messaging
8. `/tasks` — Tasks
9. `/meetings` — Meeting Scheduler
10. `/invoices` — Invoices
11. `/notifications` — Notifications
12. `/advisor` — Assigned Advisor
13. `/files` — Secure File Center

## Automated QA

Run from `apps/hvcg-client-portal`:

```bash
npm run qa:all
```

Expected suites:

- TypeScript + Vite production build
- Vitest component/data tests
- Portal smoke route inventory
- Permission/mock-safety checks
- Navigation contract checks
- Responsive CSS checks

## Manual QA focus

- Switch between all mock workspaces and confirm no cross-client rows.
- Test message composer local behavior.
- Test mock upload confirmation.
- Test mock meeting scheduler and e-sign actions.
- Verify invoices are clearly mock/read-only.
- Verify notification read state and empty states.
- Validate desktop, tablet, and mobile navigation density.
- Confirm no live network requests, SharePoint links, email, or SMS.

## Protected scope

Revenue Sprint 1–4, Conversion Engine, CRM Schema, Activation Framework, Production, live DNS/email/SMS, and Track 1 must remain unchanged.

## QA disposition

- **PASS:** authorize a separate commit instruction.
- **FAIL:** return defects only; keep all work uncommitted.
