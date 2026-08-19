# Executive Dashboard

| Field | Value |
|-------|--------|
| Audience | Leadership, team, QA |
| Status | CURRENT (Development) — ready for owner UAT |
| Last verified | 2026-07-20 |
| Source module | `apps/atlas-elite-os/src/pages/ExecutiveDashboard.tsx` |
| Release context | Track 10 Elite UI — Dev; not Production |
| Related | [MANNY_DAILY_USE_GUIDE.md](MANNY_DAILY_USE_GUIDE.md), Track10 UAT checklist |

## Purpose

Home screen of Atlas Elite OS. Premium UX over HVCG Microsoft Development (Dataverse · Entra · Graph).

## What you see (current)

When the page loads:

1. Connection banner: **Dataverse connected** or **Sample fallback** (with detail text).
2. Optional **Sign in with Microsoft** if Entra SPA is configured; otherwise **Entra SPA registration required**.
3. Global AI command panel (UI shell — not an autonomous production agent).
4. KPI metric cards with spark trends (values come from `loadExecutiveHome`; may be sample/repository-labeled).
5. **My Approvals** table (title, risk, track).
6. Activity, deadlines, pinned clients, AI recommendations sections as composed in the page.

Exact layout is implemented in `ExecutiveDashboard.tsx` using only `@hvcg/atlas-design-system` components.

## Data honesty labels

Financial and pipeline numbers must not be invented. Workspace/KPI helpers use availability labels such as:

- Verified
- Repository-derived
- Awaiting verified source
- Data connection pending
- Not yet calculated

Evidence: `apps/atlas-elite-os/src/data/workspaces.ts`.

## How to open (Development)

```bash
cd ".worktrees/track10-elite-ui"
npm install --cache .npm-cache   # first time
npm run dev                     # http://127.0.0.1:5180
```

Nav label: **Executive Dashboard** (route `/`).

## Not included yet

Routes `/ai`, `/clients`, `/capital`, `/projects`, `/documents` are **PlaceholderModule** screens gated until Design System + Executive Dashboard owner UAT completes (`App.tsx`, Track10_EliteUI.md).

## Admin

`/admin` opens the model-driven Dataverse admin experience (see Elite OS README for Dev app URL).
