# HANDOFF — Client Portal Version 1

**Agent:** Client Portal & Data Rooms Engineer
**Branch:** `cursor/client-portal-sprint1`
**Worktree:** `.worktrees/client-portal-sprint1`
**Status:** Version 1 UI **COMPLETE — AWAITING QA**; current additions are uncommitted

## Delivered

1. Secure multi-client React portal MVP (`apps/hvcg-client-portal`)
2. Version 1 screens: Home, Engagement, Timeline, Milestones, Funding, Documents, Messages, Tasks, Meetings, Invoices, Notifications, Advisor, File Center
3. Document request engine + 15 folders
4. 11-stage funding tracker
5. Messaging, tasks, meetings, advisor, secure files
6. Mock integrations (Entra, SharePoint, OneDrive, Teams, Outlook disabled, Power Automate, Book Meeting, Doc Requests, E-sign)
7. Architecture + data model + mock interface specifications + QA suite + Atlas updates
8. Screenshots under `docs/portal-sprint1/screenshots/`

## Run locally

```bash
cd .worktrees/client-portal-sprint1/apps/hvcg-client-portal
npm install --cache /tmp/npm-cache-hvcg-portal
npm run dev
# http://localhost:5174
```

## QA

```bash
npm run qa:all
```

## Explicit non-actions

- No merge
- No Production / Track 1 changes
- No Revenue Sprint 1–4 / Conversion Engine / CRM Schema / Activation Framework edits
- No live DNS / email / SMS
- No merge performed
- No SharePoint or production connections
- Version 1 additions not committed or pushed

## QA handoff

See `docs/portal-sprint1/QA_HANDOFF_V1.md`.
