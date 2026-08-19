# Elite UI Design System

| Field | Value |
|-------|--------|
| Audience | Developers, implementation partners |
| Status | CURRENT (Development) — v0.1.0 |
| Last verified | 2026-07-20 |
| Package | `@hvcg/atlas-design-system` |
| Path | `.worktrees/track10-elite-ui/packages/atlas-design-system` |
| App consumer | `apps/atlas-elite-os` |

## Purpose

Reusable Fluent UI v9 + HVCG gold branding components. Executive Dashboard is composed **only** from this design system (Track 10 deliverable).

## Run Storybook

```bash
cd ".worktrees/track10-elite-ui"
npm run storybook    # http://127.0.0.1:6006
```

## Catalog (as shipped in Track 10 README)

Tokens, light/dark themes, StatusChip, SourceBadge, Empty/Loading, AtlasCard, DashboardWidget, SparkBars, CommandBar, NavShell, ResponsiveGrid, DataTable, Forms, Dialog, Notifications, GlobalSearch, GlobalAICommandPanel, Brand logo.

Component sources live under `packages/atlas-design-system/src/components/` and `theme/AtlasProvider.tsx`.

## Version

`package.json` reports **0.1.0** (private package). Treat as pre-1.0 Dev design system until a release version is cut.

## Rules for implementers

1. New Elite OS screens must use design-system components — do not fork one-off styles for core chrome.
2. Do not invent financial display values in widgets.
3. Keep Production / Track 1 out of scope until owner-gated hosting exists.
4. Document component changes in the same sprint as code.

## Related architecture

- `PROJECT_ATLAS/Tracks/Track10_EliteUI.md`
- `PROJECT_ATLAS/Architecture/Track10MicrosoftNative.md`
