/**
 * W2P Elite decisions / risks list honesty. Same Hub sentences, one combined payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  DECISIONS_RISKS_LIST_SLICE,
  DECISIONS_RISKS_MISSING_SENTENCE,
  decisionsRisksChipLabel,
  decisionsRisksListHonesty,
} from './decisionsRisksListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Decisions list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const DECISIONS_ALLOWLIST =
  'HVCG_Decisions is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';
const RISKS_ALLOWLIST =
  'HVCG_Risks is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';
const BOTH_ALLOWLIST =
  'HVCG_Decisions / HVCG_Risks is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Decisions / HVCG_Risks row(s). decisionsRisks=INDEXED. Decision: Approve ACCG engagement scope (open); Risk: Cash concentration. decisionsRisks=INDEXED/CONFIRMED. Current decisions and risks list is the hygiene-kept HVCG_Decisions and HVCG_Risks slice for this ClientCode only. Owner approvals are not this list. Approval Center items are not this list. Hygiene-quarantined rows are not this list. Atlas does not invent decisions, risks, owners, severity, or due dates. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.';

describe('W2P Elite decisions / risks list honesty', () => {
  it('lists entitled titles with status only when present, and drops other clients', () => {
    const view = decisionsRisksListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: 'd1',
            title: 'Approve ACCG engagement scope',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
            summary: 'Owner notes that are not this list',
            date: '2026-11-01',
            webUrl: 'https://example.invalid/decision',
          },
          {
            id: 'r1',
            title: 'Cash concentration',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Risks',
            entityType: 'risk',
            status: '   ',
            summary: 'Severity that was not on RiskStatus',
          },
          {
            id: 'd-pdg',
            title: 'PDG secret decision',
            clientCode: 'PDG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: 'd1', title: 'Approve ACCG engagement scope', kind: 'decision', status: 'open' },
      { id: 'r1', title: 'Cash concentration', kind: 'risk' },
    ]);
    assert.equal(view.sentence, INDEXED_SENTENCE);
    assert.equal(view.sentence.includes('PDG secret decision'), false);
    assert.equal(view.sentence.includes('Owner notes'), false);
    assert.equal(view.sentence.includes('Severity'), false);
    assert.equal(view.sentence.includes('2026-11-01'), false);
    assert.equal(view.sentence.includes('example.invalid'), false);
    assert.equal(/decisionsRisks=MISSING|decisionsRisks=SOURCE_UNAVAILABLE|0 decisions \/ risks/.test(view.sentence), false);
    assert.match(view.sentence, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(view.sentence, /capitalSubmit=false/);
    assert.match(view.sentence, /canExecute=false/);
    assert.equal(decisionsRisksChipLabel(view.kind), 'decisionsRisks=INDEXED');
  });

  it('caps the short slice and still reports +N more', () => {
    const items = Array.from({ length: DECISIONS_RISKS_LIST_SLICE + 2 }, (_, index) => ({
      id: `d-${index}`,
      title: `ACCG decision ${index + 1}`,
      clientCode: 'ACCG01',
      sourceList: 'HVCG_Decisions',
      entityType: 'decision',
      status: 'open',
    }));
    const view = decisionsRisksListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, DECISIONS_RISKS_LIST_SLICE + 2);
    assert.equal(view.slice.length, DECISIONS_RISKS_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG decision 7'), false);
  });

  it('says decisionsRisks=MISSING for a finished empty slice', () => {
    const view = decisionsRisksListHonesty(
      { status: 'COMPLETE', queried: true, items: [] },
      'ACCG01',
    );
    assert.equal(view.kind, 'missing');
    assert.match(view.sentence, new RegExp(DECISIONS_RISKS_MISSING_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(view.sentence, /decisionsRisks=MISSING\/MISSING/);
    assert.match(view.sentence, /Owner approvals are not this list/);
    assert.match(view.sentence, /Approval Center items are not this list/);
    assert.match(view.sentence, /Hygiene-quarantined rows are not this list/);
    assert.match(view.sentence, /does not invent decisions, risks, owners, severity, or due dates/);
    assert.equal(
      /decisionsRisks=SOURCE_UNAVAILABLE|decisionsRisks=INDEXED|truncated|page_cap|was not queried|0 decisions \/ risks/.test(
        view.sentence,
      ),
      false,
    );
    assert.equal(decisionsRisksChipLabel(view.kind), 'decisionsRisks=MISSING');
  });

  it('keeps an allowlist miss as not queried and never as zero decisions / risks', () => {
    const view = decisionsRisksListHonesty(
      {
        status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
        queried: false,
        reason: BOTH_ALLOWLIST,
        items: [
          {
            id: 'hidden',
            title: 'Should Not List',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /were not queried/);
    assert.match(view.sentence, /does not treat that as an empty decisions or risks list/);
    assert.match(view.sentence, /allowlist/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(view.sentence.includes('HVCG_Decisions was queried'), false);
    assert.equal(
      /decisionsRisks=MISSING|decisionsRisks=INDEXED|decisionsRisks=SOURCE_UNAVAILABLE|0 decisions \/ risks/.test(
        view.sentence,
      ),
      false,
    );
    assert.equal(decisionsRisksChipLabel(view.kind), 'Not queried');
  });

  it('names the unqueried list on a mixed grant and does not call it indexed or empty', () => {
    const risksUngranted = decisionsRisksListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        reason: RISKS_ALLOWLIST,
        items: [
          {
            id: 'd1',
            title: 'Approve ACCG engagement scope',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
          },
          {
            id: 'r-hidden',
            title: 'Ungranted risk title',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Risks',
            entityType: 'risk',
            status: 'open',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(risksUngranted.kind, 'mixed');
    if (risksUngranted.kind !== 'mixed') return;
    assert.match(risksUngranted.sentence, /HVCG_Decisions was queried/);
    assert.match(risksUngranted.sentence, /HVCG_Risks was not queried/);
    assert.match(risksUngranted.sentence, /does not treat the unqueried list as empty/);
    assert.match(risksUngranted.sentence, /Decision: Approve ACCG engagement scope \(open\)/);
    assert.match(risksUngranted.sentence, /not fully indexed/);
    assert.match(risksUngranted.sentence, /decisionsRisks=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.equal(risksUngranted.sentence.includes('Ungranted risk title'), false);
    assert.equal(
      /decisionsRisks=INDEXED|decisionsRisks=MISSING|0 decisions \/ risks/.test(risksUngranted.sentence),
      false,
    );
    assert.equal(decisionsRisksChipLabel(risksUngranted.kind), 'Not fully indexed');

    const decisionsUngranted = decisionsRisksListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        reason: DECISIONS_ALLOWLIST,
        items: [],
      },
      'ACCG01',
    );
    assert.equal(decisionsUngranted.kind, 'mixed');
    assert.match(decisionsUngranted.sentence, /HVCG_Risks was queried/);
    assert.match(decisionsUngranted.sentence, /HVCG_Decisions was not queried/);
    assert.match(decisionsUngranted.sentence, /The queried list has no entitled rows/);
    assert.equal(
      /decisionsRisks=INDEXED|decisionsRisks=MISSING|0 decisions \/ risks/.test(decisionsUngranted.sentence),
      false,
    );
    assert.equal(decisionsRisksChipLabel('mixed'), 'Not fully indexed');
  });

  it('says decisionsRisks=SOURCE_UNAVAILABLE, hides partial rows, and does not invent OWNER_DECISION_REQUIRED', () => {
    const view = decisionsRisksListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Decision',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
            date: '2026-12-01',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /decisionsRisks=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.equal(view.sentence.includes('Hidden Decision'), false);
    assert.equal(view.sentence.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|decisionsRisks=MISSING|decisionsRisks=INDEXED|0 decisions \/ risks/.test(
        view.sentence,
      ),
      false,
    );
    assert.equal(decisionsRisksChipLabel(view.kind), 'decisionsRisks=SOURCE_UNAVAILABLE');
  });

  it('wires the Decisions / risks card, Related work, and the State chip to one sentence', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /decisionsRisksListHonesty\(workspace\?\.decisionsRisks, clientId\)/);
    assert.match(page, /title="Decisions \/ risks"/);
    assert.match(page, /decisionsRisksChipLabel\(decisionsRisksHonesty\.kind\)/);
    assert.equal(page.includes('${workspace.decisionsRisks.items.length} decisions / risks'), false);
    assert.equal(page.includes('0 decisions / risks'), false);
    assert.equal(page.includes('sectionHonesty(workspace.decisionsRisks)'), false);
    const card = page.slice(page.indexOf('title="Decisions / risks"'), page.indexOf('title="Deliverables"'));
    const indexedAt = card.indexOf("decisionsRisksHonesty.kind === 'indexed'");
    const indexedBranch = card.slice(indexedAt, card.indexOf('No entitled decisions or risks'));
    assert.match(indexedBranch, /\{decisionsRisksHonesty\.sentence\}/);
    assert.match(indexedBranch, /decisionsRisksHonesty\.slice\.map/);
    assert.ok(
      indexedBranch.indexOf('{decisionsRisksHonesty.sentence}') <
        indexedBranch.indexOf('decisionsRisksHonesty.slice.map'),
    );
    assert.match(indexedBranch, /row\.title/);
    assert.match(indexedBranch, /row\.status/);
    assert.match(indexedBranch, /row\.kind/);
    assert.match(indexedBranch, /\+\{decisionsRisksHonesty\.count - decisionsRisksHonesty\.slice\.length\} more/);
    assert.match(card, /Decisions \/ risks source unavailable/);
    assert.match(card, /Decisions \/ risks not queried/);
    assert.match(card, /decisionsRisksHonesty\.kind === 'mixed'/);
    assert.equal(card.includes('summary'), false);
    assert.equal(card.includes('webUrl'), false);
    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /decisionsRisksChipLabel\(decisionsRisksHonesty\.kind\)/);
    assert.equal(state.includes('decisionsRisks.items.length'), false);
    assert.equal(state.includes('0 decisions / risks'), false);
    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /\{decisionsRisksHonesty\.sentence\}/);
    assert.match(related, /\{deliverablesHonesty\.sentence\}/);
    assert.equal(related.includes('sectionHonesty(workspace.decisionsRisks)'), false);
    const helper = readFileSync(join(root, 'decisionsRisksListHonesty.ts'), 'utf8');
    assert.match(helper, /return 'decisionsRisks=INDEXED'/);
    assert.match(helper, /return 'decisionsRisks=MISSING'/);
    assert.match(helper, /return 'decisionsRisks=SOURCE_UNAVAILABLE'/);
    assert.match(helper, /return 'Not fully indexed'/);
    assert.match(helper, /return 'Not queried'/);
    assert.equal(helper.includes('0 decisions / risks'), false);
  });

  it('keeps decisions and risks list prompts in the drawer', () => {
    assert.equal(aiCommandNavigatePath('What risks does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 decisions', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 risks', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('Decisions and risks list for ACCG01', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What risks does ACCG01 have?', { liveAskAtlas: false }), null);
    assert.equal(aiCommandNavigatePath('What decisions does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What deliverables does ACCG01 have?', { liveAskAtlas: true }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);
  });
});
