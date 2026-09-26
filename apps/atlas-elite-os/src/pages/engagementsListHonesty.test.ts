/**
 * W2N Elite engagements list honesty. Same Hub sentences, one payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  ENGAGEMENTS_LIST_SLICE,
  ENGAGEMENTS_MISSING_SENTENCE,
  engagementsChipLabel,
  engagementsListHonesty,
} from './engagementsListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Engagements list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Engagements is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Engagements row(s). engagements=INDEXED. Tax advisory (active); Bookkeeping. engagements=INDEXED/CONFIRMED. Current engagement list is the entitled HVCG_Engagements slice for this ClientCode only. EngagementTypePrimary on HVCG_Clients is not this list. Recovered engagement/agreement filenames are not this list. Atlas does not invent engagements, scopes, fees, dates, or obligations. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.';

describe('W2N Elite engagements list honesty', () => {
  it('lists entitled titles with status only when present, and drops other clients', () => {
    const view = engagementsListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: 'e1',
            title: 'Tax advisory',
            clientCode: 'ACCG01',
            status: 'active',
            summary: 'Signed SOW obligating fees',
            webUrl: 'https://example.invalid/sow',
          },
          {
            id: 'e2',
            title: 'Bookkeeping',
            clientCode: 'ACCG01',
            status: '   ',
            summary: 'Background notes',
          },
          { id: 'e-pdg', title: 'PDG secret engagement', clientCode: 'PDG01', status: 'active' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: 'e1', title: 'Tax advisory', status: 'active' },
      { id: 'e2', title: 'Bookkeeping' },
    ]);
    assert.equal(view.sentence, INDEXED_SENTENCE);
    assert.equal(view.sentence.includes('PDG secret engagement'), false);
    assert.equal(view.sentence.includes('Signed SOW'), false);
    assert.equal(view.sentence.includes('Background notes'), false);
    assert.equal(view.sentence.includes('example.invalid'), false);
    assert.equal(/engagements=MISSING|engagements=SOURCE_UNAVAILABLE/.test(view.sentence), false);
    assert.match(view.sentence, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(view.sentence, /capitalSubmit=false/);
    assert.match(view.sentence, /canExecute=false/);
  });

  it('caps the short slice and still reports +N more', () => {
    const items = Array.from({ length: ENGAGEMENTS_LIST_SLICE + 2 }, (_, index) => ({
      id: `e-${index}`,
      title: `ACCG engagement ${index + 1}`,
      clientCode: 'ACCG01',
      status: 'active',
    }));
    const view = engagementsListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, ENGAGEMENTS_LIST_SLICE + 2);
    assert.equal(view.slice.length, ENGAGEMENTS_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG engagement 7'), false);
  });

  it('says engagements=MISSING for a finished empty slice', () => {
    const view = engagementsListHonesty(
      { status: 'COMPLETE', queried: true, items: [] },
      'ACCG01',
    );
    assert.equal(view.kind, 'missing');
    assert.match(view.sentence, new RegExp(ENGAGEMENTS_MISSING_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(view.sentence, /engagements=MISSING\/MISSING/);
    assert.match(view.sentence, /EngagementTypePrimary on HVCG_Clients is not this list/);
    assert.match(view.sentence, /does not invent engagements, scopes, fees, dates, or obligations/);
    assert.equal(/engagements=SOURCE_UNAVAILABLE|engagements=INDEXED|truncated|page_cap/.test(view.sentence), false);
    assert.equal(engagementsChipLabel(view.kind), 'engagements=MISSING');
  });

  it('keeps an allowlist miss as not queried and never as zero engagements', () => {
    const view = engagementsListHonesty(
      {
        status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
        queried: false,
        reason: ALLOWLIST_REASON,
        items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'active' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /was not queried/);
    assert.match(view.sentence, /does not treat that as an empty engagement list/);
    assert.match(view.sentence, /allowlist/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(/engagements=MISSING|engagements=INDEXED|engagements=SOURCE_UNAVAILABLE|0 engagements/.test(view.sentence), false);
    assert.equal(engagementsChipLabel(view.kind), 'Not queried');
  });

  it('says engagements=SOURCE_UNAVAILABLE, hides partial rows, and does not invent OWNER_DECISION_REQUIRED', () => {
    const view = engagementsListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Engagement',
            clientCode: 'ACCG01',
            status: 'active',
            summary: 'Scope that is not a contract',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /engagements=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.equal(view.sentence.includes('Hidden Engagement'), false);
    assert.equal(view.sentence.includes('Scope that is not'), false);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|engagements=MISSING|engagements=INDEXED/.test(view.sentence), false);
    assert.equal(engagementsChipLabel(view.kind), 'engagements=SOURCE_UNAVAILABLE');
  });

  it('wires the Engagements card, Related work, and the State chip to one sentence', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /engagementsListHonesty\(workspace\?\.engagements, clientId\)/);
    assert.match(page, /title="Engagements"/);
    assert.match(page, /engagementsChipLabel\(engagementsHonesty\.kind\)/);
    assert.equal(page.includes('${workspace.engagements.items.length} engagements'), false);
    assert.equal(page.includes('0 engagements'), false);
    const card = page.slice(page.indexOf('title="Engagements"'), page.indexOf('title="Decisions / risks"'));
    const indexedAt = card.indexOf("engagementsHonesty.kind === 'indexed'");
    const indexedBranch = card.slice(indexedAt, card.indexOf('No entitled engagements'));
    assert.match(indexedBranch, /\{engagementsHonesty\.sentence\}/);
    assert.match(indexedBranch, /engagementsHonesty\.slice\.map/);
    assert.ok(indexedBranch.indexOf('{engagementsHonesty.sentence}') < indexedBranch.indexOf('engagementsHonesty.slice.map'));
    assert.match(indexedBranch, /row\.title/);
    assert.match(indexedBranch, /row\.status/);
    assert.match(indexedBranch, /\+\{engagementsHonesty\.count - engagementsHonesty\.slice\.length\} more/);
    assert.match(card, /Engagements source unavailable/);
    assert.match(card, /Engagements not queried/);
    assert.equal(card.includes('summary'), false);
    assert.equal(card.includes('webUrl'), false);
    assert.equal(card.includes('Create engagement'), false);
    assert.equal(card.includes('Scope'), false);
    assert.equal(card.includes('Background'), false);
    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /engagementsChipLabel\(engagementsHonesty\.kind\)/);
    assert.equal(state.includes('engagements.items.length'), false);
    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /\{engagementsHonesty\.sentence\}/);
    assert.match(related, /\{tasksHonesty\.sentence\}/);
    assert.match(related, /\{contactsHonesty\.sentence\}/);
    assert.match(related, /\{meetingsHonesty\.sentence\}/);
    assert.match(page, /overview\?\.engagementType \|\| null/);
    const helper = readFileSync(join(root, 'engagementsListHonesty.ts'), 'utf8');
    assert.match(helper, /return 'engagements=INDEXED'/);
    assert.match(helper, /return 'engagements=MISSING'/);
    assert.match(helper, /return 'engagements=SOURCE_UNAVAILABLE'/);
    assert.match(helper, /return 'Not queried'/);
  });

  it('keeps engagements prompts in the drawer', () => {
    assert.equal(aiCommandNavigatePath('What engagements does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What engagements exist for ACCG01?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 engagements', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What engagements does ACCG01 have?', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 engagements', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('What tasks does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What are we working on for ACCG01?', { liveAskAtlas: true }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);

    const navigate = readFileSync(
      join(root, '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts'),
      'utf8',
    );
    assert.equal(navigate.includes('engagement'), false);
  });
});
