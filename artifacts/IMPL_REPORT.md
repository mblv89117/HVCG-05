# W2S implementation report — ACCG01 tasks State chip

DRAFT only. No merge, no deploy, no client contact, no money movement, no authority-flag change. No `LIVE_CERT_PASS` is claimed.

## Head

- Base tip: `production/atlas-core` at `c62bf45d0ea5bc4af88e59b9e4edbe81e6b71662` (W2R Elite projects caption residual, #249)
- Chip implementation commit: `d187811e6dae8d282d556d5a5688eca2d3f3e0fb`
- Report commit: `433bd6ee1dbced13a04417afdba1718c2ca9c0e8`
- Draft PR: https://github.com/mblv89117/HVCG-05/pull/250
- This commit records the report SHA. The pull request description carries the branch head SHA after it lands.

## Files touched

- `apps/atlas-elite-os/src/pages/tasksListHonesty.ts` (`tasksChipLabel`)
- `apps/atlas-elite-os/src/pages/LiveClientDetailPage.tsx` (State chip and Related tasks header)
- `apps/atlas-elite-os/src/pages/tasksListHonesty.test.ts` (four labels and wiring)
- `apps/atlas-elite-os/src/pages/projectsCaption.test.ts` (W2R count lock moved off the tasks chip)
- `apps/atlas-elite-os/scripts/project-route-tests.mjs` (`tasks=INDEXED` literal moved to the helper)
- `artifacts/IMPL_REPORT.md` (this file)

## What changed

Elite display only. The State chip and the Related tasks header use `tasksChipLabel(tasksHonesty.kind)`.

- `indexed` → `tasks=INDEXED`, tone `info`
- `missing` → `tasks=MISSING`, tone `neutral`
- `source_unavailable` → `tasks=SOURCE_UNAVAILABLE`, tone `neutral`
- `not_queried` → `Not queried`, tone `neutral`

The label is the kind `tasksListHonesty` already returned. `tasks.length > 0` is not mapped to `tasks=INDEXED`. A finished payload whose titles were dropped stays `tasks=MISSING`. The chip does not say `tasks=PARTIAL` or `tasks=INDEXED/CONFIRMED`.

Related work still prints `{tasksHonesty.sentence}`. Card titles, the row list, the read-only line `Task create is hidden for this read-only ClientCode.`, and the writable Create task form are unchanged.

## Authority

Unchanged. `canExecute`, `capitalSubmit`, and `GLOBAL_AUTO_RESPOND` stay false. Unknown ClientCode stays fail-closed.

## Tests

Commands were run from `apps/atlas-elite-os` after `npm ci --ignore-scripts` at the repo root.

- `npx tsx --test src/pages/tasksListHonesty.test.ts` — 8/8 pass.
- `node ./scripts/project-route-tests.mjs` — pass (`PASS project route + operating layer source tests`).
- `npm run test:security` — 108/108 pass, 0 fail. Includes tasks chip locks plus projects caption, communications, engagements, deliverables, decisions/risks, meetings, and contacts honesty locks.

## MUST-NOT checklist

- Did not edit Hub Ask Atlas, `renderTopic` case `tasks`, or `answers.tasksExist`.
- Did not add a tasks phrase-map entry. Existing W2M sentences stay, including `tasks=INDEXED/CONFIRMED` inside the indexed Ask Atlas sentence.
- Did not change Graph walks, `LIST_WALK_PAGE_CAP` (80), `LIST_WALK_TOP` (100), `filterOwnerFacingTasks`, `buildSharePointClientWorkspace`, `entitledOpenTasks`, or `composeClientTruth`.
- Did not add `tasksIndex` on the Elite payload.
- Did not change `projectsChipLabel`, `capitalLinked`, the timeline chips, `sectionHonesty(workspace.documents)`, contacts, or meetings cards.
- Did not flip `canExecute`, `capitalSubmit`, or `GLOBAL_AUTO_RESPOND`.
- Did not invent `tasks=PARTIAL`, `projects=INDEXED`, `timeline=INDEXED`, or `documents=INDEXED`.
- Did not merge, undraft, deploy, contact clients, or move money. No `LIVE_CERT_PASS`.
