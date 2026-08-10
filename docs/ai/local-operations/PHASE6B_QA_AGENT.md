# Phase 6B-QA — Website Studio QA Agent + Owner UAT Gate

## Operating model

```
Implementation Complete
→ Run Website Studio QA Agent
→ Resolve blockers
→ Re-run QA
→ Only then return READY FOR MANNY
```

Do **not** report READY FOR OWNER UAT / READY FOR MANNY after coding alone.

Unit tests, typecheck, build, API 200s, and screenshots alone are not sufficient.

## Gate

`NOT TESTED` → `TESTING` → `FAILED QA` → `READY FOR MANNY` → `OWNER APPROVED`

READY FOR MANNY requires:

- 0 BLOCKER / CRITICAL / HIGH defects
- Browser owner-flow PASS
- Before/After H1 identity PASS
- Safety flags PASS
- Production unchanged

## Run locally

Services must already be on loopback:

- Elite: `http://127.0.0.1:5180`
- Hub: `http://127.0.0.1:8790` with `WEBSITE_STUDIO_DB` pointing at this worktree `.data/website-studio/website-studio.sqlite`

```bash
cd scripts/website-studio-qa
npm install
npm run qa:gate
```

Evidence writes to `deployment/reports/website-studio-qa/<commit>-<ts>/` and `.../latest/`.

## Run types

- `SMOKE` — fast path
- `FULL OWNER QA` — complete owner journey
- `TARGETED RETEST` — failed component
- `RELEASE GATE` — required before READY FOR MANNY

## Owner UI

- Home shows **NEEDS YOUR REVIEW** only when gate is `READY FOR MANNY`
- Otherwise shows **NOT READY FOR REVIEW**
- **QA / Readiness** nav shows badge + owner package (Advanced Mode shows evidence metadata)

## Safety

QA may start local preview / restart local services for testing.

QA must not merge, deploy, publish, change DNS, modify Production, or send external communications.
