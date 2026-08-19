# Operations Hub Atlas — QA Handoff Package

**Agent:** Operations Hub Manager  
**Branch:** `cursor/operations-hub-sprint1`  
**Worktree:** `.worktrees/operations-hub-sprint1`  
**App:** `apps/hvcg-operations-hub/`  
**Mode:** Development / mock only  
**As of:** 2026-07-17 01:30 UTC  

**Gates:** No commit · No merge · No deploy · Awaiting QA validation

---

## Executive Summary

Operations Hub Atlas expansion extends the Sprint 1 Phase 1 mock SPA (`0f8f6da`) with the full internal Operations Hub module set defined in Project Atlas. All modules use mock data only. Calendar Integration is **architecture-only** (no live providers). Protected tracks (Revenue, Client Portal, ECC, Finance, CRM, Activation, Production, Track 1) were not modified.

**QA gate results (local, uncommitted):**

| Suite | Result |
|-------|--------|
| Build | **PASS** |
| Unit (Vitest) | **7/7 PASS** |
| Playwright offline QA | **22/22 PASS** |
| Responsive (390×844) | **PASS** |
| Permission / protected routes | **PASS** |
| Calendar no-live-integration boundary | **PASS** |

---

## Deliverables

### Application modules (mock)

| Module | Route | Notes |
|--------|-------|-------|
| Executive Dashboard | `/executive` | Leadership health, risks, KPI snapshot |
| Operations Dashboard | `/` | Tasks, blockers, meetings, releases, doc health |
| Daily Scorecards | `/scorecards` | Owner targets vs actuals |
| Weekly Reviews | `/weekly` | Wins / risks / review status |
| Quarterly Planning | `/quarterly` | Objectives + progress |
| Company KPIs | `/kpis` | KPI register |
| Meeting Center | `/meetings` | Mock agenda (no live calendar) |
| SOP Library | `/sop` | Search, filters, version history |
| HR | `/hr` | Roster + status |
| Hiring | `/hiring` | Pipeline board |
| Training | `/training` | Compliance courses |
| Vendor Management | `/vendors` | Vendor register |
| Asset Management | `/assets` | Inventory |
| Internal Notifications | `/notifications` | Role-filtered inbox |
| Calendar Integration Architecture | `/calendar` | Design decisions only |
| Documentation | `/docs` | Internal doc index |

**Retained Sprint 1 modules:** Team, Projects, AI Workforce, Human Workforce.

### Documentation

- `PROJECT_ATLAS/Architecture/OperationsHubAtlas.md`
- `PROJECT_ATLAS/Handoffs/OperationsHubAtlas.md`
- `PROJECT_ATLAS/Sprints/Sprint_OperationsHubAtlas.md`
- `PROJECT_ATLAS/QA/OperationsHubAtlas/QA_RESULTS.md`
- `PROJECT_ATLAS/QA/OperationsHubAtlas/qa-results.json`
- Screenshots under `PROJECT_ATLAS/QA/OperationsHubAtlas/screenshots/` (6)

### Runtime

- Dev: `npm run dev` → port **5176**
- Preview / QA: port **4176**
- Full gate: `npm run qa:all`

---

## Assumptions (documented)

1. Atlas mission modules are delivered as **additive** routes on the existing Ops Hub SPA (not a new app tree).
2. Sprint 1 modules remain available for continuity and regression coverage.
3. Role switcher remains a **QA control**, not authentication.
4. All external systems (HRIS, ATS, LMS, vendor portals, asset CMDB, calendars) are **mocked**.
5. Calendar work is an **interface / architecture specification**, not a provider implementation.
6. Finance, Revenue, Portal, ECC, and other tracks are out of scope; only Atlas status acknowledgments appear in Ops Hub docs.
7. Unrelated local Atlas files (`PROJECT_ATLAS/CONTINUATION/`, `Sprint_FinanceOperations1.md`) are **not** part of this deliverable set.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sidebar density on desktop (20 modules) | Medium | Grouped nav; mobile shows first 5; may need drawer/search in next sprint |
| Stale Atlas working-tree noise (continuation / finance sprint file) | Low | Exclude from any future Ops Hub commit |
| Mock KPIs may be mistaken for live SoR | Medium | UI labels “Mock / Dev only”; handoff states mock-only |
| Role model may not match future HR/Finance policy | Medium | Documented in architecture; refine after owner review |
| Parallel agents may advance shared Atlas indexes | Medium | Ops Hub only updates its own Atlas package; avoid overwriting peer status |

---

## Technical Debt

1. Single large `mockData.ts` — split by domain adapters when live feeds arrive.
2. No shared component library package — UI primitives duplicated from ECC design language by copy, not shared dependency.
3. Mobile nav limited to five links — incomplete module access on small screens.
4. Calendar adapter interface not yet extracted as TypeScript contract file under `docs/` or `src/adapters/`.
5. Notification taxonomy is free-string `type` after expansion — should become a typed union.
6. Playwright suite covers Atlas routes but not every Sprint 1 retained route in every run (AI/human still unit-covered via navigation tests selectively).
7. No visual regression baselines beyond screenshot capture.

---

## Interface specifications (external tracks — not implemented)

When another track is required, Ops Hub consumes adapters — it does not implement peer systems:

| Dependency | Interface (future) | Current stub |
|------------|--------------------|--------------|
| Calendar providers | `CalendarAdapter.listMeetings(tenantId, role)` | `mockData.meetings` + architecture page |
| HRIS | `HrAdapter.listPeople(tenantId)` | `mockData.hrRoster` |
| ATS / hiring | `HiringAdapter.listRoles(tenantId)` | `mockData.hiringRoles` |
| LMS / training | `TrainingAdapter.listCourses(tenantId)` | `mockData.training` |
| Vendor / finance spend | `VendorAdapter.listVendors(tenantId)` | `mockData.vendors` (no Finance app edits) |
| Asset CMDB | `AssetAdapter.listAssets(tenantId)` | `mockData.assets` |
| ECC leadership feed | Read-only summary projection | Local `executiveMetrics` mock |
| Agent bus | Status projection | Existing AI workforce mock |

---

## Recommended Next Sprint

**Operations Hub Sprint 2 — Adapter contracts & UX depth (still Dev/Staging, mock-first)**

1. Extract TypeScript adapter interfaces + fixture adapters per domain.  
2. Improve mobile navigation (overflow menu / module search).  
3. Typed notification taxonomy + unread filters by domain.  
4. Owner-approved role matrix review (HR/Finance sensitivity).  
5. Thin “Executive brief” export (PDF/Markdown) from mock data.  
6. **Do not** connect production calendars, HRIS, or CRM.  
7. Commit only after this QA package is validated.

---

## QA Handoff

### Validate

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/operations-hub-sprint1/apps/hvcg-operations-hub"
npm run qa:all
```

Expected: build PASS · unit **7/7** · Playwright **22/22**.

### Manual spot checks

1. Owner can open all Atlas modules.  
2. Assistant cannot see Executive / Hiring / Vendors; `/executive` redirects to `/`.  
3. Calendar page states no live Graph/Google/MeetSync connections.  
4. Responsive 390×844: mobile nav visible, no horizontal overflow.  
5. Confirm no edits under Revenue / Portal / ECC / Finance / CRM / Production trees.

### Evidence

- `PROJECT_ATLAS/QA/OperationsHubAtlas/QA_RESULTS.md`
- `PROJECT_ATLAS/QA/OperationsHubAtlas/qa-results.json`
- `PROJECT_ATLAS/QA/OperationsHubAtlas/screenshots/`

### Stop conditions (honored)

- No commit performed for this Atlas expansion  
- No merge performed  
- No deploy performed  
- No other agent workspace modified  

**Awaiting QA validation before any commit approval.**
