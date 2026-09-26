/**
 * W2O Elite deliverables list honesty. Same Hub sentences, one payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  DELIVERABLES_LIST_SLICE,
  DELIVERABLES_MISSING_SENTENCE,
  deliverablesChipLabel,
  deliverablesListHonesty,
} from './deliverablesListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Deliverables list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Deliverables is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Deliverables row(s). deliverables=INDEXED. Tax return package (accepted); Bookkeeping pack. deliverables=INDEXED/CONFIRMED. Current deliverable list is the entitled HVCG_Deliverables slice for this ClientCode only. The document index is not this list. Recovered filenames are not this list. Atlas does not invent deliverables, due dates, statuses, or acceptance. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.';

describe('W2O Elite deliverables list honesty', () => {
  it('lists entitled titles with status only when present, and drops other clients', () => {
    const view = deliverablesListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: 'd1',
            title: 'Tax return package',
            clientCode: 'ACCG01',
            status: 'accepted',
            summary: 'Acceptance notes that are not this list',
            date: '2026-11-01',
            webUrl: 'https://example.invalid/deliverable',
          },
          {
            id: 'd2',
            title: 'Bookkeeping pack',
            clientCode: 'ACCG01',
            status: '   ',
            summary: 'Fee schedule that is not invented',
          },
          { id: 'd-pdg', title: 'PDG secret deliverable', clientCode: 'PDG01', status: 'accepted' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: 'd1', title: 'Tax return package', status: 'accepted' },
      { id: 'd2', title: 'Bookkeeping pack' },
    ]);
    assert.equal(view.sentence, INDEXED_SENTENCE);
    assert.equal(view.sentence.includes('PDG secret deliverable'), false);
    assert.equal(view.sentence.includes('Acceptance notes'), false);
    assert.equal(view.sentence.includes('Fee schedule'), false);
    assert.equal(view.sentence.includes('2026-11-01'), false);
    assert.equal(view.sentence.includes('example.invalid'), false);
    assert.equal(/deliverables=MISSING|deliverables=SOURCE_UNAVAILABLE/.test(view.sentence), false);
    assert.match(view.sentence, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(view.sentence, /capitalSubmit=false/);
    assert.match(view.sentence, /canExecute=false/);
  });

  it('caps the short slice and still reports +N more', () => {
    const items = Array.from({ length: DELIVERABLES_LIST_SLICE + 2 }, (_, index) => ({
      id: `d-${index}`,
      title: `ACCG deliverable ${index + 1}`,
      clientCode: 'ACCG01',
      status: 'draft',
    }));
    const view = deliverablesListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, DELIVERABLES_LIST_SLICE + 2);
    assert.equal(view.slice.length, DELIVERABLES_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG deliverable 7'), false);
  });

  it('says deliverables=MISSING for a finished empty slice', () => {
    const view = deliverablesListHonesty(
      { status: 'COMPLETE', queried: true, items: [] },
      'ACCG01',
    );
    assert.equal(view.kind, 'missing');
    assert.match(view.sentence, new RegExp(DELIVERABLES_MISSING_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(view.sentence, /deliverables=MISSING\/MISSING/);
    assert.match(view.sentence, /The document index is not this list/);
    assert.match(view.sentence, /Recovered filenames are not this list/);
    assert.match(view.sentence, /does not invent deliverables, due dates, statuses, or acceptance/);
    assert.equal(/deliverables=SOURCE_UNAVAILABLE|deliverables=INDEXED|truncated|page_cap/.test(view.sentence), false);
    assert.equal(deliverablesChipLabel(view.kind), 'deliverables=MISSING');
  });

  it('keeps an allowlist miss as not queried and never as zero deliverables', () => {
    const view = deliverablesListHonesty(
      {
        status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
        queried: false,
        reason: ALLOWLIST_REASON,
        items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'accepted' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /was not queried/);
    assert.match(view.sentence, /does not treat that as an empty deliverable list/);
    assert.match(view.sentence, /allowlist/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(
      /deliverables=MISSING|deliverables=INDEXED|deliverables=SOURCE_UNAVAILABLE|0 deliverables/.test(view.sentence),
      false,
    );
    assert.equal(deliverablesChipLabel(view.kind), 'Not queried');
  });

  it('says deliverables=SOURCE_UNAVAILABLE, hides partial rows, and does not invent OWNER_DECISION_REQUIRED', () => {
    const view = deliverablesListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Deliverable',
            clientCode: 'ACCG01',
            status: 'accepted',
            date: '2026-12-01',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /deliverables=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.equal(view.sentence.includes('Hidden Deliverable'), false);
    assert.equal(view.sentence.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|deliverables=MISSING|deliverables=INDEXED/.test(view.sentence),
      false,
    );
    assert.equal(deliverablesChipLabel(view.kind), 'deliverables=SOURCE_UNAVAILABLE');
  });

  it('wires the Deliverables card, Related work, and the State chip to one sentence', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /deliverablesListHonesty\(workspace\?\.deliverables, clientId\)/);
    assert.match(page, /title="Deliverables"/);
    assert.match(page, /deliverablesChipLabel\(deliverablesHonesty\.kind\)/);
    assert.equal(page.includes('${workspace.deliverables.items.length} deliverables'), false);
    assert.equal(page.includes('0 deliverables'), false);
    assert.equal(page.includes('sectionHonesty(workspace.deliverables)'), false);
    const card = page.slice(page.indexOf('title="Deliverables"'), page.indexOf('title="Contacts"'));
    const indexedAt = card.indexOf("deliverablesHonesty.kind === 'indexed'");
    const indexedBranch = card.slice(indexedAt, card.indexOf('No entitled deliverables'));
    assert.match(indexedBranch, /\{deliverablesHonesty\.sentence\}/);
    assert.match(indexedBranch, /deliverablesHonesty\.slice\.map/);
    assert.ok(indexedBranch.indexOf('{deliverablesHonesty.sentence}') < indexedBranch.indexOf('deliverablesHonesty.slice.map'));
    assert.match(indexedBranch, /row\.title/);
    assert.match(indexedBranch, /row\.status/);
    assert.match(indexedBranch, /\+\{deliverablesHonesty\.count - deliverablesHonesty\.slice\.length\} more/);
    assert.match(card, /Deliverables source unavailable/);
    assert.match(card, /Deliverables not queried/);
    assert.equal(card.includes('summary'), false);
    assert.equal(card.includes('webUrl'), false);
    assert.equal(card.includes('Create deliverable'), false);
    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /deliverablesChipLabel\(deliverablesHonesty\.kind\)/);
    assert.equal(state.includes('deliverables.items.length'), false);
    assert.equal(state.includes('0 deliverables'), false);
    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /\{deliverablesHonesty\.sentence\}/);
    assert.match(related, /\{engagementsHonesty\.sentence\}/);
    assert.match(related, /\{tasksHonesty\.sentence\}/);
    assert.match(related, /\{contactsHonesty\.sentence\}/);
    assert.match(related, /\{meetingsHonesty\.sentence\}/);
    assert.equal(related.includes('sectionHonesty(workspace.deliverables)'), false);
    const helper = readFileSync(join(root, 'deliverablesListHonesty.ts'), 'utf8');
    assert.match(helper, /return 'deliverables=INDEXED'/);
    assert.match(helper, /return 'deliverables=MISSING'/);
    assert.match(helper, /return 'deliverables=SOURCE_UNAVAILABLE'/);
    assert.match(helper, /return 'Not queried'/);
  });

  it('keeps deliverables prompts in the drawer', () => {
    assert.equal(aiCommandNavigatePath('What deliverables does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What deliverables exist for ACCG01?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 deliverables', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What deliverables does ACCG01 have?', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 deliverables', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('What engagements does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What documents exist for ACCG01?', { liveAskAtlas: true }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);

    const navigate = readFileSync(
      join(root, '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts'),
      'utf8',
    );
    assert.equal(navigate.includes('deliverable'), false);
  });
});
