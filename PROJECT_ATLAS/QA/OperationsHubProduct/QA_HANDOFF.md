# QA Handoff — Operations Hub Command Center

**Status:** READY FOR QA  
**Branch:** `cursor/operations-hub-sprint1`  
**Data mode:** Mock product store (no live Dataverse)  
**Generated evidence:** `PROJECT_ATLAS/QA/OperationsHubProduct/`

## Scope delivered

- Project portfolio + project detail command center
- Required views (10) and status vocabulary
- Workflows: create/update project, milestones, tasks, assign/reassign, priority, complete, blockers, risks, issues, approvals, decisions, comments, documents, activity
- Executive Dashboard integration (Ops Hub `/executive` + ECC Operations page portfolio table)
- Role-aware module access (`portfolio` on Admin/Manager/Finance/Advisor/Assistant)
- Unit tests + Playwright offline QA

## Test evidence

| Suite | Result | Location |
| --- | --- | --- |
| Unit (Vitest) | **6/6 passed** | `apps/hvcg-operations-hub` → `npm run test` |
| Offline QA (Playwright) | **9/9 passed** | `PROJECT_ATLAS/QA/OperationsHubProduct/QA_RESULTS.md` |
| Screenshots | 4 | `PROJECT_ATLAS/QA/OperationsHubProduct/screenshots/` |

### Offline QA checks (all PASS)

- Portfolio, project-detail, executive, operations routes
- 10 portfolio views present
- Project detail workflows render
- Executive escalations from Ops Hub
- Mobile 390×844 portfolio (no overflow)
- Assistant role: portfolio yes, hiring no

## How to re-verify

```bash
cd apps/hvcg-operations-hub
npm run qa:all
```

ECC Operations page change: `apps/hvcg-executive-command-center/src/pages/Dashboards.tsx` (`OperationsPage` executive portfolio). Prefer `npm run test` from that app after `npm install` if node_modules are missing.

## Manual smoke (recommended)

1. Open `/portfolio` — switch each view tab; search for “Summit”.
2. Create project → open it → create task → complete → log risk → request approval.
3. From Portfolio approval queue, Approve one item; confirm activity updates.
4. Open `/executive` — confirm escalations list and **Open portfolio** link.
5. Switch role to Assistant — Portfolio visible; Hiring hidden.
6. ECC Operations — confirm Executive portfolio table and escalations copy.

## Out of scope / known limits

- Mock store only — not persisted to Dataverse
- Outlook / Teams / Automation not live-wired (interface documented)
- Legacy `/projects` board retained as snapshot with link to Portfolio (not a duplicate task system)
- Orchestration / ATLAS-R / auth debugging excluded from this product build

## User documentation

`docs/operations/USER_GUIDE_OPERATIONS_HUB.md`

## Sign-off ask

Confirm READY FOR QA → approve commit when owner ready. Do not merge/deploy without approval.
