/**
 * W2L ACCG01 contacts list honesty.
 * Names and emails come from entitled HVCG_Contacts rows only.
 * contactCandidates stay proposed and never become the contact list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import {
  composeClientTruth,
  CONTACTS_LIST_SLICE,
  CONTACTS_MISSING_SENTENCE,
  contactListLabel,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  contactsIndexUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { createListItemCache } from '../src/pm/sharepoint/listCache.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP, SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { SharePointPmSettings } from '../src/pm/sharepoint/settings.ts';

const PAGE_CAP_REASON =
  'HVCG_Contacts list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';
const READ_FAIL_REASON = 'HVCG_Contacts could not be read. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Contacts is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled HVCG_Contacts row(s). contacts=INDEXED. Ada Lovelace <ada@accg.example>, Founder; Grace Hopper (email not recorded).';

const CONTACTS_LIST = 'ffffffff-ffff-4fff-8fff-fffffffffff7';

function workspace(overrides: Partial<WorkspaceTruthSnapshot> = {}): WorkspaceTruthSnapshot {
  return {
    clientCode: 'ACCG01',
    displayName: 'ACCG Inc.',
    documents: {
      queried: true,
      items: [
        {
          id: 'doc-1',
          title: 'ACCG indexed correspondence.pdf',
          source: 'HVCG_Communications/file-index',
          clientCode: 'ACCG01',
        },
      ],
    },
    projects: [{ id: 'p1', name: 'ACCG operating engagement', status: 'active' }],
    meetings: {
      queried: true,
      status: 'COMPLETE',
      items: [
        {
          id: 'm1',
          title: 'ACCG kickoff',
          clientCode: 'ACCG01',
          date: '2026-09-01T00:00:00.000Z',
          attendees: 'Invented Attendee',
        },
      ],
    },
    communications: {
      queried: true,
      items: [
        {
          id: 'comm-1',
          title: 'Thread with ops',
          clientCode: 'ACCG01',
          email: 'ops@accg-inc.example',
          fromName: 'ACCG Ops',
        },
      ],
    },
    contacts: { queried: true, status: 'COMPLETE', items: [] },
    ...overrides,
  };
}

function indexedContacts() {
  return {
    queried: true,
    status: 'COMPLETE' as const,
    items: [
      {
        id: 'c1',
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
        id: 'c2',
        title: 'Grace Hopper',
        clientCode: 'ACCG01',
        email: '   ',
        jobTitle: '',
        phone: '555-0199',
      },
      {
        id: 'c3',
        title: 'PDG Person',
        clientCode: 'PDG01',
        email: 'pdg@example.com',
        jobTitle: 'Outside',
      },
      {
        id: 'c4',
        title: 'Unstamped Person',
        email: 'blank@example.com',
      },
    ],
  };
}

function truth(snapshot: WorkspaceTruthSnapshot, clientCode = 'ACCG01') {
  const composed = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in composed, false);
  if ('failClosed' in composed) throw new Error('unexpected fail closed');
  return composed;
}

describe('W2L contacts list honesty', () => {
  it('keeps the list walk budget at page_cap 80 and $top 100', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
  });

  it('maps a closed contacts question, including the live client phrasing, and leaves other topics alone', () => {
    assert.equal(mapsToClientOperatingBriefIntent('What contacts exist for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What contacts exist for ACCG01?'), 'contacts');
    assert.equal(mapsToClientOperatingBriefIntent('What contacts exist for client ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What contacts exist for client ACCG01?'), 'contacts');
    assert.equal(mapsToClientOperatingBriefIntent('What contacts does ACCG01 have?'), true);
    assert.equal(clientOperatingBriefTopic('What contacts does ACCG01 have?'), 'contacts');
    assert.equal(mapsToClientOperatingBriefIntent('List ACCG01 contacts'), true);
    assert.equal(clientOperatingBriefTopic('List ACCG01 contacts'), 'contacts');
    assert.equal(mapsToClientOperatingBriefIntent('What contacts exist?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('List contacts'), false);
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('What projects are active for ACCG01?'), 'projects');
    assert.equal(clientOperatingBriefTopic('What is the capital context for ACCG01?'), 'capital');
  });

  it('copies Email and JobTitle onto contact items and leaves blanks, phone, and role flags off', async () => {
    const writes: string[] = [];
    const graph: PmGraphTransport = {
      async listItems(listId: string): Promise<GraphListPage> {
        if (listId !== CONTACTS_LIST) return { items: [] };
        const rows: GraphListItem[] = [
          {
            id: '1',
            etag: '"1"',
            fields: {
              Title: 'Ada Lovelace',
              ClientCode: 'ACCG01',
              Email: 'ada@accg.example',
              JobTitle: 'Founder',
              Phone: '555-0142',
              IsPrimary: false,
              IsBillingContact: true,
              IsDecisionMaker: false,
              Modified: '2026-04-01T00:00:00Z',
            },
          },
          {
            id: '2',
            etag: '"2"',
            fields: {
              Title: 'Grace Hopper',
              ClientCode: 'ACCG01',
              Email: '   ',
              JobTitle: '',
              Phone: '555-0199',
            },
          },
          {
            id: '3',
            etag: '"3"',
            fields: { Title: 'PDG Person', ClientCode: 'PDG01', Email: 'pdg@example.com' },
          },
          {
            id: '4',
            etag: '"4"',
            fields: { Title: 'Unstamped Person', Email: 'blank@example.com', ClientCode: '' },
          },
        ];
        return { items: rows };
      },
      async getItem() {
        return null;
      },
      async createItem() {
        writes.push('create');
        throw new Error('HVCG_Contacts create is out of scope');
      },
      async patchItemFields() {
        writes.push('patch');
        throw new Error('HVCG_Contacts update is out of scope');
      },
    };
    const settings: SharePointPmSettings = {
      siteId: 'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022',
      projectsListId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      tasksListId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      milestonesListId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      clientsListId: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      contactsListId: CONTACTS_LIST,
      managedIdentityClientId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    };
    const lookup: UserBasicLookup = async (oid) => ({
      ok: true,
      profile: { id: oid, mail: 'owner@hvcg.example', userPrincipalName: 'owner@hvcg.example' },
    });
    const principal: AtlasPrincipal = {
      userId: '11111111-1111-4111-8111-111111111003',
      organizationId: 'org-hvcg',
      allowedClientIds: ['ACCG01'],
      roles: ['HVCG Team Member'],
    };
    const service = new SharePointPmService(settings, graph, lookup, createListItemCache());
    const packed = await service.listWorkspaceCollections(principal, 'ACCG01');
    assert.equal(writes.length, 0);
    assert.equal(packed.contacts.queried, true);
    assert.equal(packed.contacts.items.length, 2);
    const ada = packed.contacts.items[0];
    const grace = packed.contacts.items[1];
    assert.equal(ada?.email, 'ada@accg.example');
    assert.equal(ada?.jobTitle, 'Founder');
    assert.equal('phone' in (ada || {}), false);
    assert.equal('isPrimary' in (ada || {}), false);
    assert.equal('isBillingContact' in (ada || {}), false);
    assert.equal('isDecisionMaker' in (ada || {}), false);
    assert.equal('email' in (grace || {}), false);
    assert.equal('jobTitle' in (grace || {}), false);
    assert.equal(packed.contacts.items.some((row) => row.title === 'PDG Person'), false);
    assert.equal(packed.contacts.items.some((row) => row.title === 'Unstamped Person'), false);
  });

  it('lists entitled names and emails, drops other clients, and does not leak candidates or role flags', () => {
    const composed = truth(workspace({ contacts: indexedContacts() }));
    assert.equal(composed.contacts.completeness, 'INDEXED');
    assert.equal(composed.contacts.classification, 'CONFIRMED');
    assert.equal(composed.contacts.summary, INDEXED_SENTENCE);
    assert.equal(composed.contacts.summary.includes('PDG Person'), false);
    assert.equal(composed.contacts.summary.includes('Unstamped Person'), false);
    assert.equal(composed.contacts.summary.includes('ops@accg-inc.example'), false);
    assert.equal(composed.contacts.summary.includes('555-0142'), false);
    assert.equal(composed.contacts.summary.includes('555-0199'), false);
    assert.equal(composed.contacts.summary.includes('2026-04-01'), false);
    assert.equal(/IsPrimary|IsBillingContact|IsDecisionMaker|decision maker|billing contact/i.test(composed.contacts.summary), false);
    assert.equal(composed.contacts.summary.includes('ACCG kickoff'), false);
    assert.equal(composed.contacts.summary.includes('Invented Attendee'), false);
    assert.equal(composed.contactCandidates.length, 1);
    assert.equal(composed.contactCandidates[0]?.email, 'ops@accg-inc.example');
    assert.equal(composed.contactCandidates[0]?.writeStatus, 'CANDIDATE_NOT_CREATED');
    assert.equal(composed.contactCandidates[0]?.classification, 'PROPOSED');
    assert.equal(composed.meetings.completeness, 'INDEXED');
    assert.match(composed.meetings.summary, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.match(composed.documents.summary, /ACCG indexed correspondence\.pdf/);
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);
    assert.equal(contactListLabel({ title: 'Ada Lovelace', email: 'ada@accg.example', jobTitle: 'Founder' }), 'Ada Lovelace <ada@accg.example>, Founder');

    const questions = [
      'What contacts exist for ACCG01?',
      'What contacts exist for client ACCG01?',
      'What contacts does ACCG01 have?',
      'List ACCG01 contacts',
    ];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({ contacts: indexedContacts() }),
      });
      assert.match(answer, /contacts=INDEXED/);
      assert.match(answer, /CONFIRMED/);
      assert.match(answer, /Ada Lovelace <ada@accg\.example>, Founder/);
      assert.match(answer, /Grace Hopper \(email not recorded\)/);
      assert.equal(answer.includes('ops@accg-inc.example'), false);
      assert.equal(answer.includes('PDG Person'), false);
      assert.equal(answer.includes('555-0142'), false);
      assert.equal(answer.includes('2026-04-01'), false);
      assert.equal(/decision maker|billing contact|IsPrimary|prepare contact|add a candidate/i.test(answer), false);
      assert.equal(/meetings=|documents=|projects=|capitalContext=/.test(answer), false);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const items = Array.from({ length: CONTACTS_LIST_SLICE + 2 }, (_, index) => ({
      id: `c-${index}`,
      title: `ACCG contact ${index + 1}`,
      clientCode: 'ACCG01',
      email: `person${index + 1}@accg.example`,
      jobTitle: index === 0 ? 'Founder' : '',
    }));
    const composed = truth(workspace({ contacts: { queried: true, status: 'COMPLETE', items } }));
    assert.equal(composed.contacts.completeness, 'INDEXED');
    assert.match(composed.contacts.summary, /8 entitled HVCG_Contacts row/);
    assert.match(composed.contacts.summary, /ACCG contact 1 <person1@accg\.example>, Founder/);
    assert.match(composed.contacts.summary, /ACCG contact 6 <person6@accg\.example>/);
    assert.match(composed.contacts.summary, /\+2 more/);
    assert.equal(composed.contacts.summary.includes('ACCG contact 7'), false);
    assert.equal(composed.contacts.summary.includes('person8@accg.example'), false);
  });

  it('says contacts=MISSING for a finished empty slice and does not promote candidates', () => {
    const composed = truth(workspace());
    assert.equal(composed.contacts.completeness, 'MISSING');
    assert.equal(composed.contacts.classification, 'MISSING');
    assert.equal(composed.contacts.summary, CONTACTS_MISSING_SENTENCE);
    assert.equal(/contacts=SOURCE_UNAVAILABLE|contacts=INDEXED/.test(composed.contacts.summary), false);
    assert.equal(composed.contacts.summary.includes('ops@accg-inc.example'), false);
    assert.equal(composed.contacts.summary.includes('ACCG kickoff'), false);
    assert.equal(composed.contactCandidates[0]?.email, 'ops@accg-inc.example');
    assert.equal(composed.meetings.completeness, 'INDEXED');
    assert.equal(composed.documents.completeness, 'INDEXED');

    const answer = answerClientOperatingBrief('What contacts exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.match(answer, /contacts=MISSING/);
    assert.match(answer, /does not invent contacts, emails, phones, roles, or meeting attendees/);
    assert.equal(answer.includes('ops@accg-inc.example'), false);
    assert.equal(/contacts=SOURCE_UNAVAILABLE|contacts=INDEXED/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });

  it('keeps an allowlist miss as not queried and not an empty contact list', () => {
    const composed = truth(
      workspace({
        contacts: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', email: 'hidden@accg.example' }],
        },
      }),
    );
    assert.equal(composed.contacts.completeness, 'NOT_CERTIFIED');
    assert.match(composed.contacts.summary, /was not queried/);
    assert.match(composed.contacts.summary, /does not treat that as an empty contact list/);
    assert.match(composed.contacts.summary, /allowlist/);
    assert.equal(/contacts=MISSING|contacts=INDEXED|contacts=SOURCE_UNAVAILABLE|OWNER_DECISION_REQUIRED/.test(composed.contacts.summary), false);
    assert.equal(composed.contacts.summary.includes('Should Not List'), false);
    assert.equal(composed.contacts.summary.includes('hidden@accg.example'), false);
  });

  it('says contacts=SOURCE_UNAVAILABLE and hides partial rows, with page_cap text only when measured', () => {
    const capped = truth(
      workspace({
        contacts: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
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
      }),
    );
    assert.match(capped.contacts.summary, /contacts=SOURCE_UNAVAILABLE/);
    assert.match(capped.contacts.summary, /reason=page_cap/);
    assert.match(capped.contacts.summary, /pagesFetched=80/);
    assert.match(capped.contacts.summary, /OWNER_DECISION_REQUIRED pageCap=80 top=100/);
    assert.match(capped.contacts.summary, /itemsFetched=80/);
    assert.equal(capped.contacts.summary.includes('Hidden Person'), false);
    assert.equal(capped.contacts.summary.includes('hidden@accg.example'), false);
    assert.equal(capped.contacts.summary.includes('555-0100'), false);
    assert.equal(/contacts=MISSING|contacts=INDEXED/.test(capped.contacts.summary), false);
    assert.equal(capped.contactCandidates.some((row) => row.email === 'hidden@accg.example'), false);
    assert.equal(capped.documents.completeness, 'INDEXED');
    assert.equal(capped.meetings.completeness, 'INDEXED');

    const unread = truth(
      workspace({
        contacts: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
          items: [{ id: 'partial', title: 'Hidden Person', clientCode: 'ACCG01', email: 'hidden@accg.example' }],
        },
      }),
    );
    assert.match(unread.contacts.summary, /contacts=SOURCE_UNAVAILABLE/);
    assert.match(unread.contacts.summary, /could not be read/);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|Hidden Person/.test(unread.contacts.summary), false);

    const answer = answerClientOperatingBrief('What contacts exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        contacts: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [{ id: 'partial', title: 'Hidden Person', clientCode: 'ACCG01' }],
        },
      }),
    });
    assert.match(answer, /contacts=SOURCE_UNAVAILABLE/);
    assert.match(answer, /OWNER_DECISION_REQUIRED pageCap=80 top=100/);
    assert.equal(answer.includes('Hidden Person'), false);
    assert.equal(/meetings=|documents=/.test(answer), false);
    assert.match(answer, /canExecute=false/);
  });

  it('places indexed contacts under what Atlas knows and the other states under what Atlas does not know', () => {
    const indexed = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace({ contacts: indexedContacts() }),
    });
    const [knows, unknown] = indexed.split('WHAT ATLAS DOES NOT KNOW');
    assert.match(knows || '', /WHAT ATLAS KNOWS/);
    assert.match(knows || '', /contacts=INDEXED/);
    assert.match(knows || '', /Ada Lovelace <ada@accg\.example>, Founder/);
    assert.match(knows || '', /Grace Hopper \(email not recorded\)/);
    assert.equal((unknown || '').includes('contacts='), false);
    assert.equal((unknown || '').includes('Ada Lovelace'), false);
    assert.equal((unknown || '').includes('ops@accg-inc.example'), false);
    assert.match(indexed, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(indexed, /capitalSubmit=false/);
    assert.match(indexed, /canExecute=false/);

    const missing = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace(),
    });
    const [missingKnows, missingUnknown] = missing.split('WHAT ATLAS DOES NOT KNOW');
    assert.equal(/contacts=INDEXED|Ada Lovelace/.test(missingKnows || ''), false);
    assert.match(missingUnknown || '', /contacts=MISSING/);
    assert.equal((missingUnknown || '').includes('ops@accg-inc.example'), false);

    const notQueried = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace({
        contacts: { queried: false, reason: ALLOWLIST_REASON, items: [] },
      }),
    });
    const notQueriedUnknown = notQueried.split('WHAT ATLAS DOES NOT KNOW')[1] || '';
    assert.match(notQueriedUnknown, /was not queried/);
    assert.equal(/contacts=MISSING|contacts=INDEXED|contacts=SOURCE_UNAVAILABLE/.test(notQueried), false);

    const unavailable = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace({
        contacts: { queried: false, status: 'SOURCE_UNAVAILABLE', reason: READ_FAIL_REASON, items: [] },
      }),
    });
    const unavailableUnknown = unavailable.split('WHAT ATLAS DOES NOT KNOW')[1] || '';
    assert.match(unavailableUnknown, /contacts=SOURCE_UNAVAILABLE/);
    assert.equal(/OWNER_DECISION_REQUIRED|Ada Lovelace/.test(unavailableUnknown), false);
  });

  it('does not change meetings, documents, projects, or capital answers when contacts are indexed', () => {
    const snapshot = workspace({ contacts: indexedContacts() });
    const meetings = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(meetings, /meetings=INDEXED/);
    assert.match(meetings, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(meetings.includes('Ada Lovelace'), false);
    assert.equal(/contacts=INDEXED/.test(meetings), false);

    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(documents, /documents=INDEXED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(documents.includes('ada@accg.example'), false);

    const projects = answerClientOperatingBrief('What projects are active for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(projects, /projects=/);
    assert.equal(projects.includes('ada@accg.example'), false);

    const capital = answerClientOperatingBrief('What is the capital context for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(capital, /capitalContext=/);
    assert.match(capital, /Amounts, lender, and funding status remain unstated/);
    assert.equal(capital.includes('Ada Lovelace'), false);
  });

  it('fail-closes a foreign or unknown ClientCode and does not emit the entitled list', () => {
    const foreign = answerClientOperatingBrief('What contacts exist for PDG01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ contacts: indexedContacts() }),
    });
    assert.match(foreign, /Fail closed/);
    assert.equal(foreign.includes('Ada Lovelace'), false);
    assert.equal(/contacts=INDEXED/.test(foreign), false);

    const unknown = answerClientOperatingBrief('What contacts exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ contacts: indexedContacts() }),
    });
    assert.match(unknown, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unknown.includes('Ada Lovelace'), false);
  });

  it('answers a missing workspace as contacts=SOURCE_UNAVAILABLE without inventing page_cap', () => {
    const answer = contactsIndexUnavailableAnswer('ACCG01');
    assert.match(answer, /contacts=SOURCE_UNAVAILABLE/);
    assert.match(answer, /HVCG_Contacts/);
    assert.equal(/contacts=MISSING|contacts=INDEXED|reason=page_cap|OWNER_DECISION_REQUIRED|documents=|meetings=/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });
});
