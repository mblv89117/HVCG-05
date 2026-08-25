# HOW MANNY USES ATLAS ELITE UI (Microsoft-native)

## What this is

Premium Fluent UI experience for Project Atlas.  
It authenticates with **HVCG Microsoft Entra**, reads **Dataverse Development**, and is designed to host on **Azure Static Web Apps** inside the HVCG Microsoft ecosystem.

Local Vite is only for development speed.

## Today (while Entra SPA + SWA are pending)

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/track10-elite-ui"
npm run dev
```

Open http://127.0.0.1:5180

- You will see labeled **sample fallback** until `VITE_ENTRA_CLIENT_ID` is set and you sign in.
- Administration → opens the existing **model-driven** Dataverse admin app.

## After owner completes Microsoft registration

1. Entra SPA app + SWA deploy (see `OWNER_ACTIONS_REQUIRED_TRACK10_MICROSOFT.md`)
2. Open the **Microsoft-hosted play URL**
3. Sign in with `manny@highvaluecapitalgroup.com`
4. Dashboard loads **Dataverse** approvals / revenue KPIs
5. Optional: Teams tab points at the same URL

## Do not

Production · Track 1 · live client email/Teams send · public anonymous publish
