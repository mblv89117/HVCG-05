/**
 * W2L Elite contacts list honesty. Same Hub sentences, one payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';
import {
  CONTACTS_LIST_SLICE,
  CONTACTS_MISSING_SENTENCE,
  contactsListHonesty,
} from './contactsListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Contacts list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Contacts row(s). contacts=INDEXED. Ada Lovelace <ada@accg.example>, Founder; Grace Hopper (email not recorded).';

describe('W2L Elite contacts list honesty', () => {
  it('lists entitled names and emails with the count, and drops other clients', () => {
    const view = contactsListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: '1',
            title: 'Ada Lovelace',
            clientCode: 'ACCG01',
            email: 'ada@accg.example',
            jobTitle: 'Founder',
            phone: '555-0142',
            date: '2026-04-01T00:00:00.000Z',
            isPrimary: false,
            isBillingContact: true,
            isDecisionMaker: false,
          },
          {
            id: '2',
            title: 'Grace Hopper',
            clientCode: 'ACCG01',
            email: '   ',
            jobTitle: '',
          },
          { id: '3', title: 'PDG Person', clientCode: 'PDG01', email: 'pdg@example.com' },
          { id: '4', title: 'Unstamped Person', email: 'blank@example.com' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 2);
    assert.deepEqual(view.slice, [
      { id: '1', title: 'Ada Lovelace', email: 'ada@accg.example', jobTitle: 'Founder' },
      { id: '2', title: 'Grace Hopper' },
    ]);
    assert.equal(view.sentence, INDEXED_SENTENCE);
    assert.equal(view.sentence.includes('PDG Person'), false);
    assert.equal(view.sentence.includes('555-0142'), false);
    assert.equal(view.sentence.includes('2026-04-01'), false);
    assert.equal(/decision maker|billing|IsPrimary|phone/i.test(view.sentence), false);
    assert.equal(/contacts=MISSING|contacts=SOURCE_UNAVAILABLE/.test(view.sentence), false);
  });

  it('caps the short slice and still reports +N more', () => {
    const items = Array.from({ length: CONTACTS_LIST_SLICE + 2 }, (_, index) => ({
      id: `c-${index}`,
      title: `ACCG contact ${index + 1}`,
      clientCode: 'ACCG01',
      email: `person${index + 1}@accg.example`,
    }));
    const view = contactsListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, CONTACTS_LIST_SLICE + 2);
    assert.equal(view.slice.length, CONTACTS_LIST_SLICE);
    assert.match(view.sentence, /\+2 more/);
    assert.equal(view.sentence.includes('ACCG contact 7'), false);
    assert.equal(view.sentence.includes('person8@accg.example'), false);
  });

  it('says contacts=MISSING for a finished empty slice', () => {
    const view = contactsListHonesty({ status: 'COMPLETE', queried: true, items: [] }, 'ACCG01');
    assert.equal(view.kind, 'missing');
    assert.equal(view.sentence, CONTACTS_MISSING_SENTENCE);
    assert.equal(/contacts=SOURCE_UNAVAILABLE|contacts=INDEXED/.test(view.sentence), false);
  });

  it('keeps an allowlist miss as not queried', () => {
    const view = contactsListHonesty(
      {
        status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
        queried: false,
        reason: 'HVCG_Contacts is not in the Hub Graph Selected allowlist.',
        items: [{ id: '1', title: 'Should Not List', clientCode: 'ACCG01', email: 'hidden@accg.example' }],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'not_queried');
    assert.match(view.sentence, /was not queried/);
    assert.equal(view.sentence.includes('Should Not List'), false);
    assert.equal(/contacts=MISSING|contacts=INDEXED|contacts=SOURCE_UNAVAILABLE/.test(view.sentence), false);
  });

  it('says contacts=SOURCE_UNAVAILABLE and hides partial rows on page_cap', () => {
    const view = contactsListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Person',
            clientCode: 'ACCG01',
            email: 'hidden@accg.example',
            phone: '555-0100',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /contacts=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.match(view.sentence, /OWNER_DECISION_REQUIRED/);
    assert.match(view.sentence, /pageCap=80 top=100/);
    assert.match(view.sentence, /itemsFetched=80/);
    assert.equal(view.sentence.includes('Hidden Person'), false);
    assert.equal(view.sentence.includes('hidden@accg.example'), false);
    assert.equal(/contacts=MISSING|contacts=INDEXED/.test(view.sentence), false);
  });

  it('wires State → Related Work to the Hub payload helper and not a second list', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /title="Contacts"/);
    assert.match(page, /contactsListHonesty\(workspace\?\.contacts, clientId\)/);
    assert.match(page, /\{contactsHonesty\.sentence\}/);
    assert.match(page, /\+\{contactsHonesty\.count - contactsHonesty\.slice\.length\} more/);
    const contactsCard = page.slice(page.indexOf('title="Contacts"'), page.indexOf('title="Meetings"'));
    assert.match(contactsCard, /row\.title/);
    assert.match(contactsCard, /row\.email/);
    assert.match(contactsCard, /row\.jobTitle/);
    assert.equal(contactsCard.includes('row.date'), false);
    assert.equal(contactsCard.includes('row.phone'), false);
    assert.equal(contactsCard.includes('contactCandidates'), false);
    assert.equal(contactsCard.includes('IsPrimary'), false);
    assert.equal(contactsCard.includes('sectionHonesty(workspace.contacts)'), false);
    assert.match(page, /title="Meetings"/);
    assert.match(page, /meetingsListHonesty\(workspace\?\.meetings, clientId\)/);
  });

  it('keeps contacts prompts in the drawer when the live Hub runner is attached', () => {
    assert.equal(aiCommandNavigatePath('What contacts exist for ACCG01?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What contacts exist for client ACCG01?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('What contacts does ACCG01 have?', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('List ACCG01 contacts', { liveAskAtlas: true }), null);

    const appShell = readFileSync(join(root, '../layout/AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(appShell.indexOf('onRunPrompt={async (prompt)'));
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);
  });
});
