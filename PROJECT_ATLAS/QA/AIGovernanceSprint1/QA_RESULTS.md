# AI Governance Sprint 1 Phase 1 — QA Results

**Date:** 2026-07-16
**Branch:** `cursor/ai-governance-sprint1`
**Worktree:** `.worktrees/ai-governance-sprint1`
**Result:** PASS
**Mode:** Offline/mock only

## Automated results

| Area | Command / method | Result |
|------|------------------|--------|
| TypeScript + production build | `npm run build` | PASS |
| Unit / domain model | `npm run test` | PASS |
| Navigation | React Testing Library routes | PASS |
| Permission states | Owner/Admin/Auditor tests | PASS |
| Prompt versions | Lifecycle/rollback model tests | PASS |
| Audit log | Action and evidence completeness tests | PASS |
| Responsive | Playwright 1440×1000 and 390×844 | PASS |
| Browser QA | `npm run qa:browser` | PASS — 11 routes |
| Console/page errors | Playwright listeners | PASS — none |
| Broken links | `scripts/qa.mjs` local-link scan | PASS |
| Protected paths | Git status allow-list | PASS |
| Live API prohibition | Source token scan | PASS |

## Unit result

```text
Test Files  2 passed (2)
Tests       15 passed (15)
```

## Build result

```text
dist/index.html                  0.49 kB
dist/assets/index-*.css         23.16 kB (4.96 kB gzip)
dist/assets/index-*.js         287.58 kB (88.69 kB gzip)
```

## Browser QA

```text
BROWSER QA PASS · 11 routes · desktop/mobile · 5 screenshots
```

Verified:

- all primary routes return successfully;
- `main` is visible;
- no desktop or mobile horizontal overflow;
- mobile navigation opens;
- no console errors;
- no page errors.

## Screenshots

- `screenshots/overview-desktop.png`
- `screenshots/agent-registry-desktop.png`
- `screenshots/approval-queue-desktop.png`
- `screenshots/overview-mobile.png`
- `screenshots/navigation-mobile.png`

## Protected-path verification

Allowed diff roots only:

- `apps/hvcg-ai-governance/`
- `docs/ai-governance-sprint1/`
- assigned AI Governance Sprint 1 Atlas documents and QA folder

No shared Atlas root index, subsystem, deployment, CRM, Production, Track 1, or existing worktree files were modified.

## Known limitations

1. All records are synthetic and in-memory.
2. Role switching demonstrates policy states but is not authentication.
3. Approval buttons have no persistence or side effects.
4. No agent runtime, Git, billing, identity, Microsoft 365, client, financial, deployment, or Production adapter exists.
5. Root Atlas completion statuses require Master PM reconciliation from ProposedUpdates.
