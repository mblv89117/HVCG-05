/**
 * W2Q ACCG01 communications list honesty.
 * Thread rows already on HVCG_Communications. File-index rows stay the document index.
 * The certified communications= operating-brief line is not rewritten.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperatingHygieneToWorkspaceSnapshot,
  COMMUNICATIONS_LIST_MISSING_SENTENCE,
  COMMUNICATIONS_LIST_SLICE,
  communicationsListAskAtlasSentence,
  communicationsListLabel,
  composeClientTruth,
  workspaceSnapshotFromPayload,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import { extractAttentionIntent, extractSearchAuthorizedQuery } from '../src/pm/operatorDesk/agentRuntime.ts';
import { extractClientScopedAttentionQuery } from '../src/pm/operatorDesk/askAtlasScope.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  communicationsListIndexUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import {
  mapsToCommunicationContextIntent,
  mapsToOnboardingContextIntent,
} from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { mapsToCommunicationPolicyIntent } from '../src/pm/operatorDesk/communicationPolicyCenter.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Communications list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const READ_FAIL_REASON = 'HVCG_Communications could not be read. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Communications is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_LEAD =
  '2 entitled HVCG_Communications thread row(s). communicationsList=INDEXED. Kickoff note (email, inbound, 2026-09-02); Scope question.';
const INDEXED_ANSWER = communicationsListAskAtlasSentence(INDEXED_LEAD, 'INDEXED', 'CONFIRMED');

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
    decisionsRisks: { queried: true, status: 'COMPLETE', items: [] },
    ...overrides,
  };
}

function indexedCommunications(): NonNullable<WorkspaceTruthSnapshot['communications']> {
  return {
    queried: true,
    status: 'COMPLETE',
    items: [
      {
        id: 'thread-1',
        title: 'Kickoff note',
        clientCode: 'ACCG01',
        entityType: 'communication',
        sourceList: 'HVCG_Communications',
        channel: 'email',
        direction: 'inbound',
        date: '2026-09-02',
        status: 'sent',
        summary: 'Message body that is not this list',
        webUrl: 'https://example.invalid/thread',
      },
      {
        id: 'thread-2',
        title: 'Scope question',
        clientCode: 'ACCG01',
        entityType: 'communication',
        sourceList: 'HVCG_Communications',
        channel: '   ',
        direction: '',
        status: 'draft',
      },
      {
        id: 'file-summary',
        title: 'ACCG indexed correspondence.pdf',
        clientCode: 'ACCG01',
        summary: 'File metadata index',
        sourceItemId: 'file:drive-item',
        channel: 'email',
        date: '2026-08-01',
      },
      {
        id: 'file-restricted',
        title: 'Restricted memo.pdf',
        clientCode: 'ACCG01',
        summary: 'RESTRICTED — metadata and source link only',
      },
      {
        id: 'file-src',
        title: 'Source-link only.pdf',
        clientCode: 'ACCG01',
        sourceItemId: 'file:source-only',
      },
      {
        id: 'thread-pdg',
        title: 'PDG secret thread',
        clientCode: 'PDG01',
        channel: 'email',
        direction: 'outbound',
        date: '2026-09-04',
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

describe('W2Q communications list honesty', () => {
  it('keeps the list walk budget, the file-index markers, and the certified communications= line', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
    const repository = readFileSync(join(root, '../src/pm/sharepoint/repository.ts'), 'utf8');
    const fn = repository.slice(
      repository.indexOf('async listWorkspaceCollections('),
      repository.indexOf('async listWorkspaceCollectionsForSearch'),
    );
    assert.match(fn, /load\(this\.settings\.communicationsListId, 'HVCG_Communications'\)/);
    assert.match(fn, /await this\.listAll\(listId\)/);
    const fileIndex = readFileSync(join(root, '../src/pm/sharepoint/fabric/fileIndex.ts'), 'utf8');
    assert.match(fileIndex, /summary\.includes\(FILE_INDEX_MARKER\)/);
    assert.match(fileIndex, /summary\.includes\(FILE_RESTRICTED_MARKER\)/);
    assert.match(fileIndex, /src\.startsWith\('file:'\)/);
    const authority = readFileSync(
      join(root, '../../../packages/atlas-integration-contracts/src/authority.ts'),
      'utf8',
    );
    assert.match(authority, /GLOBAL_AUTO_RESPOND = false as const/);
    const handle = readFileSync(join(root, '../src/pm/operatorDesk/handle.ts'), 'utf8');
    assert.match(handle, /topic === 'communications_list'/);
    assert.match(handle, /communicationsListIndexUnavailableAnswer\(scoped\)/);
    const failed = handle.slice(
      handle.indexOf('if (workspaceFailed && scoped)'),
      handle.indexOf('} else if (fileIndexUnavailable && scoped'),
    );
    const commBranch = failed.slice(
      failed.indexOf("topic === 'communications_list'"),
      failed.indexOf("topic === 'approvals'"),
    );
    assert.match(commBranch, /communicationsListIndexUnavailableAnswer\(scoped\)/);
    assert.equal(commBranch.includes('documentIndexUnavailableAnswer'), false);
    const documentsBranch = handle.slice(
      handle.indexOf('} else if (fileIndexUnavailable && scoped'),
      handle.indexOf('briefAnswer = answerClientOperatingBrief'),
    );
    assert.equal(documentsBranch.includes('communications_list'), false);
    assert.match(documentsBranch, /documentIndexUnavailableAnswer/);
    const brief = readFileSync(join(root, '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts'), 'utf8');
    const documentsAt = brief.indexOf("topic: 'documents'");
    const communicationsAt = brief.indexOf("topic: 'communications_list'");
    const meetingsAt = brief.indexOf("topic: 'meetings'");
    assert.ok(documentsAt > 0 && communicationsAt > documentsAt && communicationsAt < meetingsAt);
    assert.match(brief, /communications=\$\{truth\.communications\.completeness\}/);
    assert.match(brief, /\(\?!.*\\b\(\?:onboarding\|policy\)\\b\)/);
    assert.match(brief, /\(\?!.*\\bcommunication context\\b\)/);
  });

  it('maps closed list questions and leaves collisions and unscoped prompts alone', () => {
    const closed = [
      'What communications exist for ACCG01?',
      'What communications do we have for ACCG?',
      'What communications does ACCG01 have?',
      'What communications do ACCG01 have?',
      'List ACCG01 communications',
      'List the ACCG01 communications',
      'List the communications for ACCG01',
      'Communications list for ACCG01',
      'What is the communications list for ACCG01?',
      'communications picture for ACCG01',
      'communications inventory for ACCG01',
    ];
    for (const question of closed) {
      assert.equal(mapsToClientOperatingBriefIntent(question), true, question);
      assert.equal(clientOperatingBriefTopic(question), 'communications_list', question);
    }

    for (const question of ['What communications exist?', 'List communications', 'Communications list']) {
      assert.equal(mapsToClientOperatingBriefIntent(question), false, question);
      assert.equal(clientOperatingBriefTopic(question), 'communications_list', question);
    }

    assert.equal(clientOperatingBriefTopic('What documents does ACCG01 have?'), 'documents');
    assert.equal(clientOperatingBriefTopic('List ACCG01 documents'), 'documents');
    assert.equal(clientOperatingBriefTopic('What documents do we have for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('List ACCG01 documents and communications'), 'documents');
    assert.equal(mapsToClientOperatingBriefIntent('List ACCG01 documents and communications'), true);

    assert.equal(clientOperatingBriefTopic('Communication policy for ACCG01'), null);
    assert.equal(mapsToClientOperatingBriefIntent('Communication policy for ACCG01'), false);
    assert.equal(mapsToCommunicationPolicyIntent('Communication policy for ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('What is the communication policy for ACCG01?'), null);
    assert.equal(mapsToCommunicationPolicyIntent('What is the communication policy for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('comms policy for ACCG01'), null);
    assert.equal(mapsToCommunicationPolicyIntent('comms policy for ACCG01'), true);

    assert.equal(clientOperatingBriefTopic('communications policy for ACCG01'), null);
    assert.equal(mapsToClientOperatingBriefIntent('communications policy for ACCG01'), false);
    assert.equal(mapsToCommunicationPolicyIntent('communications policy for ACCG01'), false);

    assert.equal(clientOperatingBriefTopic('What is the onboarding communication context for ACCG?'), null);
    assert.equal(mapsToCommunicationContextIntent('What is the onboarding communication context for ACCG?'), true);
    assert.equal(mapsToOnboardingContextIntent('What is the onboarding communication context for ACCG?'), true);
    assert.equal(clientOperatingBriefTopic('onboarding communications for ACCG01'), null);
    assert.equal(mapsToOnboardingContextIntent('onboarding communications for ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('List onboarding communications for ACCG01'), null);
    assert.equal(mapsToOnboardingContextIntent('List onboarding communications for ACCG01'), true);

    assert.equal(clientOperatingBriefTopic('Search ACCG01 communications'), null);
    assert.equal(extractSearchAuthorizedQuery('Search ACCG01 communications'), 'ACCG01 communications');

    assert.equal(clientOperatingBriefTopic('What changed recently for ACCG01?'), 'changed');
    assert.equal(extractClientScopedAttentionQuery('What changed recently for ACCG01?')?.clientToken, 'ACCG01');
    assert.equal(clientOperatingBriefTopic('What changed?'), 'changed');
    const changedAttention = extractAttentionIntent('What changed?');
    assert.ok(changedAttention);
    assert.equal(changedAttention?.filterState, undefined);

    assert.equal(clientOperatingBriefTopic('approvals brief for ACCG01'), 'approvals');
    assert.equal(mapsToClientOperatingBriefIntent('approvals brief for ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('What decisions does ACCG01 have?'), 'owner_decisions');
    assert.equal(mapsToClientOperatingBriefIntent('What decisions does ACCG01 have?'), true);

    for (const question of [
      'What communication does ACCG01 have?',
      'List ACCG01 communication',
      'What threads does ACCG01 have?',
      'Show me communications for ACCG01',
    ]) {
      assert.equal(clientOperatingBriefTopic(question), null, question);
      assert.equal(mapsToClientOperatingBriefIntent(question), false, question);
    }
  });

  it('keeps file-index rows on the communications section and hides them from the thread sentence', () => {
    const section = indexedCommunications();
    const copied = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01', displayName: 'ACCG Inc.' },
      communications: section,
    });
    assert.equal(copied?.communications?.items.length, section.items.length);
    assert.equal(JSON.stringify(copied?.communications).includes('ACCG indexed correspondence.pdf'), true);

    const hygienic = applyOperatingHygieneToWorkspaceSnapshot(workspace({ communications: section }));
    assert.equal(hygienic?.communications?.items.length, section.items.length);
  });

  it('lists entitled thread titles and leaves file-index rows, status, and message text off the sentence', () => {
    const composed = truth(workspace({ communications: indexedCommunications() }));
    assert.equal(composed.communicationsList.completeness, 'INDEXED');
    assert.equal(composed.communicationsList.classification, 'CONFIRMED');
    assert.equal(composed.communicationsList.summary, INDEXED_LEAD);
    assert.equal(composed.answers.communicationsListExist.text, INDEXED_LEAD);
    assert.equal(composed.communications.completeness, 'INDEXED');
    assert.equal(composed.communications.summary, '6 entitled communication index row(s).');
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.match(composed.documents.summary, /ACCG indexed correspondence\.pdf/);
    assert.equal(composed.communicationsList.summary.includes('ACCG indexed correspondence'), false);
    assert.equal(composed.communicationsList.summary.includes('Restricted memo'), false);
    assert.equal(composed.communicationsList.summary.includes('Source-link only'), false);
    assert.equal(composed.communicationsList.summary.includes('PDG secret thread'), false);
    assert.equal(composed.communicationsList.summary.includes('Message body'), false);
    assert.equal(composed.communicationsList.summary.includes('example.invalid'), false);
    assert.equal(composed.communicationsList.summary.includes('sent'), false);
    assert.equal(composed.communicationsList.summary.includes('draft'), false);
    assert.equal(
      communicationsListLabel({
        title: 'Kickoff note',
        channel: 'email',
        direction: 'inbound',
        date: '2026-09-02',
      }),
      'Kickoff note (email, inbound, 2026-09-02)',
    );
    assert.equal(communicationsListLabel({ title: 'Scope question' }), 'Scope question');
    assert.equal(
      communicationsListLabel({ title: 'Follow up', date: '2026-09-03' }),
      'Follow up (2026-09-03)',
    );
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);
    assert.match(composed.answers.ownerApproval.text, /External client communications remain unsent drafts/);
    assert.equal(composed.answers.ownerApproval.text.includes('communicationsList='), false);
    assert.equal(composed.answers.changed.text.includes('communicationsList='), false);

    const questions = [
      'What communications exist for ACCG01?',
      'What communications do we have for ACCG?',
      'What communications does ACCG01 have?',
      'What communications do ACCG01 have?',
      'List ACCG01 communications',
      'List the ACCG01 communications',
      'List the communications for ACCG01',
      'Communications list for ACCG01',
      'What is the communications list for ACCG01?',
      'communications picture for ACCG01',
      'communications inventory for ACCG01',
    ];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({ communications: indexedCommunications() }),
      });
      assert.equal(answer, INDEXED_ANSWER, question);
      assert.match(answer, /communicationsList=INDEXED/);
      assert.match(answer, /communicationsList=INDEXED\/CONFIRMED/);
      assert.match(answer, /Kickoff note \(email, inbound, 2026-09-02\)/);
      assert.match(answer, /Scope question/);
      assert.equal(answer.includes('ACCG indexed correspondence'), false);
      assert.equal(answer.includes('PDG secret thread'), false);
      assert.equal(answer.includes('Message body'), false);
      assert.equal(answer.includes('Ada Lovelace'), false);
      assert.equal(answer.includes('ACCG kickoff'), false);
      assert.equal(/communications=/.test(answer), false);
      assert.match(answer, /File-index rows are the document index/);
      assert.match(answer, /The workspace timeline is not this list/);
      assert.match(answer, /does not invent threads, recipients, channels, direction, sent times, or message text/);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
      assert.equal(/0 communications|was not queried|communicationsList=MISSING|communicationsList=SOURCE_UNAVAILABLE/.test(answer), false);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const items = Array.from({ length: COMMUNICATIONS_LIST_SLICE + 2 }, (_, index) => ({
      id: `t-${index}`,
      title: `ACCG thread ${index + 1}`,
      clientCode: 'ACCG01',
      channel: index === 0 ? 'email' : undefined,
    }));
    const composed = truth(
      workspace({
        communications: { queried: true, status: 'COMPLETE', items },
      }),
    );
    assert.equal(composed.communicationsList.completeness, 'INDEXED');
    assert.match(composed.communicationsList.summary, /8 entitled HVCG_Communications thread row/);
    assert.match(composed.communicationsList.summary, /ACCG thread 1 \(email\)/);
    assert.match(composed.communicationsList.summary, /ACCG thread 6/);
    assert.match(composed.communicationsList.summary, /\+2 more/);
    assert.equal(composed.communicationsList.summary.includes('ACCG thread 7'), false);
    assert.equal(composed.communicationsList.summary.includes('ACCG thread 8'), false);
    assert.equal(composed.communications.summary, '8 entitled communication index row(s).');
  });

  it('says communicationsList=MISSING for a file-index-only section while communications and documents stay', () => {
    const fileIndexOnly = workspace({
      communications: {
        queried: true,
        status: 'COMPLETE',
        items: [
          {
            id: 'file-summary',
            title: 'ACCG indexed correspondence.pdf',
            clientCode: 'ACCG01',
            summary: 'File metadata index',
            sourceItemId: 'file:drive-item',
            channel: 'email',
            date: '2026-08-01',
          },
          {
            id: 'file-restricted',
            title: 'Restricted memo.pdf',
            clientCode: 'ACCG01',
            summary: 'RESTRICTED — metadata and source link only',
          },
          {
            id: 'file-src',
            title: 'Source-link only.pdf',
            clientCode: 'ACCG01',
            sourceItemId: 'file:source-only',
          },
        ],
      },
    });
    const composed = truth(fileIndexOnly);
    assert.equal(composed.communicationsList.completeness, 'MISSING');
    assert.equal(composed.communicationsList.classification, 'MISSING');
    assert.equal(composed.communicationsList.summary, COMMUNICATIONS_LIST_MISSING_SENTENCE);
    assert.equal(composed.communications.completeness, 'INDEXED');
    assert.equal(composed.communications.classification, 'CONFIRMED');
    assert.equal(composed.communications.summary, '3 entitled communication index row(s).');
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.equal(composed.documents.classification, 'CONFIRMED');
    assert.equal(
      composed.documents.summary,
      '1 entitled HVCG_Communications/file-index row(s). Current index: ACCG indexed correspondence.pdf. Binaries remain in M365.',
    );
    assert.equal(composed.communicationsList.summary.includes('ACCG indexed correspondence'), false);
    assert.equal(composed.communicationsList.summary.includes('Restricted memo'), false);
    assert.equal(composed.communicationsList.summary.includes('Source-link only'), false);
    assert.equal(
      /communicationsList=SOURCE_UNAVAILABLE|communicationsList=INDEXED|truncated|page_cap|was not queried|0 communications/.test(
        composed.communicationsList.summary,
      ),
      false,
    );
    assert.equal(composed.operatingPosture, 'ACTIVE_CLIENT_CONTEXT_RECOVERY');

    const answer = answerClientOperatingBrief('List ACCG01 communications', {
      entitledCodes: ['ACCG01'],
      workspace: fileIndexOnly,
    });
    assert.equal(
      answer,
      communicationsListAskAtlasSentence(COMMUNICATIONS_LIST_MISSING_SENTENCE, 'MISSING', 'MISSING'),
    );
    assert.match(answer, /communicationsList=MISSING/);
    assert.match(answer, /communicationsList=MISSING\/MISSING/);
    assert.match(answer, /File-index rows are the document index/);
    assert.equal(/communications=|communicationsList=SOURCE_UNAVAILABLE|communicationsList=INDEXED|truncated|page_cap|was not queried|0 communications/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /canExecute=false/);

    const brief = answerClientOperatingBrief('operating brief for ACCG01', {
      entitledCodes: ['ACCG01'],
      workspace: fileIndexOnly,
    });
    assert.match(brief, /WHAT ATLAS KNOWS: identity=/);
    assert.match(brief, /documents=INDEXED/);
    assert.match(brief, /communications=INDEXED/);
    assert.equal(brief.includes('communicationsList='), false);

    const documents = answerClientOperatingBrief('What documents does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: fileIndexOnly,
    });
    assert.match(documents, /documents=INDEXED\/CONFIRMED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(documents.includes('communicationsList='), false);

    const changed = answerClientOperatingBrief('What changed recently for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: fileIndexOnly,
    });
    assert.equal(changed, composed.answers.changed.text);
    assert.equal(changed.includes('communicationsList='), false);
  });

  it('keeps a missing workspace and an allowlist miss as not queried, not an empty thread list', () => {
    const bare = truth(undefined);
    assert.equal(bare.communicationsList.completeness, 'NOT_CERTIFIED');
    assert.match(bare.communicationsList.summary, /was not queried/);
    assert.match(bare.communicationsList.summary, /does not treat that as an empty communications list/);
    assert.equal(bare.communications.completeness, 'MISSING');
    assert.match(bare.communications.summary, /No entitled communication index rows/);
    assert.equal(
      /communicationsList=MISSING|communicationsList=INDEXED|communicationsList=SOURCE_UNAVAILABLE|0 communications/.test(
        bare.communicationsList.summary,
      ),
      false,
    );

    const allowlist = truth(
      workspace({
        communications: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01', channel: 'email' }],
        },
      }),
    );
    assert.equal(allowlist.communicationsList.completeness, 'NOT_CERTIFIED');
    assert.match(allowlist.communicationsList.summary, /was not queried/);
    assert.match(allowlist.communicationsList.summary, /allowlist/);
    assert.equal(allowlist.communicationsList.summary.includes('Should Not List'), false);
    assert.equal(allowlist.communications.completeness, 'MISSING');
    const answer = answerClientOperatingBrief('List the communications for ACCG01', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        communications: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
          items: [{ id: 'hidden', title: 'Should Not List', clientCode: 'ACCG01' }],
        },
      }),
    });
    assert.match(answer, /was not queried/);
    assert.match(answer, /communicationsList=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.equal(answer.includes('Should Not List'), false);
    assert.equal(/communicationsList=MISSING|communicationsList=INDEXED|0 communications/.test(answer), false);
    assert.equal(answer.includes('No entitled communication threads'), false);
  });

  it('says communicationsList=SOURCE_UNAVAILABLE, hides partial titles, and leaves documents on their sentence', () => {
    const capped = truth(
      workspace({
        communications: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
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
      }),
    );
    assert.match(capped.communicationsList.summary, /communicationsList=SOURCE_UNAVAILABLE/);
    assert.match(capped.communicationsList.summary, /reason=page_cap/);
    assert.match(capped.communicationsList.summary, /pagesFetched=80/);
    assert.equal(capped.communicationsList.summary.includes('Hidden Thread'), false);
    assert.equal(capped.communicationsList.summary.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|communicationsList=MISSING|communicationsList=INDEXED|0 communications/.test(
        capped.communicationsList.summary,
      ),
      false,
    );
    assert.equal(capped.communications.completeness, 'NOT_CERTIFIED');
    assert.match(capped.communications.summary, /communications=SOURCE_UNAVAILABLE/);
    assert.equal(capped.documents.completeness, 'INDEXED');
    assert.match(capped.documents.summary, /ACCG indexed correspondence\.pdf/);
    assert.equal(capped.meetings.completeness, 'INDEXED');
    assert.equal(capped.decisionsRisksList.completeness, 'MISSING');

    const copied = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01' },
      communications: {
        queried: false,
        status: 'SOURCE_UNAVAILABLE',
        reason: PAGE_CAP_REASON,
        items: [{ id: 'partial', title: 'Hidden Thread', clientCode: 'ACCG01' }],
      },
    });
    assert.equal(copied?.communications?.items.length, 1);

    const unread = truth(
      workspace({
        communications: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
          items: [{ id: 'partial', title: 'Hidden Thread', clientCode: 'ACCG01' }],
        },
      }),
    );
    assert.match(unread.communicationsList.summary, /communicationsList=SOURCE_UNAVAILABLE/);
    assert.match(unread.communicationsList.summary, /could not be read/);
    assert.equal(unread.communicationsList.summary.includes('Hidden Thread'), false);

    const answer = answerClientOperatingBrief('What communications does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        communications: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [{ id: 'partial', title: 'Hidden Thread', clientCode: 'ACCG01', channel: 'email' }],
        },
      }),
    });
    assert.match(answer, /communicationsList=SOURCE_UNAVAILABLE/);
    assert.match(answer, /communicationsList=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /pagesFetched=80/);
    assert.equal(answer.includes('Hidden Thread'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|communicationsList=MISSING|communicationsList=INDEXED|0 communications|documents=/.test(
        answer,
      ),
      false,
    );
    assert.match(answer, /canExecute=false/);

    const unavailable = communicationsListIndexUnavailableAnswer('ACCG01');
    assert.equal(
      unavailable,
      'Atlas cannot read the current ACCG01 communications list (HVCG_Communications thread rows). communicationsList=SOURCE_UNAVAILABLE. Atlas will not invent threads, recipients, channels, direction, sent times, or message text. Partial rows are not the communications list. File-index rows are the document index. They are not threads. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.',
    );
    assert.equal(/communicationsList=MISSING|communicationsList=INDEXED|0 communications|pageCap=80|OWNER_DECISION_REQUIRED/.test(unavailable), false);
  });

  it('fail-closes an unknown ClientCode and does not raise authority flags', () => {
    const closed = composeClientTruth({ clientCode: 'NOT_A_CLIENT' });
    assert.equal('failClosed' in closed, true);
    const composed = truth(workspace({ communications: indexedCommunications() }));
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);
    assert.equal(composed.liveGtmOutbound, false);
  });
});
