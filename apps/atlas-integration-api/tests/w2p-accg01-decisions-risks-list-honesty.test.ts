/**
 * W2P ACCG01 decisions / risks list honesty.
 * Titles come from the already-combined hygiene-kept HVCG_Decisions + HVCG_Risks slice.
 * Owner approvals and Approval Center items are not this list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperatingHygieneToWorkspaceSnapshot,
  composeClientTruth,
  DECISIONS_RISKS_LIST_SLICE,
  DECISIONS_RISKS_MISSING_SENTENCE,
  decisionsRisksListAskAtlasSentence,
  decisionsRisksListLabel,
  workspaceSnapshotFromPayload,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import { extractAttentionIntent } from '../src/pm/operatorDesk/agentRuntime.ts';
import { extractClientScopedAttentionQuery } from '../src/pm/operatorDesk/askAtlasScope.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  collectPendingDecisionLines,
  decisionsRisksIndexUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Decisions list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE.';
const READ_FAIL_REASON = 'HVCG_Risks could not be read. Section is SOURCE_UNAVAILABLE.';
const DECISIONS_ALLOWLIST =
  'HVCG_Decisions is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';
const RISKS_ALLOWLIST =
  'HVCG_Risks is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';
const BOTH_ALLOWLIST =
  'HVCG_Decisions / HVCG_Risks is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_LEAD =
  '2 entitled HVCG_Decisions / HVCG_Risks row(s). decisionsRisks=INDEXED. Decision: Approve ACCG engagement scope (open); Risk: Cash concentration.';
const INDEXED_ANSWER = decisionsRisksListAskAtlasSentence(INDEXED_LEAD, 'INDEXED', 'CONFIRMED');

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

function indexedDecisionsRisks(): NonNullable<WorkspaceTruthSnapshot['decisionsRisks']> {
  return {
    queried: true,
    status: 'COMPLETE',
    items: [
      {
        id: 'd1',
        title: 'Approve ACCG engagement scope',
        clientCode: 'ACCG01',
        sourceList: 'HVCG_Decisions',
        entityType: 'decision',
        status: 'open',
        summary: 'Owner notes and a severity that are not this list',
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
        summary: 'Due date that was not on RiskStatus',
      },
      {
        id: '6',
        title: 'ATLAS Harden Decision M014703',
        clientCode: 'ACCG01',
        sourceList: 'HVCG_Decisions',
        entityType: 'decision',
        status: 'open',
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
  };
}

function truth(snapshot?: WorkspaceTruthSnapshot, clientCode = 'ACCG01') {
  const composed = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in composed, false);
  if ('failClosed' in composed) throw new Error('unexpected fail closed');
  return composed;
}

describe('W2P decisions / risks list honesty', () => {
  it('keeps the list walk budget and the blank-both combine rule', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
    const repository = readFileSync(join(root, '../src/pm/sharepoint/repository.ts'), 'utf8');
    const fn = repository.slice(
      repository.indexOf('async listWorkspaceCollections('),
      repository.indexOf('async listWorkspaceCollectionsForSearch'),
    );
    assert.match(fn, /load\(this\.settings\.decisionsListId, 'HVCG_Decisions'\)/);
    assert.match(fn, /load\(this\.settings\.risksListId, 'HVCG_Risks'\)/);
    assert.match(fn, /decisionsRisks: this\.combineDecisionsRisks\(decisions, risks\)/);
    assert.match(fn, /await this\.listAll\(listId\)/);
    const combine = repository.slice(
      repository.indexOf('private combineDecisionsRisks('),
      repository.indexOf('private mapWorkspaceItems('),
    );
    assert.match(combine, /decisions\.status === 'SOURCE_UNAVAILABLE' \|\| risks\.status === 'SOURCE_UNAVAILABLE'/);
    assert.match(combine, /items: \[\]/);
    assert.match(repository, /asString\(item\.fields\.DecisionStatus\)/);
    assert.match(repository, /asString\(item\.fields\.RiskStatus\)/);
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
    assert.match(handle, /topic === 'decisions_risks'/);
    assert.match(handle, /decisionsRisksIndexUnavailableAnswer\(scoped\)/);
    assert.match(handle, /topic === 'deliverables'/);
    const brief = readFileSync(join(root, '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts'), 'utf8');
    const phrase = brief.slice(brief.indexOf("topic: 'decisions_risks'"), brief.indexOf("topic: 'approvals'"));
    assert.match(phrase, /\(\?!.*\\bwhat decisions\?\\b\)/);
    assert.match(brief, /\/what decisions\//);
  });

  it('maps closed list questions and leaves collisions and unscoped prompts alone', () => {
    const closed = [
      'What risks exist for ACCG01?',
      'What risks do we have for ACCG?',
      'What risks does ACCG01 have?',
      'List ACCG01 risks',
      'List the ACCG01 risks',
      'Risks list for ACCG01',
      'List ACCG01 decisions',
      'List the ACCG01 decisions',
      'List ACCG01 decisions and risks',
      'Decisions and risks list for ACCG01',
    ];
    for (const question of closed) {
      assert.equal(mapsToClientOperatingBriefIntent(question), true, question);
      assert.equal(clientOperatingBriefTopic(question), 'decisions_risks', question);
    }

    for (const question of ['What risks exist?', 'List risks', 'List decisions', 'Decisions and risks list']) {
      assert.equal(mapsToClientOperatingBriefIntent(question), false, question);
      assert.notEqual(clientOperatingBriefTopic(question), 'owner_decisions', question);
    }

    const ownerDecisions = [
      'What decisions does ACCG01 have?',
      'What decisions exist for ACCG01?',
      'What decisions do we have for ACCG?',
      'What decisions and risks exist for ACCG01?',
      'What decisions for ACCG01?',
      'What decisions do I need to make for ACCG01?',
    ];
    for (const question of ownerDecisions) {
      assert.equal(clientOperatingBriefTopic(question), 'owner_decisions', question);
      assert.equal(mapsToClientOperatingBriefIntent(question), true, question);
      assert.notEqual(clientOperatingBriefTopic(question), 'decisions_risks', question);
    }

    const attention = [
      'What decisions',
      'What decisions do I need to make',
      'What decisions need to be made',
      'What decisions are required',
      'What decision is required',
      'Decision required',
    ];
    for (const question of attention) {
      assert.equal(mapsToClientOperatingBriefIntent(question), false, question);
      assert.notEqual(clientOperatingBriefTopic(question), 'decisions_risks', question);
      assert.equal(extractAttentionIntent(question)?.filterState, 'Decision Required', question);
    }
    assert.equal(clientOperatingBriefTopic('What decision is required'), null);
    assert.equal(clientOperatingBriefTopic('What decision does ACCG01 have?'), null);
    assert.equal(mapsToClientOperatingBriefIntent('What decision does ACCG01 have?'), false);
    assert.equal(extractAttentionIntent('What decision does ACCG01 have?'), null);
    assert.equal(extractClientScopedAttentionQuery('What decision does ACCG01 have?'), null);

    assert.equal(clientOperatingBriefTopic('approvals brief for ACCG01'), 'approvals');
    assert.equal(mapsToClientOperatingBriefIntent('approvals brief for ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('Approval Center'), 'approvals');
    assert.equal(mapsToClientOperatingBriefIntent('Approval Center'), false);

    assert.equal(clientOperatingBriefTopic('What deliverables does ACCG01 have?'), 'deliverables');
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('What engagements does ACCG01 have?'), 'engagements');
    assert.equal(clientOperatingBriefTopic('What tasks does ACCG01 have?'), 'tasks');
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(clientOperatingBriefTopic('What contacts exist for ACCG01?'), 'contacts');
    assert.equal(clientOperatingBriefTopic('What is blocked for ACCG01?'), 'blocked');
  });

  it('threads decisionsRisks through the snapshot and hides SOURCE_UNAVAILABLE titles', () => {
    const copied = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01', displayName: 'ACCG Inc.' },
      decisionsRisks: indexedDecisionsRisks(),
    });
    assert.equal(copied?.decisionsRisks?.queried, true);
    assert.equal(copied?.decisionsRisks?.items.length, 4);

    const hidden = workspaceSnapshotFromPayload({
      overview: { clientCode: 'ACCG01' },
      decisionsRisks: {
        queried: false,
        status: 'SOURCE_UNAVAILABLE',
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'Hidden Decision',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
            status: 'open',
          },
        ],
      },
    });
    assert.equal(hidden?.decisionsRisks?.status, 'SOURCE_UNAVAILABLE');
    assert.equal(hidden?.decisionsRisks?.items.length, 0);
    assert.match(hidden?.decisionsRisks?.reason || '', /reason=page_cap/);
    assert.equal(JSON.stringify(hidden?.decisionsRisks).includes('Hidden Decision'), false);
  });

  it('lists entitled titles with status only when present', () => {
    const composed = truth(workspace({ decisionsRisks: indexedDecisionsRisks() }));
    assert.equal(composed.decisionsRisksList.completeness, 'INDEXED');
    assert.equal(composed.decisionsRisksList.classification, 'CONFIRMED');
    assert.equal(composed.decisionsRisksList.summary, INDEXED_LEAD);
    assert.equal(composed.answers.decisionsRisksExist.text, INDEXED_LEAD);
    assert.equal(composed.decisionsRisksList.summary.includes('PDG secret decision'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('ATLAS Harden Decision'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('Owner notes'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('2026-11-01'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('example.invalid'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('ACCG indexed correspondence'), false);
    assert.equal(
      decisionsRisksListLabel({ title: 'Approve ACCG engagement scope', status: 'open', kind: 'decision' }),
      'Decision: Approve ACCG engagement scope (open)',
    );
    assert.equal(
      decisionsRisksListLabel({ title: 'Cash concentration', kind: 'risk' }),
      'Risk: Cash concentration',
    );
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);
    assert.equal(/decisionsRisks=/.test(composed.answers.decisions.text), false);
    assert.match(composed.answers.ownerApproval.text, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(composed.answers.ownerApproval.text.includes('decisionsRisks=INDEXED'), false);

    const questions = [
      'What risks does ACCG01 have?',
      'What risks exist for ACCG01?',
      'What risks do we have for ACCG?',
      'List ACCG01 risks',
      'List the ACCG01 risks',
      'Risks list for ACCG01',
      'List ACCG01 decisions',
      'List the ACCG01 decisions',
      'List ACCG01 decisions and risks',
      'Decisions and risks list for ACCG01',
    ];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({ decisionsRisks: indexedDecisionsRisks() }),
      });
      assert.equal(answer, INDEXED_ANSWER, question);
      assert.match(answer, /decisionsRisks=INDEXED/);
      assert.match(answer, /decisionsRisks=INDEXED\/CONFIRMED/);
      assert.match(answer, /Decision: Approve ACCG engagement scope \(open\)/);
      assert.match(answer, /Risk: Cash concentration/);
      assert.equal(answer.includes('PDG secret decision'), false);
      assert.equal(answer.includes('ATLAS Harden Decision'), false);
      assert.equal(answer.includes('Owner notes'), false);
      assert.equal(answer.includes('2026-11-01'), false);
      assert.equal(answer.includes('Ada Lovelace'), false);
      assert.equal(answer.includes('ACCG kickoff'), false);
      assert.equal(answer.includes('File the ACCG return'), false);
      assert.equal(answer.includes('ACCG indexed correspondence'), false);
      assert.equal(/contacts=|meetings=|documents=|projects=|tasks=|engagements=|deliverables=|capitalContext=/.test(answer), false);
      assert.match(answer, /Owner approvals are not this list/);
      assert.match(answer, /Approval Center items are not this list/);
      assert.match(answer, /Hygiene-quarantined rows are not this list/);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
      assert.equal(/0 decisions \/ risks|was not queried/.test(answer), false);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const items = Array.from({ length: DECISIONS_RISKS_LIST_SLICE + 2 }, (_, index) => ({
      id: `d-${index}`,
      title: `ACCG decision ${index + 1}`,
      clientCode: 'ACCG01',
      sourceList: 'HVCG_Decisions',
      entityType: 'decision',
      status: index === 0 ? 'open' : undefined,
    }));
    const composed = truth(
      workspace({
        decisionsRisks: { queried: true, status: 'COMPLETE', items },
      }),
    );
    assert.equal(composed.decisionsRisksList.completeness, 'INDEXED');
    assert.match(composed.decisionsRisksList.summary, /8 entitled HVCG_Decisions \/ HVCG_Risks row/);
    assert.match(composed.decisionsRisksList.summary, /Decision: ACCG decision 1 \(open\)/);
    assert.match(composed.decisionsRisksList.summary, /Decision: ACCG decision 6/);
    assert.match(composed.decisionsRisksList.summary, /\+2 more/);
    assert.equal(composed.decisionsRisksList.summary.includes('ACCG decision 7'), false);
    assert.equal(composed.decisionsRisksList.summary.includes('ACCG decision 8'), false);
  });

  it('says decisionsRisks=MISSING for a finished empty slice and does not invent rows', () => {
    const composed = truth(workspace());
    assert.equal(composed.decisionsRisksList.completeness, 'MISSING');
    assert.equal(composed.decisionsRisksList.classification, 'MISSING');
    assert.equal(composed.decisionsRisksList.summary, DECISIONS_RISKS_MISSING_SENTENCE);
    assert.equal(
      /decisionsRisks=SOURCE_UNAVAILABLE|decisionsRisks=INDEXED|truncated|page_cap|was not queried|0 decisions \/ risks/.test(
        composed.decisionsRisksList.summary,
      ),
      false,
    );

    const answer = answerClientOperatingBrief('What risks does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.equal(answer, decisionsRisksListAskAtlasSentence(DECISIONS_RISKS_MISSING_SENTENCE, 'MISSING', 'MISSING'));
    assert.match(answer, /decisionsRisks=MISSING/);
    assert.match(answer, /decisionsRisks=MISSING\/MISSING/);
    assert.match(answer, /does not invent decisions, risks, owners, severity, or due dates/);
    assert.match(answer, /Owner approvals are not this list/);
    assert.equal(/decisionsRisks=SOURCE_UNAVAILABLE|decisionsRisks=INDEXED|truncated|page_cap|was not queried/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });

  it('keeps a missing workspace and an allowlist miss as not queried, not an empty list', () => {
    const bare = truth(undefined);
    assert.equal(bare.decisionsRisksList.completeness, 'NOT_CERTIFIED');
    assert.match(bare.decisionsRisksList.summary, /were not queried/);
    assert.match(bare.decisionsRisksList.summary, /does not treat that as an empty decisions or risks list/);
    assert.equal(
      /decisionsRisks=MISSING|decisionsRisks=INDEXED|decisionsRisks=SOURCE_UNAVAILABLE|0 decisions \/ risks/.test(
        bare.decisionsRisksList.summary,
      ),
      false,
    );

    const allowlist = truth(
      workspace({
        decisionsRisks: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
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
      }),
    );
    assert.equal(allowlist.decisionsRisksList.completeness, 'NOT_CERTIFIED');
    assert.match(allowlist.decisionsRisksList.summary, /were not queried/);
    assert.match(allowlist.decisionsRisksList.summary, /allowlist/);
    assert.equal(allowlist.decisionsRisksList.summary.includes('Should Not List'), false);
    assert.equal(allowlist.decisionsRisksList.summary.includes('HVCG_Decisions was queried'), false);
    assert.equal(
      /decisionsRisks=MISSING|decisionsRisks=INDEXED|decisionsRisks=SOURCE_UNAVAILABLE|OWNER_DECISION_REQUIRED|0 decisions \/ risks/.test(
        allowlist.decisionsRisksList.summary,
      ),
      false,
    );
    const answer = answerClientOperatingBrief('List ACCG01 decisions', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        decisionsRisks: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
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
      }),
    });
    assert.match(answer, /were not queried/);
    assert.equal(answer.includes('Should Not List'), false);
    assert.equal(/decisionsRisks=MISSING|0 decisions \/ risks/.test(answer), false);
    assert.match(answer, /decisionsRisks=NOT_CERTIFIED\/NOT_CERTIFIED/);
  });

  it('names the unqueried side on a mixed grant and does not call the section indexed or missing', () => {
    const risksHidden = truth(
      workspace({
        decisionsRisks: {
          queried: true,
          status: 'COMPLETE',
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
      }),
    );
    assert.equal(risksHidden.decisionsRisksList.completeness, 'NOT_CERTIFIED');
    assert.equal(risksHidden.decisionsRisksList.classification, 'NOT_CERTIFIED');
    assert.match(risksHidden.decisionsRisksList.summary, /HVCG_Decisions was queried/);
    assert.match(risksHidden.decisionsRisksList.summary, /HVCG_Risks was not queried/);
    assert.match(risksHidden.decisionsRisksList.summary, /does not treat the unqueried list as empty/);
    assert.match(risksHidden.decisionsRisksList.summary, /Decision: Approve ACCG engagement scope \(open\)/);
    assert.match(risksHidden.decisionsRisksList.summary, /not fully indexed/);
    assert.equal(risksHidden.decisionsRisksList.summary.includes('Ungranted risk title'), false);
    assert.equal(
      /decisionsRisks=INDEXED|decisionsRisks=MISSING|0 decisions \/ risks/.test(risksHidden.decisionsRisksList.summary),
      false,
    );

    const answer = answerClientOperatingBrief('List ACCG01 decisions and risks', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        decisionsRisks: {
          queried: true,
          status: 'COMPLETE',
          reason: DECISIONS_ALLOWLIST,
          items: [],
        },
      }),
    });
    assert.match(answer, /HVCG_Risks was queried/);
    assert.match(answer, /HVCG_Decisions was not queried/);
    assert.match(answer, /The queried list has no entitled rows/);
    assert.match(answer, /decisionsRisks=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.match(answer, /not fully indexed/);
    assert.equal(/decisionsRisks=INDEXED|decisionsRisks=MISSING|0 decisions \/ risks/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /canExecute=false/);
  });

  it('says decisionsRisks=SOURCE_UNAVAILABLE, hides partial titles, and does not invent OWNER_DECISION_REQUIRED', () => {
    const capped = truth(
      workspace({
        decisionsRisks: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'Hidden Decision',
              status: 'open',
              clientCode: 'ACCG01',
              sourceList: 'HVCG_Decisions',
              entityType: 'decision',
              date: '2026-12-01',
            },
          ],
        },
      }),
    );
    assert.match(capped.decisionsRisksList.summary, /decisionsRisks=SOURCE_UNAVAILABLE/);
    assert.match(capped.decisionsRisksList.summary, /reason=page_cap/);
    assert.match(capped.decisionsRisksList.summary, /pagesFetched=80/);
    assert.equal(capped.decisionsRisksList.summary.includes('Hidden Decision'), false);
    assert.equal(capped.decisionsRisksList.summary.includes('2026-12-01'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|decisionsRisks=MISSING|decisionsRisks=INDEXED|0 decisions \/ risks/.test(
        capped.decisionsRisksList.summary,
      ),
      false,
    );
    assert.equal(capped.contacts.completeness, 'INDEXED');
    assert.equal(capped.meetings.completeness, 'INDEXED');
    assert.equal(capped.tasks.completeness, 'INDEXED');
    assert.equal(capped.deliverablesList.completeness, 'MISSING');

    const unread = truth(
      workspace({
        decisionsRisks: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
          items: [
            {
              id: 'partial',
              title: 'Hidden Decision',
              status: 'open',
              clientCode: 'ACCG01',
              sourceList: 'HVCG_Risks',
              entityType: 'risk',
            },
          ],
        },
      }),
    );
    assert.match(unread.decisionsRisksList.summary, /decisionsRisks=SOURCE_UNAVAILABLE/);
    assert.match(unread.decisionsRisksList.summary, /could not be read/);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|Hidden Decision/.test(unread.decisionsRisksList.summary), false);

    const answer = answerClientOperatingBrief('List ACCG01 risks', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        decisionsRisks: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
          items: [
            {
              id: 'partial',
              title: 'Hidden Decision',
              status: 'open',
              clientCode: 'ACCG01',
              sourceList: 'HVCG_Decisions',
              entityType: 'decision',
            },
          ],
        },
      }),
    });
    assert.match(answer, /decisionsRisks=SOURCE_UNAVAILABLE/);
    assert.match(answer, /decisionsRisks=NOT_CERTIFIED\/NOT_CERTIFIED/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /pagesFetched=80/);
    assert.equal(answer.includes('Hidden Decision'), false);
    assert.equal(
      /OWNER_DECISION_REQUIRED|pageCap=80|meetings=|documents=|contacts=|tasks=|engagements=|deliverables=/.test(answer),
      false,
    );
    assert.match(answer, /canExecute=false/);
  });

  it('does not retarget approvals, owner decisions, deliverables, or communications', () => {
    const snapshot = workspace({ decisionsRisks: indexedDecisionsRisks() });
    const hygienic = applyOperatingHygieneToWorkspaceSnapshot(snapshot);
    const pending = collectPendingDecisionLines({ clientCode: 'ACCG01', workspace: hygienic });
    assert.equal(pending.includes('Approve ACCG engagement scope'), true);
    assert.equal(pending.includes('Cash concentration'), true);
    assert.equal(pending.includes('ATLAS Harden Decision M014703'), false);

    const closed = collectPendingDecisionLines({
      clientCode: 'ACCG01',
      workspace: workspace({
        decisionsRisks: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'done',
              title: 'Closed scope decision',
              clientCode: 'ACCG01',
              sourceList: 'HVCG_Decisions',
              entityType: 'decision',
              status: 'complete',
            },
          ],
        },
      }),
    });
    assert.equal(closed.includes('Closed scope decision'), false);

    const approvals = answerClientOperatingBrief('approvals brief for ACCG01', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
      pendingDecisions: pending,
    });
    assert.match(approvals, /Pending decisions:/);
    assert.match(approvals, /Approve ACCG engagement scope/);
    assert.match(approvals, /Ask Atlas did not apply an approval action/);
    assert.equal(/decisionsRisks=INDEXED\/CONFIRMED|decisionsRisks=MISSING\/MISSING/.test(approvals), false);

    const owner = answerClientOperatingBrief('What decisions does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(owner, /Ask Atlas did not apply an approval action/);
    assert.equal(owner.includes('Approve ACCG engagement scope'), false);
    assert.equal(/decisionsRisks=INDEXED/.test(owner), false);

    const deliverables = answerClientOperatingBrief('What deliverables does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(deliverables, /deliverables=MISSING/);
    assert.equal(deliverables.includes('Approve ACCG engagement scope'), false);
    assert.equal(/decisionsRisks=INDEXED/.test(deliverables), false);

    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(documents, /documents=INDEXED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(/decisionsRisks=INDEXED|Approve ACCG engagement scope/.test(documents), false);

    const composed = truth(snapshot);
    assert.equal(composed.communications.completeness === 'INDEXED' || composed.communications.completeness === 'MISSING' || composed.communications.completeness === 'NOT_CERTIFIED', true);
    assert.equal(composed.communications.summary.includes('decisionsRisks='), false);
    assert.equal(composed.answers.decisions.text.includes('decisionsRisks='), false);
  });

  it('fail-closes a foreign or unknown ClientCode and does not emit the entitled list', () => {
    const foreign = answerClientOperatingBrief('What risks does PDG01 have?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ decisionsRisks: indexedDecisionsRisks() }),
    });
    assert.match(foreign, /Fail closed/);
    assert.equal(foreign.includes('Approve ACCG engagement scope'), false);
    assert.equal(/decisionsRisks=INDEXED/.test(foreign), false);

    const unknown = answerClientOperatingBrief('What risks exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
    });
    assert.match(unknown, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unknown.includes('Approve ACCG engagement scope'), false);
  });

  it('answers a missing workspace as decisionsRisks=SOURCE_UNAVAILABLE without inventing page_cap', () => {
    const answer = decisionsRisksIndexUnavailableAnswer('ACCG01');
    assert.equal(
      answer,
      'Atlas cannot read the current ACCG01 decisions and risks list (HVCG_Decisions / HVCG_Risks). decisionsRisks=SOURCE_UNAVAILABLE. Atlas will not invent decisions, risks, owners, severity, or due dates. Partial rows are not the decisions or risks list. Owner approvals are not this list. GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.',
    );
    assert.equal(
      /decisionsRisks=MISSING|decisionsRisks=INDEXED|reason=page_cap|OWNER_DECISION_REQUIRED|pageCap=80|documents=|meetings=|contacts=|tasks=|engagements=|deliverables=|0 decisions \/ risks/.test(
        answer,
      ),
      false,
    );
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });
});
