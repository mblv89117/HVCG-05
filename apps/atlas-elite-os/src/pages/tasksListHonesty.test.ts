/**
 * W2M Elite tasks list honesty. Same Hub sentences, one payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  TASKS_LIST_SLICE,
  TASKS_MISSING_SENTENCE,
  tasksChipLabel,
  tasksIndexedAskAtlasSentence,
  tasksListHonesty,
} from './tasksListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Tasks list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';

const INDEXED_SENTENCE =
  '2 entitled open HVCG_Tasks row(s). tasks=INDEXED. File the ACCG return (ready, due 2026-10-02); Confirm bank access.';

describe('W2M Elite tasks list honesty', () => {
  it('lists entitled open titles with status and due, and drops other clients and closed rows', () => {
    const view = tasksListHonesty(
      {
        availability: { status: 'COMPLETE', queried: true },
        tasks: [
          {
            id: 't1',
            title: 'File the ACCG return',
            clientCode: 'ACCG01',
            status: 'ready',
            dueDate: '2026-10-02T15:00:00.000Z',
            projectId: 'p1',
          },
          {
            id: 't2',
            title: 'Confirm bank access',
            clientCode: 'ACCG01',
            status: '   ',
            dueDate: '',
          },
          { id: 't-done', title: 'Completed filing', clientCode: 'ACCG01', status: 'completed' },
          { id: 't-cancel', title: 'Cancelled outreach', clientCode: 'ACCG01', status: 'Cancelled' },
          { id: 't-pdg', title: 'PDG secret task', clientCode: 'PDG01', status: 'ready' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: 't1', title: 'File the ACCG return', status: 'ready', dueDate: '2026-10-02', projectId: 'p1' },
      { id: 't2', title: 'Confirm bank access' },
    ]);
    assert.equal(view.sentence, tasksIndexedAskAtlasSentence([
      { title: 'File the ACCG return', status: 'ready', dueDate: '2026-10-02' },
      { title: 'Confirm bank access' },
    ]));
    assert.equal(view.sentence.startsWith(INDEXED_SENTENCE), true);
    assert.match(view.sentence, /tasks=INDEXED\/CONFIRMED/);
    assert.match(view.sentence, /Current task list is the entitled open HVCG_Tasks slice for this ClientCode only/);
    assert.match(view.sentence, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(view.sentence, /capitalSubmit=false/);
    assert.match(view.sentence, /canExecute=false/);
    assert.equal(/GLOBAL_AUTO_RESPOND=true|capitalSubmit=true|canExecute=true/.test(view.sentence), false);
    assert.equal(view.sentence.includes('Completed filing'), false);
    assert.equal(view.sentence.includes('PDG secret task'), false);
    assert.equal(/tasks=MISSING|tasks=SOURCE_UNAVAILABLE/.test(view.sentence), false);
    assert.equal(tasksChipLabel(view.kind), 'tasks=INDEXED');
    assert.equal(tasksChipLabel(view.kind).includes('/CONFIRMED'), false);
    assert.equal(tasksChipLabel(view.kind).includes('PARTIAL'), false);
  });

  it('caps the short slice and still reports +N more', () => {
    const tasks = Array.from({ length: TASKS_LIST_SLICE + 2 }, (_, index) => ({
      id: `t-${index}`,
      title: `ACCG task ${index + 1}`,
      clientCode: 'ACCG01',
      status: 'ready',
    }));
    const view = tasksListHonesty({ availability: { status: 'COMPLETE', queried: true }, tasks }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, TASKS_LIST_SLICE + 2);
    assert.equal(view.slice.length, TASKS_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG task 7'), false);
  });

  it('says tasks=MISSING for a finished empty slice', () => {
    const view = tasksListHonesty(
      { availability: { status: 'COMPLETE', queried: true, count: 0 }, tasks: [] },
      'ACCG01',
    );
    assert.equal(view.kind, 'missing');
    assert.equal(view.sentence, TASKS_MISSING_SENTENCE);
    assert.equal(/tasks=SOURCE_UNAVAILABLE|tasks=INDEXED/.test(view.sentence), false);
    assert.equal(tasksChipLabel(view.kind), 'tasks=MISSING');

    const untitled = tasksListHonesty(
      {
        availability: { status: 'COMPLETE', queried: true },
        tasks: [{ id: 'blank', title: '   ', clientCode: 'ACCG01', status: 'ready' }],
      },
      'ACCG01',
    );
    assert.equal(untitled.kind, 'missing');
    assert.equal(tasksChipLabel(untitled.kind), 'tasks=MISSING');
  });

  it('keeps an allowlist miss as not queried', () => {
    const view = tasksListHonesty(
      {
        availability: {
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          queried: false,
          reason: 'HVCG_Tasks is not in the Hub Graph Selected allowlist.',
        },
        tasks: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'ready' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /was not queried/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(/tasks=MISSING|tasks=INDEXED|tasks=SOURCE_UNAVAILABLE/.test(view.sentence), false);
    assert.equal(tasksChipLabel(view.kind), 'Not queried');
  });

  it('says tasks=SOURCE_UNAVAILABLE and hides partial rows on page_cap', () => {
    const view = tasksListHonesty(
      {
        availability: { status: 'SOURCE_UNAVAILABLE', queried: false, reason: PAGE_CAP_REASON },
        tasks: [{ id: 'partial', title: 'Hidden Task', clientCode: 'ACCG01', status: 'ready', dueDate: '2026-12-01' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /tasks=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.match(view.sentence, /OWNER_DECISION_REQUIRED/);
    assert.match(view.sentence, /pageCap=80 top=100/);
    assert.match(view.sentence, /itemsFetched=80/);
    assert.equal(view.sentence.includes('Hidden Task'), false);
    assert.equal(/tasks=MISSING|tasks=INDEXED/.test(view.sentence), false);
    assert.equal(tasksChipLabel(view.kind), 'tasks=SOURCE_UNAVAILABLE');
  });

  it('keeps the entitled row when the indexed sentence matches Ask Atlas', () => {
    const view = tasksListHonesty(
      {
        availability: { status: 'COMPLETE', queried: true },
        tasks: [
          {
            id: 't-accg',
            title: 'Review ACCG historical reconstruction evidence',
            status: 'waiting',
            clientCode: 'ACCG01',
            projectId: 'p-recon',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.deepEqual(view.slice, [
      {
        id: 't-accg',
        title: 'Review ACCG historical reconstruction evidence',
        status: 'waiting',
        projectId: 'p-recon',
      },
    ]);
    assert.equal(
      view.sentence,
      '1 entitled open HVCG_Tasks row(s). tasks=INDEXED. Review ACCG historical reconstruction evidence (waiting). tasks=INDEXED/CONFIRMED. Current task list is the entitled open HVCG_Tasks slice for this ClientCode only. Completed, cancelled, and hygiene-quarantined tasks are not this list. Atlas does not invent tasks, assignees, due dates, notes, or next actions. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.',
    );
  });

  it('wires State → Related Work and the Related tasks card to the Hub payload helper', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /tasksListHonesty\(/);
    assert.match(page, /title="Related tasks"/);
    assert.match(page, /\{tasksHonesty\.sentence\}/);
    assert.match(page, /\+\{tasksHonesty\.count - tasksHonesty\.slice\.length\} more/);
    assert.match(page, /Task create is hidden for this read-only ClientCode/);
    const tasksCard = page.slice(page.indexOf('title="Related tasks"'), page.indexOf('title="Engagements"'));
    const indexedAt = tasksCard.indexOf("tasksHonesty.kind === 'indexed'");
    const indexedBranch = tasksCard.slice(indexedAt, tasksCard.indexOf('No entitled open tasks'));
    assert.match(indexedBranch, /\{tasksHonesty\.sentence\}/);
    assert.match(indexedBranch, /tasksHonesty\.slice\.map/);
    assert.ok(indexedBranch.indexOf('{tasksHonesty.sentence}') < indexedBranch.indexOf('tasksHonesty.slice.map'));
    assert.match(indexedBranch, /row\.title/);
    assert.match(tasksCard, /row\.status/);
    assert.match(tasksCard, /row\.dueDate/);
    assert.match(tasksCard, /tasksChipLabel\(tasksHonesty\.kind\)/);
    assert.equal(tasksCard.includes('tasks=INDEXED'), false);
    assert.equal(tasksCard.includes('tasks=MISSING'), false);
    assert.equal(tasksCard.includes('tasks=SOURCE_UNAVAILABLE'), false);
    assert.equal(tasksCard.includes('tasks=PARTIAL'), false);
    assert.equal(tasksCard.includes('tasks=INDEXED/CONFIRMED'), false);
    assert.equal(tasksCard.includes('assigneeName'), false);
    assert.equal(tasksCard.includes('nextAction'), false);
    assert.equal(tasksCard.includes('Queried HVCG_Tasks returned no entitled open rows'), false);
    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /\{tasksHonesty\.sentence\}/);
    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /tasksChipLabel\(tasksHonesty\.kind\)/);
    assert.match(state, /tasksHonesty\.kind === 'indexed' \? 'info' : 'neutral'/);
    assert.equal(state.includes('${tasks.length} open tasks'), false);
    assert.equal(state.includes('tasks=PARTIAL'), false);
    assert.equal(state.includes('tasks=INDEXED/CONFIRMED'), false);
    const helper = readFileSync(join(root, 'tasksListHonesty.ts'), 'utf8');
    assert.match(helper, /return 'tasks=INDEXED'/);
    assert.match(helper, /return 'tasks=MISSING'/);
    assert.match(helper, /return 'tasks=SOURCE_UNAVAILABLE'/);
    assert.match(helper, /return 'Not queried'/);
    assert.equal(helper.includes('tasks=PARTIAL'), false);
    assert.equal(helper.includes("return 'tasks=INDEXED/CONFIRMED'"), false);
    assert.match(page, /contactsListHonesty\(workspace\?\.contacts, clientId\)/);
    assert.match(page, /meetingsListHonesty\(workspace\?\.meetings, clientId\)/);
  });

  it('keeps tasks prompts in the drawer when the live Hub runner is attached', () => {
    assert.equal(aiCommandNavigatePath('What tasks does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What tasks exist for ACCG01?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 tasks', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What tasks does ACCG01 have?', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 tasks', { liveAskAtlas: false }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);
  });
});
