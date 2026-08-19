# Atlas CEO Command Center — UAT Plan

**Audience:** Manny / owner reviewer
**Environment:** Local Development/UAT  
**No live actions:** Yes

## Start

```bash
cd apps/hvcg-executive-command-center
npm install
npm run dev
```

Open the local URL printed by Vite.

## Owner scenarios

1. Executive Home opens without technical knowledge.
2. GREEN/YELLOW/RED health is visible and source-labeled.
3. Pending approvals are findable in one click.
4. Approval buttons show a Development-only result and execute nothing.
5. Agent status shows branch, worktree, blockers, QA, and owner gate.
6. Portfolio shows Tracks 1–9 and Track 1 frozen.
7. Revenue distinguishes repository status, unavailable numbers, and
   Development sample client records.
8. Engineering shows EOS release state without duplicating EOS logic.
9. Morning Brief identifies changes, decisions, blockers, risks, release
   readiness, missing data, and top three actions.
10. Technical drill-down does not clutter the home page.

## Pass criteria

- No sample value is presented as live.
- No action sends, deploys, activates, publishes, or writes externally.
- No horizontal overflow at desktop widths 1280 and 1440.
- Missing and stale data states are obvious.
- Owner can identify the top three actions within 30 seconds.

## UAT result

Pending owner/QA review. Do not commit or push.
