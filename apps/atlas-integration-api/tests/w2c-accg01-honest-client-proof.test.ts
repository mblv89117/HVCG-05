import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import { emptyOverlay } from '../src/pm/commercialContext/store.ts';
import {
  answerClientOperatingBrief,
  currentWorkspaceUnavailableAnswer,
  mapsToClientOperatingBriefIntent,
  WORKSPACE_TRUTH_SOURCE_UNAVAILABLE,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { extractClientScopedAttentionQuery, resolveAskAtlasScope } from '../src/pm/operatorDesk/askAtlasScope.ts';
import {
  mapsToGetAttentionItems,
  mapsToGetClientContext,
  mapsToSearchAuthorizedKnowledge,
  runAtlasHubRuntime,
} from '../src/pm/operatorDesk/agentRuntime.ts';
import { buildOperatorDeskModel, emptyHonestDesk } from '../src/pm/operatorDesk/model.ts';
import { buildAskAtlasAnswer } from '../src/pm/operatorDesk/askAtlas.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const STAFF: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01', 'PDG01', 'HFD01', 'CCB01', 'LIEN01'],
  roles: ['HVCG Team Member'],
};

function principal(codes: string[]): AtlasPrincipal {
  return {
    userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'w2c@example.com',
    organizationId: 'org-hvcg',
    allowedClientIds: codes,
    roles: ['HVCG Team Member'],
  };
}

function picture() {
  return buildOperatorDeskModel({
    hubSha: 'w2c-test',
    entitledClients: ['ACCG01', 'PDG01', 'HFD01', 'CCB01', 'LIEN01'],
    commandCenter: {},
    commercialContext: emptyHonestDesk(5),
  }).operatingPicture;
}

const PROOF_QUESTIONS = [
  'Give me the current ACCG operating brief.',
  'What are we working on for ACCG?',
  'What changed recently for ACCG?',
  'What does ACCG owe us / what are we waiting on?',
  'What documents are missing for ACCG?',
  'What capital work is active for ACCG?',
  'What decisions does Manny need to make for ACCG?',
  'What does Atlas know about ACCG financials?',
  'What does Atlas NOT know about ACCG financials?',
  'What is blocked for ACCG?',
  'Show the provenance for ACCG.',
];

describe('W2C ACCG01 honest real-client operator proof', () => {
  it('resolves ACCG01 uniquely and fail-closes unknown ClientCode', () => {
    const accg = composeClientTruth({ clientCode: 'ACCG01' });
    assert.equal('failClosed' in accg, false);
    if ('failClosed' in accg) return;
    assert.equal(accg.clientCode, 'ACCG01');
    assert.equal(accg.identity.classification, 'CONFIRMED');
    assert.equal(accg.invented, false);
    assert.equal(accg.globalAutoRespond, false);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
    assert.equal(accg.capitalSubmit, false);
    assert.equal(accg.canExecute, false);
    const unknown = composeClientTruth({ clientCode: 'not-a-code' });
    assert.equal('failClosed' in unknown && unknown.failClosed, true);
  });

  it('does not fabricate contacts, finance, growth, or capital facts', () => {
    const accg = composeClientTruth({ clientCode: 'ACCG01' });
    assert.equal('failClosed' in accg, false);
    if ('failClosed' in accg) return;
    assert.equal(accg.contacts.classification, 'MISSING');
    assert.equal(accg.financialContext.classification, 'NOT_CERTIFIED');
    assert.equal(accg.financialContext.completeness, 'NOT_CERTIFIED');
    assert.equal(accg.growthContext.classification, 'NOT_CERTIFIED');
    assert.equal(accg.growthContext.completeness, 'NOT_CERTIFIED');
    assert.equal(accg.writePolicy, 'read_only');
    assert.match(accg.operatingPosture, /ACTIVE_CLIENT_CONTEXT_RECOVERY|LEGACY_CLIENT_RECONCILIATION/);
    const blob = JSON.stringify(accg);
    assert.equal(/targetamount|lender approval|funding commitment|borrowing base/i.test(blob), false);
    assert.equal(accg.contactCandidates.every((c) => c.writeStatus === 'CANDIDATE_NOT_CREATED'), true);
    assert.equal(accg.contactCandidates.every((c) => c.classification === 'PROPOSED'), true);
  });

  it('prepares contact candidates from entitled sources without creating records', () => {
    const accg = composeClientTruth({
      clientCode: 'ACCG01',
      workspace: {
        clientCode: 'ACCG01',
        displayName: 'ACCG Inc.',
        contacts: { queried: true, items: [] },
        communications: {
          queried: true,
          items: [
            {
              id: 'comm-1',
              title: 'Thread with ops',
              email: 'ops@accg-inc.example',
              fromName: 'ACCG Ops',
            },
          ],
        },
      },
    });
    assert.equal('failClosed' in accg, false);
    if ('failClosed' in accg) return;
    assert.equal(accg.contacts.classification, 'MISSING');
    assert.equal(accg.contactCandidates.length, 1);
    assert.equal(accg.contactCandidates[0]?.email, 'ops@accg-inc.example');
    assert.equal(accg.contactCandidates[0]?.writeStatus, 'CANDIDATE_NOT_CREATED');
  });

  it('keeps ACCG01 isolated from PDG01 and HFD01', () => {
    const accg = composeClientTruth({ clientCode: 'ACCG01' });
    const pdg = composeClientTruth({ clientCode: 'PDG01' });
    const hfd = composeClientTruth({ clientCode: 'HFD01' });
    assert.equal('failClosed' in accg || 'failClosed' in pdg || 'failClosed' in hfd, false);
    if ('failClosed' in accg || 'failClosed' in pdg || 'failClosed' in hfd) return;
    assert.equal(accg.clientCode, 'ACCG01');
    assert.equal(pdg.clientCode, 'PDG01');
    assert.equal(hfd.clientCode, 'HFD01');
    assert.equal(JSON.stringify(accg).includes('PDG01'), false);
    assert.equal(JSON.stringify(accg).includes('HFD01'), false);
    assert.equal(JSON.stringify(accg).includes('org-prodigy-games-llc'), false);
    assert.equal(accg.financialContext.completeness, 'NOT_CERTIFIED');
    assert.ok(pdg.financialContext.completeness === 'PARTIAL' || pdg.financialContext.completeness === 'NOT_CERTIFIED');
    assert.equal(accg.growthContext.completeness, 'NOT_CERTIFIED');
  });

  it('surfaces recovered ACCG documents/projects honestly in the operating brief', () => {
    const ctx = buildOperatorCommercialContext({
      principal: principal(['ACCG01', 'PDG01', 'HFD01']),
      overlay: emptyOverlay(),
      clientCode: 'ACCG01',
    });
    const brief = buildLiveClientPilotBrief(ctx);
    assert.equal(brief.clientCode, 'ACCG01');
    assert.equal(brief.financialContext, 'NOT_CERTIFIED');
    assert.equal(brief.growthContext, 'NOT_CERTIFIED');
    assert.equal(brief.writePolicy, 'read_only');
    const blob = `${brief.whatIsHappening.join(' ')} ${brief.known.join(' ')}`;
    assert.match(blob, /ACCG|document|project/i);
    assert.equal(/Prodigy|Hart Family|PDG01|HFD01/.test(blob), false);
    assert.ok(brief.approvalRequired.some((line) => /GLOBAL_AUTO_RESPOND=false/i.test(line)));
    assert.equal(
      brief.nextActions.every((a) => a.authorityClass === 'OBSERVE' || a.authorityClass === 'RECOMMEND' || a.authorityClass === 'PREPARE'),
      true,
    );
    assert.equal(/EXECUTE/i.test(JSON.stringify(brief.nextActions)), false);
  });

  it('does not steal unscoped blocked questions from portfolio attention', () => {
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked?', 'ACCG01'), true);
    assert.equal(mapsToClientOperatingBriefIntent('Give me the current ACCG operating brief.'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What does Atlas know about ACCG financials?'), true);
  });

  it('answers ACCG Ask Atlas proof questions without portfolio fallback or invented finance', () => {
    const pic = picture();
    for (const question of PROOF_QUESTIONS) {
      assert.equal(mapsToClientOperatingBriefIntent(question, 'ACCG01'), true);
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: STAFF.allowedClientIds,
        explicitClientCode: question.includes('ACCG') ? undefined : 'ACCG01',
        picture: pic,
      });
      assert.equal(/PDG01|HFD01|Prodigy|Hart Family/.test(answer), false);
      assert.equal(/targetamount|lender approval|\$[0-9]{4,}/i.test(answer), false);
      assert.match(
        answer,
        /ACCG|NOT_CERTIFIED|MISSING|read-only|provenance|blocked|waiting|document|financial|GLOBAL_AUTO_RESPOND|No recent Hub workspace timeline|capitalSubmit/i,
      );
      if (/financial/i.test(question)) {
        assert.match(answer, /NOT_CERTIFIED/);
      }
    }
  });

  it('fail-closes unscoped operating-brief questions instead of portfolio fallback', () => {
    const answer = answerClientOperatingBrief('Give me the current operating brief.', {
      entitledCodes: STAFF.allowedClientIds,
      picture: picture(),
    });
    assert.match(answer, /will not fall back to portfolio/i);
    assert.equal(/PDG01/.test(answer), false);
  });

  it('keeps client-scoped attention off foreign clients', () => {
    const scope = resolveAskAtlasScope(STAFF, 'Give me the current ACCG operating brief.');
    assert.equal(scope.kind, 'client');
    if (scope.kind === 'client') assert.equal(scope.clientCode, 'ACCG01');
    const token = extractClientScopedAttentionQuery('What are we working on for ACCG?');
    assert.equal(token?.clientToken.toUpperCase().startsWith('ACCG'), true);
    const pic = picture();
    const runtime = runAtlasHubRuntime({
      principal: STAFF,
      picture: pic,
      question: 'What needs my attention for ACCG?',
      now: '2026-09-12T18:00:00.000Z',
    });
    assert.equal(runtime.askAtlas.items.some((item) => item.clientCode === 'PDG01'), false);
    assert.equal(runtime.askAtlas.items.some((item) => item.clientCode === 'HFD01'), false);
    const full = buildAskAtlasAnswer(pic);
    const accgItems = full.items.filter((item) => item.clientCode === 'ACCG01');
    const foreign = accgItems.filter((item) => item.clientCode && item.clientCode !== 'ACCG01');
    assert.equal(foreign.length, 0);
  });

  it('lets one entitled task occupy overdue and blocked (or overdue and decisionRequired) at once', () => {
    const accg = composeClientTruth({
      clientCode: 'ACCG01',
      now: '2026-09-12T18:00:00.000Z',
      workspace: {
        clientCode: 'ACCG01',
        tasks: [
          { id: 't-overdue-blocked', title: 'ACCG overdue blocked follow-up', status: 'blocked', dueDate: '2020-01-01' },
          { id: 't-overdue-blocked', title: 'ACCG overdue blocked follow-up', status: 'blocked', dueDate: '2020-01-01' },
          { id: 't-overdue-decision', title: 'ACCG overdue owner review', status: 'needs_review', dueDate: '2020-01-01', requiresApproval: true },
        ],
      },
    });
    assert.equal('failClosed' in accg, false);
    if ('failClosed' in accg) return;
    assert.equal(accg.queues.overdue.filter((q) => q.id === 't-overdue-blocked').length, 1);
    assert.equal(accg.queues.blocked.filter((q) => q.id === 't-overdue-blocked').length, 1);
    assert.equal(accg.queues.overdue.filter((q) => q.id === 't-overdue-decision').length, 1);
    assert.equal(accg.queues.decisionRequired.filter((q) => q.id === 't-overdue-decision').length, 1);
  });

  it('Ask Atlas working-on uses the supplied workspace snapshot, not a foreign client', () => {
    const answer = answerClientOperatingBrief('What are we working on for ACCG?', {
      entitledCodes: STAFF.allowedClientIds,
      workspace: {
        clientCode: 'ACCG01',
        displayName: 'ACCG Inc.',
        projects: [{ id: 'p-accg-op', name: 'ACCG weekly operating file' }],
      },
    });
    assert.match(answer, /ACCG weekly operating file/);
    assert.equal(/PDG01|HFD01|Prodigy|Hart Family/.test(answer), false);
  });

  it('does not steal pre-existing unscoped Ask Atlas intents', () => {
    assert.equal(mapsToClientOperatingBriefIntent('Give me the current operating brief.'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What is overdue?'), false);
    assert.equal(mapsToGetAttentionItems('What is overdue?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked?'), false);
    assert.equal(mapsToGetAttentionItems('What is blocked?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What are we waiting on?'), false);
    assert.equal(mapsToGetAttentionItems('What are we waiting on?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What needs my attention?'), false);
    assert.equal(mapsToGetAttentionItems('What needs my attention?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What documents are missing?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What documents are missing for ACCG?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What does Atlas know about financials?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What does Atlas know about ACCG financials?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('What are we working on?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What are we working on for ACCG?'), true);
    assert.equal(mapsToClientOperatingBriefIntent('Search authorized knowledge for ACCG'), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('Search authorized knowledge for ACCG'), true);
    assert.equal(mapsToGetAttentionItems('Summarize Capital'), true);
    assert.equal(mapsToGetClientContext('Summarize Capital'), false);
    assert.equal(mapsToClientOperatingBriefIntent('Summarize Capital'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What documents do we have for ACCG?'), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('What documents do we have for ACCG?'), true);
  });

  it('current workspace unavailable copy does not substitute recovered or portfolio truth', () => {
    const text = currentWorkspaceUnavailableAnswer('ACCG01');
    assert.match(text, new RegExp(WORKSPACE_TRUTH_SOURCE_UNAVAILABLE));
    assert.match(text, /will not substitute recovered or portfolio data/i);
    assert.match(text, /NOT_CERTIFIED/);
    assert.match(text, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(text, /capitalSubmit=false/);
    assert.match(text, /canExecute=false/);
    assert.equal(/PDG01|HFD01|weekly operating file|01_Intake Docs/.test(text), false);
  });
});
