/**
 * W2Q Elite communications list honesty. Same Hub sentences, thread rows only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  COMMUNICATIONS_LIST_MISSING_SENTENCE,
  COMMUNICATIONS_LIST_SLICE,
  communicationsListChipLabel,
  communicationsListHonesty,
} from './communicationsListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Communications list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Communications is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Communications thread row(s). communicationsList=INDEXED. Kickoff note (email, inbound, 2026-09-02); Scope question. communicationsList=INDEXED/CONFIRMED. Current communications list is the hygiene-unfiltered HVCG_Communications slice for this ClientCode, excluding file-index rows. File-index rows are the document index. They are not threads. The workspace timeline is not this list. Atlas does not invent threads, recipients, channels, direction, sent times, or message text. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.';

describe('W2Q Elite communications list honesty', () => {
  it('lists thread titles with channel, direction, and date only when present', () => {
    const view = communicationsListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: 't1',
            title: 'Kickoff note',
            clientCode: 'ACCG01',
            channel: 'email',
            direction: 'inbound',
            date: '2026-09-02',
            status: 'sent',
            summary: 'Message body that is not this list',
            webUrl: 'https://example.invalid/thread',
          },
          {
            id: 't2',
            title: 'Scope question',
            clientCode: 'ACCG01',
            channel: '   ',
            direction: '',
            date: '   ',
            status: 'draft',
          },
          {
            id: 'file-1',
            title: 'ACCG indexed correspondence.pdf',
            clientCode: 'ACCG01',
            summary: 'File metadata index',
            sourceItemId: 'file:drive-item',
            channel: 'email',
          },
          {
            id: 'file-2',
            title: 'Restricted memo.pdf',
            clientCode: 'ACCG01',
            summary: 'RESTRICTED — metadata and source link only',
          },
          { id: 't-pdg', title: 'PDG secret thread', clientCode: 'PDG01', channel: 'email' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: 't1', title: 'Kickoff note', channel: 'email', direction: 'inbound', date: '2026-09-02' },
      { id: 't2', title: 'Scope question' },
    ]);
    assert.equal(view.sentence, INDEXED_SENTENCE);
    assert.equal(view.sentence.includes('ACCG indexed correspondence'), false);
    assert.equal(view.sentence.includes('Restricted memo'), false);
    assert.equal(view.sentence.includes('PDG secret thread'), false);
    assert.equal(view.sentence.includes('Message body'), false);
    assert.equal(view.sentence.includes('example.invalid'), false);
    assert.equal(view.sentence.includes('(sent)'), false);
    assert.equal(view.sentence.includes('draft'), false);
    assert.equal(/communicationsList=MISSING|communicationsList=SOURCE_UNAVAILABLE|0 communications/.test(view.sentence), false);
    assert.match(view.sentence, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(view.sentence, /capitalSubmit=false/);
    assert.match(view.sentence, /canExecute=false/);
    assert.equal(communicationsListChipLabel(view.kind), 'communicationsList=INDEXED');
  });

  it('caps the short slice and still reports +N more', () => {
    const items = Array.from({ length: COMMUNICATIONS_LIST_SLICE + 2 }, (_, index) => ({
      id: `t-${index}`,
      title: `ACCG thread ${index + 1}`,
      clientCode: 'ACCG01',
      channel: index === 0 ? 'email' : '',
    }));
    const view = communicationsListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, COMMUNICATIONS_LIST_SLICE + 2);
    assert.equal(view.slice.length, COMMUNICATIONS_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG thread 7'), false);
  });

  it('says communicationsList=MISSING for a finished empty slice and for file-index rows only', () => {
    const empty = communicationsListHonesty(
      { status: 'COMPLETE', queried: true, items: [] },
      'ACCG01',
    );
    assert.equal(empty.kind, 'missing');
    assert.match(empty.sentence, new RegExp(COMMUNICATIONS_LIST_MISSING_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(empty.sentence, /communicationsList=MISSING\/MISSING/);
    assert.match(empty.sentence, /File-index rows are the document index/);
    assert.match(empty.sentence, /The workspace timeline is not this list/);
    assert.match(empty.sentence, /does not invent threads, recipients, channels, direction, sent times, or message text/);
    assert.equal(
      /communicationsList=SOURCE_UNAVAILABLE|communicationsList=INDEXED|truncated|page_cap|was not queried|0 communications/.test(
        empty.sentence,
      ),
      false,
    );
    assert.equal(communicationsListChipLabel(empty.kind), 'communicationsList=MISSING');

    const fileIndexOnly = communicationsListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: 'file-1',
            title: 'ACCG indexed correspondence.pdf',
            clientCode: 'ACCG01',
            summary: 'File metadata index',
            sourceItemId: 'file:abc',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(fileIndexOnly.kind, 'missing');
    assert.equal(fileIndexOnly.sentence.includes('ACCG indexed correspondence'), false);
    assert.equal(communicationsListChipLabel(fileIndexOnly.kind), 'communicationsList=MISSING');
  });

  it('keeps an allowlist miss as not queried and never as zero communications', () => {
    const view = communicationsListHonesty(
      {
        status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
        queried: false,
        reason: ALLOWLIST_REASON,
        items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', channel: 'email' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /was not queried/);
    assert.match(view.sentence, /does not treat that as an empty communications list/);
    assert.match(view.sentence, /allowlist/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(
      /communicationsList=MISSING|communicationsList=INDEXED|communicationsList=SOURCE_UNAVAILABLE|0 communications/.test(
        view.sentence,
      ),
      false,
    );
    assert.equal(communicationsListChipLabel(view.kind), 'Not queried');
  });

  it('says communicationsList=SOURCE_UNAVAILABLE, hides partial rows, and does not invent OWNER_DECISION_REQUIRED', () => {
    const view = communicationsListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Thread',
            clientCode: 'ACCG01',
            channel: 'email',
            date: '2026-12-01',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /communicationsList=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /communicationsList=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.equal(view.sentence.includes('Hidden Thread'), false);
    assert.equal(view.sentence.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|communicationsList=MISSING|communicationsList=INDEXED|0 communications/.test(
        view.sentence,
      ),
      false,
    );
    assert.equal(communicationsListChipLabel(view.kind), 'communicationsList=SOURCE_UNAVAILABLE');
  });

  it('wires the Communications card, Related work, and the State chip to one sentence', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /communicationsListHonesty\(workspace\?\.communications, clientId\)/);
    assert.match(page, /title="Communications"/);
    assert.match(page, /communicationsListChipLabel\(communicationsListView\.kind\)/);
    assert.equal(page.includes('0 communications'), false);
    assert.equal(page.includes('sectionHonesty(workspace.communications)'), false);
    assert.match(page, /sectionHonesty\(workspace\.documents\)/);
    const card = page.slice(page.indexOf('title="Communications"'), page.indexOf('title="Timeline"'));
    const indexedAt = card.indexOf("communicationsListView.kind === 'indexed'");
    const indexedBranch = card.slice(indexedAt, card.indexOf('No entitled communication threads'));
    assert.match(indexedBranch, /\{communicationsListView\.sentence\}/);
    assert.match(indexedBranch, /communicationsListView\.slice\.map/);
    assert.ok(
      indexedBranch.indexOf('{communicationsListView.sentence}') <
        indexedBranch.indexOf('communicationsListView.slice.map'),
    );
    assert.match(indexedBranch, /row\.title/);
    assert.match(indexedBranch, /row\.channel/);
    assert.match(indexedBranch, /row\.direction/);
    assert.match(indexedBranch, /row\.date/);
    assert.match(indexedBranch, /\+\{communicationsListView\.count - communicationsListView\.slice\.length\} more/);
    assert.match(card, /Communications source unavailable/);
    assert.match(card, /Communications not queried/);
    assert.match(card, /No entitled communication threads/);
    assert.equal(card.includes('row.status'), false);
    assert.equal(card.includes('summary'), false);
    assert.equal(card.includes('webUrl'), false);
    assert.equal(card.includes('Send'), false);
    assert.equal(card.includes('Reply'), false);
    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /communicationsListChipLabel\(communicationsListView\.kind\)/);
    assert.equal(state.includes('communications.items.length'), false);
    assert.equal(state.includes('0 communications'), false);
    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /sectionHonesty\(workspace\.documents\)/);
    assert.match(related, /\{communicationsListView\.sentence\}/);
    assert.equal(related.includes('sectionHonesty(workspace.communications)'), false);
    assert.match(related, /\{decisionsRisksHonesty\.sentence\}/);
    const helper = readFileSync(join(root, 'communicationsListHonesty.ts'), 'utf8');
    assert.match(helper, /return 'communicationsList=INDEXED'/);
    assert.match(helper, /return 'communicationsList=MISSING'/);
    assert.match(helper, /return 'communicationsList=SOURCE_UNAVAILABLE'/);
    assert.match(helper, /return 'Not queried'/);
    assert.equal(helper.includes('0 communications'), false);
    assert.match(page, /capitalLinked/);
    assert.match(page, /title="Timeline"/);
  });

  it('keeps communications list prompts in the drawer', () => {
    assert.equal(aiCommandNavigatePath('What communications does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 communications', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('Communications list for ACCG01', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What communications does ACCG01 have?', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 communications', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('What documents exist for ACCG01?', { liveAskAtlas: true }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);

    const navigate = readFileSync(
      join(root, '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts'),
      'utf8',
    );
    assert.equal(navigate.includes('communication'), false);
  });
});
