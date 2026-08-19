# Manny’s Daily-Use Guide — Atlas Elite UI

| Field | Value |
|-------|--------|
| Audience | Manny Barela (Owner / Executive) |
| Status | CURRENT for Development UAT |
| Last verified | 2026-07-20 |
| Detail source | `.worktrees/track10-elite-ui/PROJECT_ATLAS/HOW_MANNY_USES_ATLAS_ELITE_UI.md` |
| Nontechnical | Click-by-click |

## What this is

Your premium Atlas screen. It is meant to sit on HVCG Microsoft (Entra + Dataverse Development) and later Azure Static Web Apps. **Today**, local Development is the supported path until Entra SPA + SWA registration is finished.

## Before you start

- Use a Development machine with the Track 10 worktree.
- Expect a **Sample fallback** banner until Microsoft sign-in is configured.
- Do **not** use this for Production or live client email/Teams sends.

## Daily path (local Development)

### 1. Open the app

1. Open Terminal.
2. Go to the Track 10 folder:

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/track10-elite-ui"
```

3. First time only: `npm install --cache .npm-cache`
4. Run: `npm run dev`
5. Open a browser to **http://127.0.0.1:5180**

### 2. Land on Executive Dashboard

1. You should see **Executive Dashboard** as the home title.
2. Read the top banner:
   - **Sample fallback** = safe demo/sample data; not live Dataverse.
   - **Dataverse connected** = Development data path after sign-in.
3. If you see **Sign in with Microsoft**, click it and use `manny@highvaluecapitalgroup.com` (after Entra SPA is registered).
4. If you see **Entra SPA registration required**, stop and use sample mode; ask Master PM / admin to complete `OWNER_ACTIONS_REQUIRED_TRACK10_MICROSOFT.md`.

### 3. Your decision inbox

1. Find **My Approvals**.
2. Review Title, Risk, and Track.
3. Treat High risk items first.
4. Do not approve anything that would contact a client or change Production without a separate owner gate.

### 4. Metrics

1. Scan KPI cards.
2. If a value says **Awaiting verified source** / **Not yet calculated** / **Data connection pending**, treat it as **not a real financial figure**.

### 5. Administration

1. Open **Administration** in the shell (or `/admin`).
2. Use the model-driven Dataverse admin app for Development administration only.

### 6. End of day

1. Close the browser tab.
2. Stop the local server (Ctrl+C in Terminal) if you started it.
3. Tell Master PM / QA any UAT findings using the Track 10 UAT checklist.

## After Microsoft hosting is ready (planned)

1. Complete Entra SPA + SWA owner actions.
2. Open the Microsoft-hosted play URL (not localhost).
3. Sign in with your HVCG account.
4. Optional later: Teams tab to the same URL.

## Never do

- Production changes from Elite UI
- Touch Track 1 freeze
- Live client email / Teams send
- Public anonymous publish
- Quote Colorado Craft Beef financials that are still pending

## Related

- [EXECUTIVE_DASHBOARD.md](EXECUTIVE_DASHBOARD.md)
- [COLORADO_CRAFT_BEEF_DEMO_GUIDE.md](COLORADO_CRAFT_BEEF_DEMO_GUIDE.md)
- Track 10 UAT checklist in the Elite UI worktree
