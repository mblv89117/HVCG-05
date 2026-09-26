/**
 * W2O ACCG01 deliverables list honesty.
 * Titles come from the ClientCode-matched HVCG_Deliverables slice already on the workspace.
 * The document index and recovered filenames are not this list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeClientTruth,
  DELIVERABLES_LIST_SLICE,
  DELIVERABLES_MISSING_SENTENCE,
  deliverableListLabel,
  deliverablesListAskAtlasSentence,
  workspaceSnapshotFromPayload,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  deliverablesIndexUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Deliverables list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const READ_FAIL_REASON = 'HVCG_Deliverables could not be read. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Deliverables is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_LEAD =
  '2 entitled HVCG_Deliverables row(s). deliverables=INDEXED. Tax return package (accepted); Bookkeeping pack.';
const INDEXED_ANSWER = deliverablesListAskAtlasSentence(INDEXED_LEAD, 'INDEXED', 'CONFIRMED');

function workspace(overrides: Partial<WorkspaceTruthSnapshot> = {}): WorkspaceTruthSnapshot {
  return {
    clientCode: 'ACCG01',
    displayName: 'ACCG Inc.',
    engagementType: 'tax advisory',
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
        },
      ],
    },
    contacts: {
      queried: true,
      status: 'COMPLETE',
      items: [
        {
          id: 'c1',
          title: 'Ada Lovelace',
          clientCode: 'ACCG01',
          email: 'ada@accg.example',
          jobTitle: 'Founder',
        },
      ],
    },
    tasks: [
      {
        id: 't1',
        title: 'File the ACCG return',
        status: 'ready',
        dueDate: '2026-10-02',
        clientCode: 'ACCG01',
      },
    ],
    engagements: { queried: true, status: 'COMPLETE', items: [] },
    deliverables: { queried: true, status: 'COMPLETE', items: [] },
    ...overrides,
  };
}

function indexedDeliverables(): NonNullable<WorkspaceTruthSnapshot['deliverables']> {
  return {
    queried: true,
    status: 'COMPLETE',
    items: [
      {
        id: 'd1',
        title: 'Tax return package',
        clientCode: 'ACCG01',
        status: 'accepted',
        summary: 'Acceptance notes and a fee that are not this list',
        date: '2026-11-01',
        webUrl: 'https://example.invalid/deliverable',
      },
      {
        id: 'd2',
        title: 'Bookkeeping pack',
        clientCode: 'ACCG01',
        status: '   ',
        summary: 'Due date that was not on DeliverableStatus',
      },
      {
        id: 'd-pdg',
        title: 'PDG secret deliverable',
        clientCode: 'PDG01',
        status: 'accepted',
      },
    ],
  };
}

function truth(snapshot?: WorkspaceTruthSnapshot, clientCode = 'ACCG01') {
  const composed = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in composed, false);
  if ('failClosed' in composed) throw new Error('unexpected fail closed');
  return composed;
}

describe('W2O deliverables list honesty', () => {
  it('keeps the list walk budget at page_cap 80 and $top 100 and leaves deliverables on the existing listAll', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
    const repository = readFileSync(join(root, '../src/pm/sharepoint/repository.ts'), 'utf8');
    const fn = repository.slice(
      repository.indexOf('async listWorkspaceCollections('),
      repository.indexOf('async listWorkspaceCollectionsForSearch'),
    );
    assert.match(fn, /load\(this\.settings\.deliverablesListId, 'HVCG_Deliverables'\)/);
    assert.match(fn, /await this\.listAll\(listId\)/);
    assert.equal(fn.includes('readDeliverablesForClient'), false);
    assert.match(repository, /asString\(item\.fields\.DeliverableStatus\)/);
    const unavailable = repository.slice(
      repository.indexOf('private unavailableCollection'),
      repository.indexOf('private combineDecisionsRisks'),
    );
    assert.match(unavailable, /err instanceof ScopedListWalkTruncatedError && err\.reason === 'page_cap'/);
    const authority = readFileSync(
      join(root, '../../../packages/atlas-integration-contracts/src/authority.ts'),
      'utf8',
    );
    assert.match(authority, /GLOBAL_AUTO_RESPOND = false as const/);
    const eliteAuthority = readFileSync(
      join(root, '../../atlas-elite-os/src/policy/globalAutoRespond.ts'),
      'utf8',
    );
    assert.match(eliteAuthority, /GLOBAL_AUTO_RESPOND = false as const/);
    const handle = readFileSync(join(root, '../src/pm/operatorDesk/handle.ts'), 'utf8');
    assert.match(handle, /topic === 'deliverables'/);
    assert.match(handle, /deliverablesIndexUnavailableAnswer\(scoped\)/);
    assert.match(handle, /topic === 'engagements'/);
  });

  it('maps closed deliverables questions and leaves unscoped prompts and sibling topics alone', () => {
    const closed = [
      'What deliverables exist for ACCG01?',
      'What deliverables do we have for ACCG?',
      'What deliverables does ACCG01 have?',
      'List ACCG01 deliverables',
      'List the ACCG01 deliverables',
      'Deliverables list for ACCG01',
    ];
    for (const question of closed) {
      assert.equal(mapsToClientOperatingBriefIntent(question), true, question);
      assert.equal(clientOperatingBriefTopic(question), 'deliverables', question);
    }
    assert.equal(mapsToClientOperatingBriefIntent('What deliverables exist?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('List deliverables'), false);
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('What engagements does ACCG01 have?'), 'engagements');
    assert.equal(clientOperatingBriefTopic('What tasks does ACCG01 have?'), 'tasks');
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(clientOperatingBriefTopic('What contacts exist for ACCG01?'), 'contacts');
    assert.equal(clientOperatingBriefTopic('What are we working on for ACCG01?'), 'working_on');
    assert.equal(clientOperatingBriefTopic('What projects are active for ACCG01?'), 'projects');
    assert.equal(clientOperatingBriefTopic('What is the capital context for ACCG01?'), 'capital');
    assert.equal(clientOperatingBriefTopic('What decisions does ACCG01 have?'), 'owner_decisions');
    assert.equal(clientOperatingBriefTopic('What is blocked for ACCG01?'), 'blocked');
  });

  it('threads extras.deliverables through the snapshot and hides SOURCE_UNAVAILABLE titles', () => {
    const copied = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01', displayName: 'ACCG Inc.' },
      deliverables: indexedDeliverables(),
    });
    assert.equal(copied?.deliverables?.queried, true);
    assert.equal(copied?.deliverables?.items.length, 3);

    const hidden = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01' },
      deliverables: {
        queried: false,
        status: 'SOURCE_UNAVAILABLE',
        reason: PAGE_CAP_REASON,
        items: [{ id: 'partial', title: 'Hidden Deliverable', clientCode: 'ACCG01', status: 'accepted' }],
      },
    });
    assert.equal(hidden?.deliverables?.status, 'SOURCE_UNAVAILABLE');
    assert.equal(hidden?.deliverables?.items.length, 0);
    assert.match(hidden?.deliverables?.reason || '', /reason=page_cap/);
    assert.equal(JSON.stringify(hidden?.deliverables).includes('Hidden Deliverable'), false);
  });

  it('lists entitled titles with status only when present', () => {
    const composed = truth(workspace({ deliverables: indexedDeliverables() }));
    assert.equal(composed.deliverablesList.completeness, 'INDEXED');
    assert.equal(composed.deliverablesList.classification, 'CONFIRMED');
    assert.equal(composed.deliverablesList.summary, INDEXED_LEAD);
    assert.equal(composed.answers.deliverablesExist.text, INDEXED_LEAD);
    assert.equal(composed.deliverablesList.summary.includes('PDG secret deliverable'), false);
    assert.equal(composed.deliverablesList.summary.includes('PDG01'), false);
    assert.equal(composed.deliverablesList.summary.includes('Acceptance notes'), false);
    assert.equal(composed.deliverablesList.summary.includes('2026-11-01'), false);
    assert.equal(composed.deliverablesList.summary.includes('example.invalid'), false);
    assert.equal(composed.deliverablesList.summary.includes('ACCG indexed correspondence'), false);
    assert.equal(
      deliverableListLabel({ title: 'Tax return package', status: 'accepted' }),
      'Tax return package (accepted)',
    );
    assert.equal(deliverableListLabel({ title: 'Bookkeeping pack' }), 'Bookkeeping pack');
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);

    const questions = [
      'What deliverables does ACCG01 have?',
      'What deliverables exist for ACCG01?',
      'List ACCG01 deliverables',
      'List the ACCG01 deliverables',
      'Deliverables list for ACCG01',
      'What deliverables do we have for ACCG?',
    ];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({ deliverables: indexedDeliverables() }),
      });
      assert.equal(answer, INDEXED_ANSWER, question);
      assert.match(answer, /deliverables=INDEXED/);
      assert.match(answer, /Tax return package \(accepted\)/);
      assert.match(answer, /Bookkeeping pack/);
      assert.equal(answer.includes('PDG secret deliverable'), false);
      assert.equal(answer.includes('PDG01'), false);
      assert.equal(answer.includes('Acceptance notes'), false);
      assert.equal(answer.includes('2026-11-01'), false);
      assert.equal(answer.includes('Ada Lovelace'), false);
      assert.equal(answer.includes('ACCG kickoff'), false);
      assert.equal(answer.includes('File the ACCG return'), false);
      assert.equal(answer.includes('ACCG indexed correspondence'), false);
      assert.equal(/contacts=|meetings=|documents=|projects=|tasks=|engagements=|capitalContext=/.test(answer), false);
      assert.match(answer, /The document index is not this list/);
      assert.match(answer, /Recovered filenames are not this list/);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const items = Array.from({ length: DELIVERABLES_LIST_SLICE + 2 }, (_, index) => ({
      id: `d-${index}`,
      title: `ACCG deliverable ${index + 1}`,
      clientCode: 'ACCG01',
      status: index === 0 ? 'accepted' : undefined,
    }));
    const composed = truth(
      workspace({
        deliverables: { queried: true, status: 'COMPLETE', items },
      }),
    );
    assert.equal(composed.deliverablesList.completeness, 'INDEXED');
    assert.match(composed.deliverablesList.summary, /8 entitled HVCG_Deliverables row/);
    assert.match(composed.deliverablesList.summary, /ACCG deliverable 1 \(accepted\)/);
    assert.match(composed.deliverablesList.summary, /ACCG deliverable 6/);
    assert.match(composed.deliverablesList.summary, /\+2 more/);
    assert.equal(composed.deliverablesList.summary.includes('ACCG deliverable 7'), false);
    assert.equal(composed.deliverablesList.summary.includes('ACCG deliverable 8'), false);
  });

  it('says deliverables=MISSING for a finished empty slice and does not invent rows', () => {
    const composed = truth(workspace());
    assert.equal(composed.deliverablesList.completeness, 'MISSING');
    assert.equal(composed.deliverablesList.classification, 'MISSING');
    assert.equal(composed.deliverablesList.summary, DELIVERABLES_MISSING_SENTENCE);
    assert.equal(
      /deliverables=SOURCE_UNAVAILABLE|deliverables=INDEXED|truncated|page_cap|ACCG indexed correspondence/.test(
        composed.deliverablesList.summary,
      ),
      false,
    );

    const answer = answerClientOperatingBrief('What deliverables does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.equal(answer, deliverablesListAskAtlasSentence(DELIVERABLES_MISSING_SENTENCE, 'MISSING', 'MISSING'));
    assert.match(answer, /deliverables=MISSING/);
    assert.match(answer, /deliverables=MISSING\/MISSING/);
    assert.match(answer, /does not invent deliverables, due dates, statuses, or acceptance/);
    assert.match(answer, /The document index is not this list/);
    assert.equal(/deliverables=SOURCE_UNAVAILABLE|deliverables=INDEXED|truncated|page_cap/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });

  it('keeps a missing workspace and an allowlist miss as not queried, not an empty deliverable list', () => {
    const bare = truth(undefined);
    assert.equal(bare.deliverablesList.completeness, 'NOT_CERTIFIED');
    assert.match(bare.deliverablesList.summary, /was not queried/);
    assert.match(bare.deliverablesList.summary, /does not treat that as an empty deliverable list/);
    assert.equal(
      /deliverables=MISSING|deliverables=INDEXED|deliverables=SOURCE_UNAVAILABLE|0 deliverables/.test(
        bare.deliverablesList.summary,
      ),
      false,
    );

    const allowlist = truth(
      workspace({
        deliverables: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'accepted' }],
        },
      }),
    );
    assert.equal(allowlist.deliverablesList.completeness, 'NOT_CERTIFIED');
    assert.match(allowlist.deliverablesList.summary, /was not queried/);
    assert.match(allowlist.deliverablesList.summary, /allowlist/);
    assert.equal(allowlist.deliverablesList.summary.includes('Should Not List'), false);
    assert.equal(
      /deliverables=MISSING|deliverables=INDEXED|deliverables=SOURCE_UNAVAILABLE|OWNER_DECISION_REQUIRED|0 deliverables/.test(
        allowlist.deliverablesList.summary,
      ),
      false,
    );
    const answer = answerClientOperatingBrief('List ACCG01 deliverables', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        deliverables: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'accepted' }],
        },
      }),
    });
    assert.match(answer, /was not queried/);
    assert.equal(answer.includes('Should Not List'), false);
    assert.equal(/deliverables=MISSING|0 deliverables/.test(answer), false);
    assert.match(answer, /deliverables=NOT_CERTIFIED\/NOT_CERTIFIED/);
  });

  it('says deliverables=SOURCE_UNAVAILABLE, hides partial titles, and does not invent OWNER_DECISION_REQUIRED', () => {
    const capped = truth(
      workspace({
        deliverables: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'Hidden Deliverable',
              status: 'accepted',
              clientCode: 'ACCG01',
              date: '2026-12-01',
            },
          ],
        },
      }),
    );
    assert.match(capped.deliverablesList.summary, /deliverables=SOURCE_UNAVAILABLE/);
    assert.match(capped.deliverablesList.summary, /reason=page_cap/);
    assert.match(capped.deliverablesList.summary, /pagesFetched=80/);
    assert.equal(capped.deliverablesList.summary.includes('Hidden Deliverable'), false);
    assert.equal(capped.deliverablesList.summary.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|deliverables=MISSING|deliverables=INDEXED/.test(
        capped.deliverablesList.summary,
      ),
      false,
    );
    assert.equal(capped.contacts.completeness, 'INDEXED');
    assert.equal(capped.meetings.completeness, 'INDEXED');
    assert.equal(capped.tasks.completeness, 'INDEXED');

    const unread = truth(
      workspace({
        deliverables: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
          items: [{ id: 'partial', title: 'Hidden Deliverable', status: 'accepted', clientCode: 'ACCG01' }],
        },
      }),
    );
    assert.match(unread.deliverablesList.summary, /deliverables=SOURCE_UNAVAILABLE/);
    assert.match(unread.deliverablesList.summary, /could not be read/);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|Hidden Deliverable/.test(unread.deliverablesList.summary), false);

    const answer = answerClientOperatingBrief('List ACCG01 deliverables', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        deliverables: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [{ id: 'partial', title: 'Hidden Deliverable', status: 'accepted', clientCode: 'ACCG01' }],
        },
      }),
    });
    assert.match(answer, /deliverables=SOURCE_UNAVAILABLE/);
    assert.match(answer, /deliverables=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /pagesFetched=80/);
    assert.equal(answer.includes('Hidden Deliverable'), false);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|meetings=|documents=|contacts=|tasks=|engagements=/.test(answer), false);
    assert.match(answer, /canExecute=false/);
  });

  it('does not change projects, tasks, contacts, meetings, documents, engagements, capital, finance, or blocked', () => {
    const snapshot = workspace({ deliverables: indexedDeliverables() });
    const working = answerClientOperatingBrief('What are we working on for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(working, /Current\/active projects/);
    assert.match(working, /ACCG operating engagement/);
    assert.equal(/deliverables=INDEXED|deliverables=MISSING|Tax return package/.test(working), false);

    const tasks = answerClientOperatingBrief('What tasks does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(tasks, /tasks=INDEXED/);
    assert.match(tasks, /File the ACCG return \(ready, due 2026-10-02\)/);
    assert.equal(/deliverables=INDEXED|Tax return package/.test(tasks), false);

    const contacts = answerClientOperatingBrief('What contacts exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(contacts, /contacts=INDEXED/);
    assert.match(contacts, /Ada Lovelace <ada@accg\.example>, Founder/);
    assert.equal(/deliverables=INDEXED|Tax return package/.test(contacts), false);

    const meetings = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(meetings, /meetings=INDEXED/);
    assert.match(meetings, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(/deliverables=INDEXED/.test(meetings), false);

    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(documents, /documents=INDEXED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(documents.includes('Tax return package'), false);
    assert.equal(/deliverables=INDEXED/.test(documents), false);

    const engagements = answerClientOperatingBrief('What engagements does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(engagements, /engagements=MISSING/);
    assert.equal(/deliverables=INDEXED|Tax return package/.test(engagements), false);

    const capital = answerClientOperatingBrief('What is the capital context for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(capital, /capitalContext=/);
    assert.match(capital, /Amounts, lender, and funding status remain unstated/);
    assert.equal(/deliverables=INDEXED/.test(capital), false);

    const finance = answerClientOperatingBrief('What is the finance picture for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(finance, /financialContext=/);
    assert.equal(/deliverables=INDEXED|Tax return package \(accepted\)/.test(finance), false);

    const blocked = answerClientOperatingBrief('What is blocked for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.equal(/deliverables=INDEXED|deliverables=MISSING|Tax return package/.test(blocked), false);

    const decisions = answerClientOperatingBrief('What decisions does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.equal(/deliverables=INDEXED|Tax return package/.test(decisions), false);
  });

  it('fail-closes a foreign or unknown ClientCode and does not emit the entitled list', () => {
    const foreign = answerClientOperatingBrief('What deliverables does PDG01 have?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ deliverables: indexedDeliverables() }),
    });
    assert.match(foreign, /Fail closed/);
    assert.equal(foreign.includes('Tax return package'), false);
    assert.equal(/deliverables=INDEXED/.test(foreign), false);

    const unknown = answerClientOperatingBrief('What deliverables exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
    });
    assert.match(unknown, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unknown.includes('Tax return package'), false);
  });

  it('answers a missing workspace as deliverables=SOURCE_UNAVAILABLE without inventing page_cap', () => {
    const answer = deliverablesIndexUnavailableAnswer('ACCG01');
    assert.equal(
      answer,
      'Atlas cannot read the current ACCG01 deliverable list (HVCG_Deliverables). deliverables=SOURCE_UNAVAILABLE. Atlas will not invent deliverables, due dates, statuses, or acceptance. Partial rows are not the deliverable list. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.',
    );
    assert.equal(
      /deliverables=MISSING|deliverables=INDEXED|reason=page_cap|OWNER_DECISION_REQUIRED|pageCap=80|documents=|meetings=|contacts=|tasks=|engagements=|0 deliverables/.test(
        answer,
      ),
      false,
    );
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });
});
