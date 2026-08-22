# Atlas Elite OS — Track 10 (Design System + Executive Dashboard)

**Branch:** `cursor/track10-elite-ui`  
**Worktree:** `.worktrees/track10-elite-ui`  
**Environment:** Development / UAT only — no Production, no Track 1, no live client actions.

## Run (Development)

```bash
cd ".worktrees/track10-elite-ui"
npm install --cache .npm-cache   # first time
npm run dev                     # http://127.0.0.1:5180
npm run storybook               # http://127.0.0.1:6006
npm run build                   # production build of elite OS
```

## Packages

| Path | Purpose |
|------|---------|
| `packages/atlas-design-system` | Reusable Fluent UI v9 + HVCG gold design system |
| `apps/atlas-elite-os` | Product shell + Executive Dashboard |

## Design system catalog

Tokens, light/dark themes, StatusChip, SourceBadge, Empty/Loading, AtlasCard, DashboardWidget, SparkBars, CommandBar, NavShell, ResponsiveGrid, DataTable, Forms, Dialog, Notifications, GlobalSearch, GlobalAICommandPanel, Brand logo.

## Microsoft platform

This app is the **UX layer** over HVCG Microsoft Development:

- Entra ID (MSAL)
- Dataverse adapters
- Graph / SharePoint adapters
- Power Automate interface
- Azure Static Web Apps deploy script: `scripts/deploy-swa-dev.sh`

See `PROJECT_ATLAS/Architecture/Track10MicrosoftNative.md` and `OWNER_ACTIONS_REQUIRED_TRACK10_MICROSOFT.md`.

Model-driven admin (retained):  
https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8
