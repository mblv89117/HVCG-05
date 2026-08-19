# Product Documentation Status — Master PM Package

| Field | Value |
|-------|--------|
| Title | Product documentation inventory and priorities |
| Purpose | Give Master PM a single product-docs control view |
| Audience | Master PM, owner, QA |
| Owner | documentation-manager |
| Status | IN REVIEW |
| Last verified | 2026-07-20 |
| Scope | Product-build documentation only |
| Explicitly ignored | Atlas Runtime, cloud-agent, API-key, dispatcher, orchestration CLI, ATLAS-R, authentication-debugging as product features |
| Source product worktree | `.worktrees/track10-elite-ui` (`cursor/track10-elite-ui`) |
| Docs worktree | `.worktrees/documentation-knowledge-manager` |

## Current product-status summary

| Area | Status label | Evidence |
|------|--------------|----------|
| Elite UI design system (`@hvcg/atlas-design-system` 0.1.0) | **CURRENT (Dev)** — ready for owner UAT | Track10 README, package.json, Storybook |
| Executive Dashboard (`apps/atlas-elite-os`) | **CURRENT (Dev)** — ready for owner UAT; sample fallback until Entra SPA configured | `ExecutiveDashboard.tsx`, Track10_EliteUI.md |
| AI / Clients / Capital / Projects / Documents nav | **PLANNED / GATED** — placeholder modules | `App.tsx` PlaceholderModule |
| Admin | **CURRENT (Dev)** — opens model-driven Dataverse admin | `AdminPage.tsx`, Elite OS README |
| HVCG internal workspace catalog entry | **CURRENT (structure)** | `workspaces.ts` `hvcgInternalWorkspace` |
| Colorado Craft Beef workspace catalog entry | **CURRENT (demo relationship facts)** — financial KPIs pending | `workspaces.ts` `coloradoCraftBeefWorkspace` |
| Microsoft-hosted SWA / Entra sign-in | **PLANNED / OWNER-GATED** | `HOW_MANNY_USES_ATLAS_ELITE_UI.md`, Owner Actions Track10 |
| Track 1 Production CRM freeze | **CURRENT (frozen live-internal)** — out of Elite UI scope | Authoritative Atlas CURRENT_STATE |
| Revenue OS Sprints 1–4 | **CURRENT (Dev/Staging complete)** — not Prod | Authoritative Atlas CURRENT_STATE |
| Public website / DNS | **NOT STARTED** | Atlas gates |
| Canvas publish | **NOT DONE** (D-002) | Atlas gates |
| Orchestration / ATLAS-R / runtime dispatcher | **PAUSED for this assignment** — not product UX docs | Owner instruction 2026-07-20 |

Do **not** treat placeholder modules, pending KPIs, or gated Microsoft hosting as completed product capability.

---

## 1. Documentation inventory (product-relevant)

### A. Canonical product UX (Track 10)

| Document | Path | Role |
|----------|------|------|
| Elite OS README | `.worktrees/track10-elite-ui/apps/atlas-elite-os/README.md` | Dev runbook + package map |
| How Manny uses Elite UI | `.worktrees/track10-elite-ui/PROJECT_ATLAS/HOW_MANNY_USES_ATLAS_ELITE_UI.md` | Owner daily path |
| Track 10 status | `.worktrees/track10-elite-ui/PROJECT_ATLAS/Tracks/Track10_EliteUI.md` | Track status |
| UAT checklist | `.worktrees/track10-elite-ui/PROJECT_ATLAS/QA/Track10EliteUI/UAT_CHECKLIST.md` | Owner UAT |
| Microsoft-native architecture | `.../Architecture/Track10MicrosoftNative.md` | Architecture |
| Environment matrix | `.../Architecture/Track10_Environment_Matrix.md` | Env vars |
| Entra registration | `.../Architecture/Track10_Entra_App_Registration.md` | Admin setup |
| Security matrix | `.../Architecture/Track10_Security_Matrix.md` | Roles |
| Hosting + rollback | `.../Architecture/Track10_Hosting_Teams_Rollback.md` | Deploy/rollback |
| Owner Microsoft actions | `.../OWNER_ACTIONS_REQUIRED_TRACK10_MICROSOFT.md` | Owner gates |
| Workspace data (code SoR) | `apps/atlas-elite-os/src/data/workspaces.ts` | HVCG + CCB facts |

### B. Broader HVCG OS docs (still valid, partially stale vs Elite UI)

| Area | Representative paths |
|------|----------------------|
| Root product README / release | `README.md`, `RELEASE.md`, `releases/v1.0.0`, `releases/v1.1.0` |
| Deployment / DR | `docs/deployment/`, `DEPLOYMENT_GUIDE.md`, `DISASTER_RECOVERY.md` |
| Data model | `docs/data-model/` |
| CRM / Power Platform | `docs/crm/`, `src/power-apps/`, `src/power-automate/` |
| Security / permissions | `docs/security/`, `PERMISSIONS_MATRIX.md` |
| Training / user | `docs/training/`, root `USER_GUIDE.md` |
| Authoritative Atlas orientation | `.worktrees/project-atlas-authoritative/PROJECT_ATLAS/` |

### C. Documentation steward package (this branch)

| Path | Role |
|------|------|
| `PROJECT_ATLAS/Documentation/product/` | **New** product guide set (this delivery) |
| `docs/INDEX.md`, standards, glossary | Navigation / standards (earlier steward work) |
| Orchestration onboarding docs | **Paused / non-product** for this assignment |

---

## 2. Obsolete / archive / pause list

| Item | Disposition | Reason |
|------|-------------|--------|
| Atlas Runtime / ATLAS-R / cloud-agent / dispatcher / API-key / auth-debug docs as product guides | **PAUSED — do not expand** | Owner: product-build assignment only |
| `PROJECT_ATLAS/Documentation/ORCHESTRATION_*` and Sprint 12 registration records | **Non-product** — keep as engineering notes; exclude from product START_HERE | Coordination ≠ product UX |
| Root `PROJECT_STATUS.md` as program SoR | **STALE for program** | Prefer authoritative Atlas `CURRENT_STATE.md` |
| Root `USER_GUIDE.md` / `docs/training/USER_GUIDE.md` implying Power Apps Executive Home as the only premium UX | **PARTIALLY STALE** | Elite OS Executive Dashboard is the new UX layer (Dev); Power Apps still exists |
| Docs claiming Production Elite UI / live client workspace modules complete | **INVALID if present** | App routes are placeholders; Track 10 is Dev UAT |
| Bare Track-1 paths on main without deployment-engineer worktree prefix | **STALE references** | Known path drift |
| Invented financial KPIs for Colorado Craft Beef | **FORBIDDEN** | Code explicitly uses pending labels only |

---

## 3. Missing documentation list

| Gap | Audience | Priority |
|-----|----------|----------|
| Single product START_HERE (nontechnical) | Leadership / team | P0 |
| Consolidated Executive Dashboard user guide | Manny / leadership | P0 |
| Design system catalog for developers/partners | Developers | P0 |
| HVCG + client workspace usage guide | Team / demo | P0 |
| Colorado Craft Beef demo script (click-by-click) | Manny / demo | P0 |
| Manny daily-use guide (Elite UI focused) | Owner | P0 |
| Unified deployment/release notes for Elite OS Dev | Admins | P1 |
| Role & permission guide spanning Entra + Dataverse + Elite UI | Admins | P1 |
| Client-user portal guide (product) | Clients | P2 — portal still gated |
| API catalog for Elite OS Microsoft adapters | Developers | P2 |
| Screenshot pack for UAT | All | P2 — add only when clarity requires |

---

## 4. Documentation priorities (next)

1. Ship product START_HERE + Manny daily-use + CCB demo (this package).
2. Keep Executive Dashboard / design system / workspace docs synchronized with Track 10 code.
3. After Entra SPA + SWA owner actions: update hosting URLs and remove “local only” primacy.
4. When placeholder modules leave gated state: add module docs in the same sprint as code.
5. Reconcile legacy Power Apps user guides with Elite OS (mark which is CURRENT).
6. Refresh deployment/rollback pointers each Elite OS Dev release.
7. Maintain decision history links (Atlas DECISIONS + Track 10 architecture decisions) without rewriting history.

---

## 5. Files updated (this session — docs worktree)

| File | Action |
|------|--------|
| `PROJECT_ATLAS/Documentation/product/MASTER_PM_PRODUCT_DOCS_STATUS.md` | Created (this file) |
| `PROJECT_ATLAS/Documentation/product/START_HERE.md` | Created |
| `PROJECT_ATLAS/Documentation/product/EXECUTIVE_DASHBOARD.md` | Created |
| `PROJECT_ATLAS/Documentation/product/ELITE_UI_DESIGN_SYSTEM.md` | Created |
| `PROJECT_ATLAS/Documentation/product/WORKSPACES_HVCG_AND_CLIENT.md` | Created |
| `PROJECT_ATLAS/Documentation/product/MANNY_DAILY_USE_GUIDE.md` | Created |
| `PROJECT_ATLAS/Documentation/product/COLORADO_CRAFT_BEEF_DEMO_GUIDE.md` | Created |
| `PROJECT_ATLAS/Documentation/product/DEPLOYMENT_AND_RELEASE.md` | Created |
| `PROJECT_ATLAS/Documentation/product/DECISION_HISTORY_LINKS.md` | Created |
| `PROJECT_ATLAS/Documentation/product/ARCHIVE_NON_PRODUCT.md` | Created |
| `PROJECT_ATLAS/Documentation/MASTER_INDEX.md` | Link to product package |

No application code modified. No commit. No Production documentation claims.

---

## 6. Ask of Master PM

1. Confirm Track 10 Elite OS as the **CURRENT** leadership UX for Development UAT.
2. Approve promotion of this product package into authoritative Atlas when ready.
3. Keep orchestration/runtime documentation out of product START_HERE until a future assignment.
4. Schedule owner UAT using `UAT_CHECKLIST.md` + Manny daily-use + CCB demo guides.
