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

Manny must not be the primary bug finder. The QA Agent must catch page-identity and decision-action regressions before READY FOR MANNY.

## Gate

`NOT TESTED` → `TESTING` → `FAILED QA` → `READY FOR MANNY` → `OWNER APPROVED`

READY FOR MANNY requires:

- 0 BLOCKER / CRITICAL / HIGH defects
- Browser owner-flow PASS
- Multi-page identity PASS (Home + About + Funding + FAQ + Contact + Book + Accessibility)
- Decision actions PASS with post-conditions (Approve / Reject / Request Changes / Save for Later / Cancel)
- Before/After H1 identity PASS
- Safety flags PASS
- Production unchanged

## Hardened checks (Phase 6B-QA multi-page + decisions)

### Multi-page

- Selecting a page must drive editor label, preview iframe URL, blocks, SEO, Advisor, and fullscreen target
- Draft preview (`:8765`) and baseline preview (`:8766`) must resolve page-specific paths (not always `/`)
- Advisor must not recommend “homepage headline” while a non-Home page is selected
- Randomized extra-page smoke is required on RELEASE GATE

### Decision actions

- Approve → confirmation dialog → `CHANGE APPROVED` / `Approved — Not Published`
- Reject → confirmation dialog → `CHANGE REJECTED` / persisted `ownerStatus=Rejected` / History shows Rejected
- Reject must preserve draft wording + audit evidence (no destructive wipe)
- Save for Later → `Saved for Later`
- Request Changes (owner edit) invalidates prior approval
- Cancel → `Cancelled`
- Destructive Reject/Cancel tests use **synthetic CRs only** — never mutate live pilot `wcr_96016971141f` for reject

### Defect escalation

Page-fallback and Reject-persistence failures are CRITICAL/HIGH and force `FAILED QA`. Clicking a button without asserting post-conditions is not a pass.

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

Pre-fix defect captures for this hardening live under:

`deployment/reports/website-studio-qa/phase6b-qa-defects/`

## Run types

- `SMOKE` — fast path
- `FULL OWNER QA` — complete owner journey
- `TARGETED RETEST` — failed component
- `RELEASE GATE` — required before READY FOR MANNY

## Owner UI

- Home shows **NEEDS YOUR REVIEW** only when gate is `READY FOR MANNY`
- Otherwise shows **NOT READY FOR REVIEW**
- **QA / Readiness** nav shows all gate categories:
  - `NOT TESTED`
  - `TESTING`
  - `FAILED QA`
  - `READY FOR MANNY`
  - `OWNER APPROVED`
- Advanced Mode shows evidence metadata

## Safety

QA may start local preview / restart local services for testing.

QA must not merge, deploy, publish, change DNS, modify Production, or send external communications.

No Phase 6C work in this gate.
