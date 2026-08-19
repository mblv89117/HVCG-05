# QA Defect Log

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT

## Open defects

### DEF-QA-001 — HIGH
- **Workstream:** Operations Hub  
- **Branch / commit:** `cursor/operations-hub` / `a73929d`  
- **Affected files:** `src/power-automate/flows/_index.json`, `src/power-automate/definitions/_index.json`, `src/sharepoint/lists/_index.json`, `src/sharepoint/views/command-center-views.json`  
- **Reproduction:** `git diff --stat b75b19b...HEAD -- <files>` → 496 insertions / non-zero churn  
- **Expected:** Tip contains exclusive Ops package only (per ownership redesign / handoff)  
- **Actual:** Locked shared indexes still diverge from merge-base on tip (legacy mixed commit residue)  
- **Evidence:** QA_CONFLICT_REPORT.md; conflict `51f47dc4`  
- **Owner:** operations (fix) + parent path-filter until fixed  
- **Status:** OPEN — CHANGES REQUESTED  
- **Retest:** Pending strip or documented path-filtered merge packet approved by Master PM  

### DEF-QA-002 — HIGH
- **Workstream:** Agent Communications + CRM  
- **Branch / commit:** MAIN working tree on `cursor/agent-communications` @ `2c064b3` + uncommitted CRM/solution/bus WIP  
- **Affected files:** ~399 dirty paths (solution Workflows, env vars, `.agent-comms/*`, CRM reports)  
- **Reproduction:** `git status --porcelain` on main worktree  
- **Expected:** Comms infra tip clean for merge; CRM WIP isolated  
- **Actual:** CRM live artifacts mixed with agent-comms checkout  
- **Evidence:** QA_RELEASE_DASHBOARD.md inventory; `deployment/reports/crm/DIRTY_TREE_SEGREGATION.md`  
- **Owner:** crm (+ agent-comms hygiene); do not interrupt smoke  
- **Status:** OPEN — INTEGRATION BLOCKED  
- **Retest:** After CRM-only commit or clean park checkpoint  

### DEF-QA-003 — HIGH
- **Workstream:** CRM live smoke  
- **Branch / commit:** live Dev environment + MAIN WIP  
- **Affected files:** acceptance evidence `deployment/reports/crm/maker-oa-acceptance-latest.json`  
- **Reproduction:** Read latest acceptance — `overallStatus=PARTIAL`, `liveE2E=FAILED`, failureCount=9  
- **Expected:** Live E2E PASS or explicit parked checkpoint  
- **Actual:** Live E2E FAILED; canvas not imported (OA-CRM-09 / D-002)  
- **Evidence:** maker-oa-acceptance-latest.json  
- **Owner:** crm (blocked on owner D-002); do not interrupt  
- **Status:** OPEN — FAILED QA (live)  
- **Retest:** After D-002 + smoke resume  

### DEF-QA-004 — MEDIUM
- **Workstream:** Executive + Client Portal  
- **Branch / commits:** `8c3f7d8`, `6998a7f`  
- **Affected files:** root `PROJECT_STATUS.md` still shows CRM Maker OA narrative  
- **Expected:** Module-specific READY status at root or clearly deferred to `docs/*/HANDOFF.md` only  
- **Actual:** Stale CRM text at root; READY asserted in module handoffs  
- **Evidence:** File heads inspected by integration  
- **Owner:** executive, client-portal  
- **Status:** OPEN — CHANGES REQUESTED (non-blocking for exclusive merge if Master accepts handoff docs)  
- **Retest:** After status doc update  

## Closed this cycle
None.
