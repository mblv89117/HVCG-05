# UAT Checklist — Track 10 Atlas Design System + Executive Dashboard

**Branch:** `cursor/track10-elite-microsoft-ui`  
**Worktree:** `.worktrees/track10-elite-ui`  
**App:** http://127.0.0.1:5180  
**Storybook:** http://127.0.0.1:6006  
**Package:** [OWNER_UAT_PACKAGE.md](./OWNER_UAT_PACKAGE.md)

## Automated pre-checks (engineering)

- [x] `npm run build` — PASS (2026-07-20)
- [x] `npm run build-storybook` — PASS (2026-07-20)
- [x] `npm run verify:owner-gate` — PASS (2026-07-20)
- [x] Brand logo asset at `public/brand/hvcg-logo.svg`

## Design system (owner)

- [ ] Storybook opens
- [ ] AtlasCard / StatusChip / AI panel stories render in light + dark
- [ ] Components look premium (not default Power Apps)

## Executive Dashboard (owner)

- [ ] Logo visible in command bar
- [ ] Dev/UAT environment banner visible
- [ ] KPI cards load with source badges (pending-safe labels)
- [ ] AI Command Center accepts a prompt (Dev stub response)
- [ ] Approvals table visible
- [ ] Light/dark toggle works
- [ ] Search dialog opens
- [ ] Mobile width: nav toggle works

## Owner sign-off

| Field | Value |
|-------|-------|
| Result | Pass / Fail / Pass with notes |
| Date | |
| Reviewer | Manuel Barela |
| Notes | |

**After sign-off:** STOP — await owner before Client Workspace, Capital, Projects, Documents, Admin modules.
