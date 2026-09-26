/**
 * W2N ACCG01 engagements list honesty.
 * Titles come from the ClientCode-matched HVCG_Engagements slice already on the workspace.
 * answers.engagement and the my-business composite stay the prior clause.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeClientTruth,
  ENGAGEMENTS_LIST_SLICE,
  ENGAGEMENTS_MISSING_SENTENCE,
  engagementListLabel,
  engagementsListAskAtlasSentence,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  engagementsIndexUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Engagements list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const READ_FAIL_REASON = 'HVCG_Engagements could not be read. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Engagements is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_LEAD =
  '2 entitled HVCG_Engagements row(s). engagements=INDEXED. Tax advisory (active); Bookkeeping.';
const INDEXED_ANSWER = engagementsListAskAtlasSentence(INDEXED_LEAD, 'INDEXED', 'CONFIRMED');

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
    ...overrides,
  };
}

function indexedEngagements(): NonNullable<WorkspaceTruthSnapshot['engagements']> {
  return {
    queried: true,
    status: 'COMPLETE',
    items: [
      {
        id: 'e1',
        title: 'Tax advisory',
        clientCode: 'ACCG01',
        status: 'active',
        summary: 'Signed SOW obligating fees and a delivery date',
        webUrl: 'https://example.invalid/sow',
      },
      {
        id: 'e2',
        title: 'Bookkeeping',
        clientCode: 'ACCG01',
        status: '   ',
        summary: 'Background that is not an obligation',
      },
      {
        id: 'e-pdg',
        title: 'PDG secret engagement',
        clientCode: 'PDG01',
        status: 'active',
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

describe('W2N engagements list honesty', () => {
  it('keeps the list walk budget at page_cap 80 and $top 100 and leaves engagements on unscoped listAll', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
    const repository = readFileSync(join(root, '../src/pm/sharepoint/repository.ts'), 'utf8');
    const fn = repository.slice(
      repository.indexOf('async listWorkspaceCollections('),
      repository.indexOf('async listWorkspaceCollectionsForSearch'),
    );
    assert.match(fn, /load\(this\.settings\.engagementsListId, 'HVCG_Engagements'\)/);
    assert.match(fn, /await this\.listAll\(listId\)/);
    assert.match(fn, /listName === 'HVCG_Meetings'/);
    assert.equal(fn.includes('indexedClientCode'), false);
    assert.equal(fn.includes('readEngagementsForClient'), false);
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
    assert.match(handle, /topic === 'engagements'/);
    assert.match(handle, /engagementsIndexUnavailableAnswer\(scoped\)/);
    assert.match(handle, /topic === 'tasks'/);
  });

  it('maps a closed engagements question and leaves tasks, projects, and my business alone', () => {
    assert.equal(mapsToClientOperatingBriefIntent('What engagements does ACCG01 have?'), true);
    assert.equal(clientOperatingBriefTopic('What engagements does ACCG01 have?'), 'engagements');
    assert.equal(mapsToClientOperatingBriefIntent('What engagements exist for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What engagements exist for ACCG01?'), 'engagements');
    assert.equal(mapsToClientOperatingBriefIntent('List ACCG01 engagements'), true);
    assert.equal(clientOperatingBriefTopic('List ACCG01 engagements'), 'engagements');
    assert.equal(mapsToClientOperatingBriefIntent('What engagements exist?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('List engagements'), false);
    assert.equal(clientOperatingBriefTopic('What engagement do we have?'), null);
    assert.equal(clientOperatingBriefTopic('What tasks does ACCG01 have?'), 'tasks');
    assert.equal(clientOperatingBriefTopic('What are we working on for ACCG01?'), 'working_on');
    assert.equal(clientOperatingBriefTopic('My business for ACCG01'), 'my_business');
    assert.equal(clientOperatingBriefTopic('What contacts exist for ACCG01?'), 'contacts');
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('What projects are active for ACCG01?'), 'projects');
    assert.equal(clientOperatingBriefTopic('What is the capital context for ACCG01?'), 'capital');
    assert.equal(clientOperatingBriefTopic('What is the finance picture for ACCG01?'), 'finance');
    assert.equal(clientOperatingBriefTopic('What is blocked for ACCG01?'), 'blocked');
  });

  it('lists entitled titles with status only when present and keeps answers.engagement as the count clause', () => {
    const composed = truth(workspace({ engagements: indexedEngagements() }));
    assert.equal(composed.engagementsList.completeness, 'INDEXED');
    assert.equal(composed.engagementsList.classification, 'CONFIRMED');
    assert.equal(composed.engagementsList.summary, INDEXED_LEAD);
    assert.equal(composed.answers.engagementsExist.text, INDEXED_LEAD);
    assert.equal(composed.answers.engagement.text, '3 entitled HVCG_Engagements row(s).');
    assert.equal(composed.engagements.summary, composed.answers.engagement.text);
    assert.equal(composed.engagements.completeness, 'PARTIAL');
    assert.equal(composed.engagementsList.summary.includes('PDG secret engagement'), false);
    assert.equal(composed.engagementsList.summary.includes('PDG01'), false);
    assert.equal(composed.engagementsList.summary.includes('Signed SOW'), false);
    assert.equal(composed.engagementsList.summary.includes('Background that'), false);
    assert.equal(composed.engagementsList.summary.includes('example.invalid'), false);
    assert.equal(composed.engagementsList.summary.includes('tax advisory'), false);
    assert.equal(
      engagementListLabel({ title: 'Tax advisory', status: 'active' }),
      'Tax advisory (active)',
    );
    assert.equal(engagementListLabel({ title: 'Bookkeeping' }), 'Bookkeeping');
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);

    const questions = [
      'What engagements does ACCG01 have?',
      'What engagements exist for ACCG01?',
      'List ACCG01 engagements',
    ];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({ engagements: indexedEngagements() }),
      });
      assert.equal(answer, INDEXED_ANSWER);
      assert.match(answer, /engagements=INDEXED/);
      assert.match(answer, /Tax advisory \(active\)/);
      assert.match(answer, /Bookkeeping/);
      assert.equal(answer.includes('PDG secret engagement'), false);
      assert.equal(answer.includes('PDG01'), false);
      assert.equal(answer.includes('Signed SOW'), false);
      assert.equal(answer.includes('Ada Lovelace'), false);
      assert.equal(answer.includes('ACCG kickoff'), false);
      assert.equal(answer.includes('File the ACCG return'), false);
      assert.equal(/contacts=|meetings=|documents=|projects=|tasks=|capitalContext=/.test(answer), false);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
      assert.match(answer, /EngagementTypePrimary on HVCG_Clients is not this list/);
      assert.match(answer, /Recovered engagement\/agreement filenames are not this list/);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const items = Array.from({ length: ENGAGEMENTS_LIST_SLICE + 2 }, (_, index) => ({
      id: `e-${index}`,
      title: `ACCG engagement ${index + 1}`,
      clientCode: 'ACCG01',
      status: index === 0 ? 'active' : undefined,
    }));
    const composed = truth(
      workspace({
        engagements: { queried: true, status: 'COMPLETE', items },
      }),
    );
    assert.equal(composed.engagementsList.completeness, 'INDEXED');
    assert.match(composed.engagementsList.summary, /8 entitled HVCG_Engagements row/);
    assert.match(composed.engagementsList.summary, /ACCG engagement 1 \(active\)/);
    assert.match(composed.engagementsList.summary, /ACCG engagement 6/);
    assert.match(composed.engagementsList.summary, /\+2 more/);
    assert.equal(composed.engagementsList.summary.includes('ACCG engagement 7'), false);
    assert.equal(composed.engagementsList.summary.includes('ACCG engagement 8'), false);
    assert.equal(composed.answers.engagement.text, '8 entitled HVCG_Engagements row(s).');
  });

  it('says engagements=MISSING for a finished empty slice and keeps EngagementTypePrimary on the my-business clause', () => {
    const composed = truth(workspace());
    assert.equal(composed.engagementsList.completeness, 'MISSING');
    assert.equal(composed.engagementsList.classification, 'MISSING');
    assert.equal(composed.engagementsList.summary, ENGAGEMENTS_MISSING_SENTENCE);
    assert.equal(
      /engagements=SOURCE_UNAVAILABLE|engagements=INDEXED|truncated|page_cap|Access Plus|SCOPE OF WORK/.test(
        composed.engagementsList.summary,
      ),
      false,
    );
    assert.equal(
      composed.answers.engagement.text,
      'EngagementTypePrimary on HVCG_Clients is tax advisory. No entitled engagement rows.',
    );
    assert.equal(composed.engagements.completeness, 'PARTIAL');
    assert.equal(composed.answers.engagement.text.includes('engagements=MISSING'), false);

    const answer = answerClientOperatingBrief('What engagements does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.equal(answer, engagementsListAskAtlasSentence(ENGAGEMENTS_MISSING_SENTENCE, 'MISSING', 'MISSING'));
    assert.match(answer, /engagements=MISSING/);
    assert.match(answer, /does not invent engagements, scopes, fees, dates, or obligations/);
    assert.match(answer, /EngagementTypePrimary on HVCG_Clients is not this list/);
    assert.equal(/engagements=SOURCE_UNAVAILABLE|engagements=INDEXED|tax advisory/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);

    const business = answerClientOperatingBrief('What is the My Business picture for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.match(business, /EngagementTypePrimary on HVCG_Clients is tax advisory/);
    assert.match(business, /No entitled engagement rows/);
    assert.equal(business.includes('engagements=MISSING'), false);
    assert.equal(business.includes('does not invent engagements, scopes'), false);
    assert.match(business, /writePolicy=read_only/);
  });

  it('keeps a missing workspace and an allowlist miss as not queried, not an empty engagement list', () => {
    const bare = truth(undefined);
    assert.equal(bare.engagementsList.completeness, 'NOT_CERTIFIED');
    assert.match(bare.engagementsList.summary, /was not queried/);
    assert.match(bare.engagementsList.summary, /does not treat that as an empty engagement list/);
    assert.equal(
      /engagements=MISSING|engagements=INDEXED|engagements=SOURCE_UNAVAILABLE|Access Plus|SCOPE OF WORK/.test(
        bare.engagementsList.summary,
      ),
      false,
    );
    assert.match(
      bare.answers.engagement.text,
      /Recovered engagement\/agreement filenames exist|No entitled engagement rows/,
    );
    assert.equal(bare.answers.engagement.text.includes('was not queried'), false);

    const allowlist = truth(
      workspace({
        engagementType: undefined,
        engagements: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'active' }],
        },
      }),
    );
    assert.equal(allowlist.engagementsList.completeness, 'NOT_CERTIFIED');
    assert.match(allowlist.engagementsList.summary, /was not queried/);
    assert.match(allowlist.engagementsList.summary, /allowlist/);
    assert.equal(allowlist.engagementsList.summary.includes('Should Not List'), false);
    assert.equal(
      /engagements=MISSING|engagements=INDEXED|engagements=SOURCE_UNAVAILABLE|OWNER_DECISION_REQUIRED/.test(
        allowlist.engagementsList.summary,
      ),
      false,
    );
    const answer = answerClientOperatingBrief('List ACCG01 engagements', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        engagements: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', status: 'active' }],
        },
      }),
    });
    assert.match(answer, /was not queried/);
    assert.equal(answer.includes('Should Not List'), false);
    assert.equal(/engagements=MISSING|0 engagements/.test(answer), false);
    assert.match(answer, /engagements=NOT_CERTIFIED\/NOT_CERTIFIED/);
  });

  it('says engagements=SOURCE_UNAVAILABLE, hides partial titles, and does not invent OWNER_DECISION_REQUIRED', () => {
    const capped = truth(
      workspace({
        engagements: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'Hidden Engagement',
              status: 'active',
              clientCode: 'ACCG01',
              summary: 'Invented scope',
            },
          ],
        },
      }),
    );
    assert.match(capped.engagementsList.summary, /engagements=SOURCE_UNAVAILABLE/);
    assert.match(capped.engagementsList.summary, /reason=page_cap/);
    assert.match(capped.engagementsList.summary, /pagesFetched=80/);
    assert.equal(capped.engagementsList.summary.includes('Hidden Engagement'), false);
    assert.equal(capped.engagementsList.summary.includes('Invented scope'), false);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|engagements=MISSING|engagements=INDEXED/.test(capped.engagementsList.summary), false);
    assert.equal(
      capped.answers.engagement.text,
      'HVCG_Engagements walk did not complete. engagements=SOURCE_UNAVAILABLE. Atlas does not invent engagements.',
    );
    assert.equal(capped.answers.engagement.text.includes('Hidden Engagement'), false);
    assert.equal(capped.answers.engagement.text.includes('Partial rows'), false);
    assert.equal(capped.contacts.completeness, 'INDEXED');
    assert.equal(capped.meetings.completeness, 'INDEXED');
    assert.equal(capped.tasks.completeness, 'INDEXED');

    const unread = truth(
      workspace({
        engagements: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
          items: [{ id: 'partial', title: 'Hidden Engagement', status: 'active', clientCode: 'ACCG01' }],
        },
      }),
    );
    assert.match(unread.engagementsList.summary, /engagements=SOURCE_UNAVAILABLE/);
    assert.match(unread.engagementsList.summary, /could not be read/);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|Hidden Engagement/.test(unread.engagementsList.summary), false);

    const answer = answerClientOperatingBrief('List ACCG01 engagements', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        engagements: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [{ id: 'partial', title: 'Hidden Engagement', status: 'active', clientCode: 'ACCG01' }],
        },
      }),
    });
    assert.match(answer, /engagements=SOURCE_UNAVAILABLE/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /pagesFetched=80/);
    assert.equal(answer.includes('Hidden Engagement'), false);
    assert.equal(/OWNER_DECISION_REQUIRED|meetings=|documents=|contacts=|tasks=/.test(answer), false);
    assert.match(answer, /canExecute=false/);
  });

  it('does not change projects, tasks, contacts, meetings, documents, capital, finance, or drawer phrases', () => {
    const snapshot = workspace({ engagements: indexedEngagements() });
    const working = answerClientOperatingBrief('What are we working on for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(working, /Current\/active projects/);
    assert.match(working, /ACCG operating engagement/);
    assert.equal(/engagements=INDEXED|engagements=MISSING|Tax advisory/.test(working), false);

    const tasks = answerClientOperatingBrief('What tasks does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(tasks, /tasks=INDEXED/);
    assert.match(tasks, /File the ACCG return \(ready, due 2026-10-02\)/);
    assert.equal(/engagements=INDEXED|Tax advisory/.test(tasks), false);

    const contacts = answerClientOperatingBrief('What contacts exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(contacts, /contacts=INDEXED/);
    assert.match(contacts, /Ada Lovelace <ada@accg\.example>, Founder/);
    assert.equal(/engagements=INDEXED|Tax advisory/.test(contacts), false);

    const meetings = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(meetings, /meetings=INDEXED/);
    assert.match(meetings, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(/engagements=INDEXED/.test(meetings), false);

    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(documents, /documents=INDEXED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(documents.includes('Tax advisory'), false);

    const capital = answerClientOperatingBrief('What is the capital context for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(capital, /capitalContext=/);
    assert.match(capital, /Amounts, lender, and funding status remain unstated/);
    assert.equal(/engagements=INDEXED/.test(capital), false);

    const finance = answerClientOperatingBrief('What is the finance picture for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(finance, /financialContext=/);
    assert.equal(/engagements=INDEXED|Tax advisory \(active\)/.test(finance), false);

    const blocked = answerClientOperatingBrief('What is blocked for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.equal(/engagements=INDEXED|engagements=MISSING|Tax advisory/.test(blocked), false);
  });

  it('fail-closes a foreign or unknown ClientCode and does not emit the entitled list', () => {
    const foreign = answerClientOperatingBrief('What engagements does PDG01 have?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ engagements: indexedEngagements() }),
    });
    assert.match(foreign, /Fail closed/);
    assert.equal(foreign.includes('Tax advisory'), false);
    assert.equal(/engagements=INDEXED/.test(foreign), false);

    const unknown = answerClientOperatingBrief('What engagements exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
    });
    assert.match(unknown, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unknown.includes('Tax advisory'), false);
  });

  it('answers a missing workspace as engagements=SOURCE_UNAVAILABLE without inventing page_cap', () => {
    const answer = engagementsIndexUnavailableAnswer('ACCG01');
    assert.match(answer, /engagements=SOURCE_UNAVAILABLE/);
    assert.match(answer, /HVCG_Engagements/);
    assert.equal(
      /engagements=MISSING|engagements=INDEXED|reason=page_cap|OWNER_DECISION_REQUIRED|documents=|meetings=|contacts=|tasks=/.test(
        answer,
      ),
      false,
    );
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /EngagementTypePrimary is not this list/);
  });
});
