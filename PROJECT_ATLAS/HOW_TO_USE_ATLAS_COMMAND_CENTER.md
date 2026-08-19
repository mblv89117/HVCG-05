# HOW TO USE ATLAS COMMAND CENTER

## 1. Open it

In Cursor, open a terminal:

```bash
cd ".worktrees/ceo-command-center-sprint2/apps/hvcg-executive-command-center"
npm ci --cache .npm-cache
npm run dev
```

Open the local address shown in the terminal. This is Development/UAT,
not a public website.

## 2. Main sections

- **Executive Home:** overall health, decisions, risks, blockers, actions.
- **Approval Inbox:** everything waiting for Manny.
- **Agent Control:** assignments, branches, blockers, QA, next actions.
- **Portfolio:** detailed status for Atlas Tracks 1–9.
- **Revenue:** Revenue OS status, unavailable values, sample clients.
- **Engineering:** EOS, QA, release, debt, and deployment gates.
- **Morning Brief:** the short daily decision summary.

## 3. Pending approvals

Open **Approval Inbox**. Yellow Pending badges need review. Buttons only
change the local screen; they do not approve a real system action.

## 4. Risks and blockers

Executive Home shows the current exceptions. Open Portfolio for the
affected track and its next action.

## 5. Agent status

Open **Agent Control** to see each agent’s role, track, sprint, branch,
worktree, blocker, QA status, owner gate, and next action.

## 6. Revenue and clients

Open **Revenue**. “Unavailable” means no approved current data source is
connected. “Development sample” means fictional UAT data, not a client.

## 7. Morning brief

Read **Morning Brief** from top to bottom: changes, decisions, blockers,
risks, QA/release state, Revenue/client gaps, then top three actions.

## 8. Safe Development actions

You may navigate, filter by reading sections, and click approval
placeholders. These actions remain in the browser only.

## 9. Actions requiring explicit approval

Commit, push, merge, deploy, Production changes, emails, Teams, SMS,
payments, client contact/invitations, website publishing, DNS, and live
integrations all require separate explicit approval.

## 10. Report a problem or request a feature

Record the page, displayed source label, expected result, actual result,
and business impact. Send it to the Master PM as a change request. Do not
change Production to work around a dashboard issue.
