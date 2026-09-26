# W2Q implementation report — ACCG01 communications list honesty

Draft only. No merge, no deploy, no client contact, no money movement, no authority-flag change.

## Scope

New Ask Atlas topic `communications_list` and domain `communicationsList` / token `communicationsList=`.

Thread rows already on `HVCG_Communications` are the list. File-index rows stay the W2I document index (`isFileIndexRow` unchanged) and stay on `communications.items`. The certified operating-brief line `communications=`, `commsCount`, and `hasIndexedWork` are unchanged.

## Head

- Branch: `cursor/w2q-communications-list-honesty-1c33`
- Base: `production/atlas-core` at `22308beb496b98f2d422a7233c0e609cd133c374` (W2P closed)
- Implementation commit: `7d629dd08bf9d9e4f3554d4b61bd7af3f7788acd`
- PR head: the commit that records this SHA line (draft pull request; full `git rev-parse HEAD`)

## What changed

- Hub `communicationsList` domain and `answers.communicationsListExist`, counting ClientCode-matched rows that fail `isFileIndexRow`.
- Phrase map entry after documents. Negative lookaheads keep `onboarding`, `policy`, and `communication context` off the topic. The group is unanchored after those lookaheads so `What is the communications list for ACCG01?` hits. The discovery paste was start-positioned after the lookaheads and missed that phrase.
- Workspace-failed branch calls `communicationsListIndexUnavailableAnswer`. It does not use `documentIndexUnavailableAnswer`.
- Elite `communicationsListHonesty` (same contract shape as deliverables / decisions-risks). State chip is `communicationsList=INDEXED|MISSING|SOURCE_UNAVAILABLE|Not queried` and never `0 communications`. Related-work Communications half uses that sentence. Documents half stays `sectionHonesty(workspace.documents)`. Read-only thread card. No send or reply control.
- Route locks in `project-route-tests.mjs`, `auth-transition-tests.mjs`, and `hub-access-token-tests.mjs`.

## Authority

`canExecute`, `capitalSubmit`, and `GLOBAL_AUTO_RESPOND` stay false. Unknown ClientCode stays fail-closed.

## Tests

- Hub `tests/w2q-accg01-communications-list-honesty.test.ts`: 9/9 pass.
- Hub `tests/w2p-accg01-decisions-risks-list-honesty.test.ts`: 12/12 pass.
- Hub `npm run test:integration-api`: 940/940 pass, 0 fail.
- Elite `communicationsListHonesty.test.ts` plus decisions/risks and meetings honesty: pass.
- Elite `test:security`: 104/104 pass (includes the new honesty test).
- Elite route locks: project routes, hub access-token, auth transitions: pass.
- Elite `lint:hooks` and `tsc -b`: pass.
- Elite `test:hard-refresh` was not run against a production `dist/` (no dist in this workspace). CI builds Elite before that script.

## Residual risk

- No live SharePoint cert and no `LIVE_CERT_PASS`. Phrase routing and sentences were checked locally.
- A file-index-only section is still `communications=INDEXED` on the certified brief line, because that count includes every walked row. `communicationsList=MISSING` is the thread sentence. That split is intentional.
- The workspace timeline still appends dated file-index rows as communication events. This package does not filter the timeline.
- Projects empty create sentence and `capitalLinked` are unchanged (runner-up, not this wave).
- `answers.changed` and the owner-approval draft clause are unchanged.
- `LIST_WALK_PAGE_CAP` (80) and `LIST_WALK_TOP` (100) are unchanged.
