/**
 * W2K ACCG01 meetings list honesty.
 * Populated, finished-empty, and page_cap shapes are also exercised through
 * the scoped workspace walk in w2i-r2-meetings-client-scope.test.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeClientTruth,
  MEETINGS_MISSING_SENTENCE,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  mapsToClientOperatingBriefIntent,
  meetingsIndexUnavailableAnswer,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';

const PAGE_CAP_REASON =
  'HVCG_Meetings list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';

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
    meetings: { queried: true, status: 'COMPLETE', items: [] },
    timeline: [
      {
        at: '2026-08-01T00:00:00.000Z',
        kind: 'meeting',
        title: 'Timeline only standup',
        source: 'HVCG_Meetings',
        id: 'tl-1',
      },
    ],
    ...overrides,
  };
}

function truth(snapshot: WorkspaceTruthSnapshot, clientCode = 'ACCG01') {
  const composed = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in composed, false);
  if ('failClosed' in composed) throw new Error('unexpected fail closed');
  return composed;
}

describe('W2K meetings list honesty', () => {
  it('keeps the list walk budget at page_cap 80 and $top 100', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
  });

  it('maps a closed meetings question and leaves documents and unscoped prompts alone', () => {
    assert.equal(mapsToClientOperatingBriefIntent('What meetings exist for ACCG01?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What meetings do we have for ACCG?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('Meetings list for ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(mapsToClientOperatingBriefIntent('What meetings exist?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What documents exist for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What is blocked for ACCG01?'), 'blocked');
  });

  it('does not treat the timeline as the meeting inventory and does not invent notes', () => {
    const composed = truth(
      workspace({
        meetings: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'm1',
              title: 'ACCG kickoff',
              clientCode: 'ACCG01',
              date: '2026-09-01T00:00:00.000Z',
              summary: 'Private notes about the decision and the next action',
              attendees: 'Someone Else',
              email: 'owner@accg.example',
            },
            {
              id: 'm2',
              title: 'PDG working session',
              clientCode: 'PDG01',
              date: '2026-09-02T00:00:00.000Z',
              email: 'pdg@example.com',
            },
            {
              id: 'm3',
              title: 'Unstamped meeting',
              date: '2026-09-03T00:00:00.000Z',
            },
          ],
        },
      }),
    );
    assert.equal(composed.meetings.completeness, 'INDEXED');
    assert.equal(composed.meetings.classification, 'CONFIRMED');
    assert.match(composed.meetings.summary, /ACCG kickoff \(2026-09-01\)/);
    assert.match(composed.meetings.summary, /1 entitled HVCG_Meetings row/);
    assert.equal(composed.meetings.summary.includes('PDG working session'), false);
    assert.equal(composed.meetings.summary.includes('Unstamped meeting'), false);
    assert.equal(composed.meetings.summary.includes('Timeline only standup'), false);
    assert.equal(composed.meetings.summary.includes('Private notes'), false);
    assert.equal(composed.meetings.summary.includes('Someone Else'), false);
    assert.equal(composed.meetings.summary.includes('next action'), false);
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.match(composed.documents.summary, /ACCG indexed correspondence\.pdf/);
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);
    assert.equal(composed.contactCandidates.length, 1);
    assert.equal(composed.contactCandidates[0]?.email, 'owner@accg.example');
    assert.equal(composed.contactCandidates[0]?.source, 'HVCG_Meetings');
    assert.equal(composed.contactCandidates[0]?.writeStatus, 'CANDIDATE_NOT_CREATED');
    assert.equal(composed.contactCandidates.some((row) => row.email === 'pdg@example.com'), false);

    const answer = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
      workspace: workspace({
        meetings: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'm1',
              title: 'ACCG kickoff',
              clientCode: 'ACCG01',
              date: '2026-09-01T00:00:00.000Z',
              summary: 'Private notes about the decision and the next action',
            },
          ],
        },
      }),
    });
    assert.match(answer, /meetings=INDEXED/);
    assert.match(answer, /CONFIRMED/);
    assert.equal(answer.includes('Private notes'), false);
    assert.equal(answer.includes('Timeline only standup'), false);
    assert.match(answer, /canExecute=false/);
  });

  it('does not call an unqueried meetings section meetings=MISSING', () => {
    const composed = truth(workspace({ meetings: undefined }));
    assert.match(composed.meetings.summary, /was not queried/);
    assert.equal(/meetings=MISSING|meetings=INDEXED|meetings=SOURCE_UNAVAILABLE/.test(composed.meetings.summary), false);
    assert.equal(composed.documents.completeness, 'INDEXED');
  });

  it('keeps a finished empty slice meetings=MISSING without blanking documents', () => {
    const composed = truth(workspace());
    assert.equal(composed.meetings.summary, MEETINGS_MISSING_SENTENCE);
    assert.equal(composed.meetings.completeness, 'MISSING');
    assert.equal(/meetings=SOURCE_UNAVAILABLE|meetings=INDEXED/.test(composed.meetings.summary), false);
    assert.equal(composed.meetings.summary.includes('Timeline only standup'), false);
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(composed.documents.summary), false);
  });

  it('does not present page_cap partial rows and does not feed contact candidates', () => {
    const composed = truth(
      workspace({
        meetings: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'ACCG scoped page row',
              clientCode: 'ACCG01',
              date: '2026-09-04T00:00:00.000Z',
              email: 'leak@accg.example',
              summary: 'Do not show this note',
            },
          ],
        },
      }),
    );
    assert.match(composed.meetings.summary, /meetings=SOURCE_UNAVAILABLE/);
    assert.match(composed.meetings.summary, /reason=page_cap/);
    assert.match(composed.meetings.summary, /pagesFetched=80/);
    assert.match(composed.meetings.summary, /OWNER_DECISION_REQUIRED/);
    assert.match(composed.meetings.summary, /itemsFetched=80/);
    assert.equal(composed.meetings.summary.includes('ACCG scoped page row'), false);
    assert.equal(composed.meetings.summary.includes('leak@accg.example'), false);
    assert.equal(composed.meetings.summary.includes('Do not show this note'), false);
    assert.equal(/meetings=MISSING|meetings=INDEXED/.test(composed.meetings.summary), false);
    assert.equal(composed.contactCandidates.length, 0);
    assert.equal(composed.documents.completeness, 'INDEXED');
    assert.match(composed.documents.summary, /ACCG indexed correspondence\.pdf/);
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);

    const answer = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        meetings: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'ACCG scoped page row',
              clientCode: 'ACCG01',
              email: 'leak@accg.example',
            },
          ],
        },
      }),
    });
    assert.match(answer, /meetings=SOURCE_UNAVAILABLE/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /itemsFetched=80/);
    assert.equal(answer.includes('ACCG scoped page row'), false);
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(answer), false);
  });

  it('fail-closes unknown and unentitled meetings questions', () => {
    const unknown = composeClientTruth({ clientCode: 'not-a-code' });
    assert.equal('failClosed' in unknown && unknown.failClosed, true);

    const unentitled = answerClientOperatingBrief('What meetings exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace(),
    });
    assert.match(unentitled, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unentitled.includes('ACCG kickoff'), false);
    assert.equal(/meetings=INDEXED/.test(unentitled), false);

    const mismatch = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: { ...workspace(), clientCode: 'PDG01' },
    });
    assert.match(mismatch, /Fail closed/);
    assert.equal(mismatch.includes('ACCG indexed correspondence'), false);
  });

  it('answers a missing workspace as meetings=SOURCE_UNAVAILABLE without inventing page_cap or blanking documents', () => {
    const answer = meetingsIndexUnavailableAnswer('ACCG01');
    assert.match(answer, /meetings=SOURCE_UNAVAILABLE/);
    assert.equal(/meetings=MISSING|meetings=INDEXED|reason=page_cap|documents=/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });
});
