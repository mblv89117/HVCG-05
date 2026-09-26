# W2R implementation report — ACCG01 projects caption residual

DRAFT only. No merge, no deploy, no client contact, no money movement, no authority-flag change. No `LIVE_CERT_PASS` is claimed.

## Head

- Base tip: `production/atlas-core` at `8cef27463f84cab3ecca13a01ac41903fdfdb3e4` (W2Q communications list honesty, #248)
- Caption implementation commit: `50d9432a3ab6a6f6ab3d23ca65779155152a7b9e`
- This report commit sits on that SHA. The draft pull request description states the full branch head SHA after this file lands.

## Files touched

- `apps/atlas-elite-os/src/pages/projectsCaption.ts` (new, display-only)
- `apps/atlas-elite-os/src/pages/projectsCaption.test.ts` (new)
- `apps/atlas-elite-os/src/pages/LiveClientDetailPage.tsx` (State chip, related-work caption, read-only empty description)
- `apps/atlas-elite-os/src/pages/communicationsListHonesty.test.ts` (moved the create-sentence lock off the W2Q test)
- `apps/atlas-elite-os/scripts/project-route-tests.mjs` (route lock now requires the caption wiring)
- `apps/atlas-elite-os/package.json` (`test:security` includes `projectsCaption.test.ts`)
- `artifacts/IMPL_REPORT.md` (this file)

## What changed

Elite display copy on a loaded workspace only.

- State chip: `projects=PARTIAL` when `projects.length > 0`, `projects=MISSING` when the length is zero. The raw `` `${projects.length} projects` `` chip is gone.
- Related work, count zero: a `projects=MISSING` sentence. It does not say to create.
- Related work, count greater than zero: name links stay. A caption says those rows are the hygiene-kept HVCG_Projects set and `projects=PARTIAL`.
- Read-only empty description (`writePolicy === 'read_only'`): no longer says `Create a project to track next actions.` The existing line that create is hidden stays.
- Writable empty (`writePolicy` not `read_only`): create form and the existing create description stay.

## Authority

Unchanged. `canExecute`, `capitalSubmit`, and `GLOBAL_AUTO_RESPOND` stay false. Unknown ClientCode stays fail-closed.

## Tests

Commands were run from `apps/atlas-elite-os` after `npm ci --ignore-scripts` at the repo root.

- `npx tsx --test src/pages/projectsCaption.test.ts` — 4/4 pass.
- `node ./scripts/project-route-tests.mjs` — pass (`PASS project route + operating layer source tests`).
- `npm run test:security` — 108/108 pass, 0 fail. Includes projects caption plus communications, tasks, engagements, deliverables, decisions/risks, meetings, and contacts honesty locks.
- `npm run lint:hooks` — pass.
- `node ./scripts/auth-transition-tests.mjs` — pass.
- `node ./scripts/hub-access-token-tests.mjs` — pass.
- `node ./scripts/hook-order-render-tests.mjs` — pass.

## MUST-NOT checklist

- Did not edit Hub Ask Atlas W2G `renderTopic` case `projects`, `answers.workingOn`, or the `WHAT ATLAS KNOWS` `projects=` token.
- Did not add an Ask Atlas phrase-map entry for list-projects. The projects pattern is unchanged. `List capital projects for ACCG01` stays on `detectTopic` `/capital/`.
- Did not change Graph walks, `LIST_WALK_PAGE_CAP` (80), `LIST_WALK_TOP` (100), `filterOwnerFacingProjects`, `buildSharePointClientWorkspace`, or `composeClientTruth`.
- Did not change the timeline card, `capitalLinked`, the tasks State chip, `sectionHonesty(workspace.documents)`, or communications list sentences.
- Did not flip `canExecute`, `capitalSubmit`, or `GLOBAL_AUTO_RESPOND`.
- Did not invent `projects=INDEXED`, recovered HVS titles, or project names that are not on the payload.
- Did not treat a failed workspace load as `projects=MISSING`. Sign-in, 401, 403, error, and empty-response states still return before the State card.
- Did not merge, undraft, deploy, contact clients, or move money. No `LIVE_CERT_PASS`.
