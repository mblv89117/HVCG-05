/**
 * ATLAS-APPROVAL-CENTER-HONESTY-001
 * Hub-only Ask Atlas honesty for Approval Center / pending approval /
 * waiting-on-me. Already-entitled owner-approval tasks and existing overlay
 * only. No sixth client. No invented amounts, lender criteria, or
 * approved/funded state. No auto-approve, send, or execute.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { COMMUNICATIONS_AUTO_RESPOND } from '../src/pm/operatorDesk/types.ts';
import {
  APPROVAL_CENTER_AUTO_APPROVE,
  APPROVAL_CENTER_HONESTY_EXECUTE,
  APPROVAL_CENTER_HONESTY_KIND,
  APPROVAL_CENTER_HONESTY_MISSION_KEY,
  APPROVAL_CENTER_HONESTY_OWNER_GATED,
  APPROVAL_CENTER_HONESTY_SEND,
  answerApprovalCenterHonesty,
  composeApprovalCenterHonesty,
  mapsToApprovalCenterHonestyIntent,
} from '../src/pm/operatorDesk/approvalCenterHonesty.ts';
import { mapsToCapitalSubmissionHonestyIntent } from '../src/pm/operatorDesk/capitalSubmissionHonesty.ts';
import { mapsToResearchIntelligenceHonestyIntent } from '../src/pm/operatorDesk/researchIntelligenceHonesty.ts';

function entitledPending(over: {
  approvalId: string;
  title: string;
  clientCode?: string;
  requestedAction?: string;
  fromOwnerApprovalTask?: boolean;
  fromExistingOverlay?: boolean;
  evidenceStatus?: string;
}) {
  return {
    requestedAction: 'Review entitled pending approval',
    evidenceStatus: 'PROPOSED',
    fromOwnerApprovalTask: true,
    ...over,
  };
}

describe('approval center honesty', () => {
  it('keeps the entitled roster and fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'KAVA01', 'CPL01', 'LIEN01']);
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(APPROVAL_CENTER_HONESTY_MISSION_KEY, 'ATLAS-APPROVAL-CENTER-HONESTY-001');
    assert.equal(APPROVAL_CENTER_AUTO_APPROVE, false);
    assert.equal(APPROVAL_CENTER_HONESTY_SEND, false);
    assert.equal(APPROVAL_CENTER_HONESTY_EXECUTE, false);
    assert.equal(APPROVAL_CENTER_HONESTY_OWNER_GATED, true);
  });

  it('maps approval / pending approval / waiting on me and not capital/research/docs/onboarding', () => {
    assert.equal(mapsToApprovalCenterHonestyIntent('approval'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('What needs my approval?'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('pending approval'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('Anything waiting on me?'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('capital submission'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('What is the submission package?'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('research intelligence'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('Are documents realtime?'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('What needs my approval?'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('pending approval'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('waiting on me'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('capital submission'), true);
  });

  it('answers an empty entitled snapshot honestly and never claims LIVE', () => {
    const pack = composeApprovalCenterHonesty({
      question: 'What needs my approval?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.equal(pack.kind, APPROVAL_CENTER_HONESTY_KIND);
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.snapshotEmpty, true);
    assert.equal(pack.snapshotUnsigned, true);
    assert.equal(pack.pendingCount, 0);
    assert.equal(pack.send, false);
    assert.equal(pack.autoApprove, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.communicationPolicy, 'DRAFT_ONLY');
    assert.ok(pack.honestyNotes.includes('snapshot empty'));
    assert.ok(pack.honestyNotes.includes('unsigned'));
    assert.ok(pack.honestyNotes.includes('no pending items'));
    const answer = answerApprovalCenterHonesty('What needs my approval?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.match(answer, /Approval Center for Hub/);
    assert.match(answer, /approval_center_honesty_v1/);
    assert.match(answer, /LIVE evidence: false/i);
    assert.equal(/live Approval Center snapshot/i.test(answer), false);
    assert.equal(/Live Atlas runtime evidence available/i.test(answer), false);
    assert.equal(/COMPLETE|approved\/funded|AUTO_RESPOND/i.test(answer), false);
  });

  it('surfaces an entitled pending item without inventing amounts, approval, or clients', () => {
    const pack = composeApprovalCenterHonesty({
      question: 'pending approval for LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledPending({
          approvalId: 'task:lien-pending-1',
          title: 'LIEN01 owner review gate',
          clientCode: 'LIEN01',
          fromOwnerApprovalTask: true,
          evidenceStatus: 'PROPOSED',
        }),
        entitledPending({
          approvalId: 'task:lien-invent-amount',
          title: 'LIEN01 $8,400,000 committed funded',
          clientCode: 'LIEN01',
        }),
        entitledPending({
          approvalId: 'task:lien-invent-ltv',
          title: 'Invented Lender LTV 80',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.pendingCount, 1);
    assert.equal(pack.pendingItems[0]?.title, 'LIEN01 owner review gate');
    assert.equal(pack.pendingItems[0]?.clientCode, 'LIEN01');
    assert.equal(pack.pendingItems[0]?.approved, false);
    assert.equal(pack.pendingItems[0]?.funded, false);
    assert.equal(pack.pendingItems[0]?.classification, 'PROPOSED');
    assert.equal(pack.pendingItems[0]?.liveEvidence, true);
    assert.equal(pack.liveEvidence, true);
    assert.equal(pack.autoApprove, false);
    assert.equal(pack.send, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.invented, false);
    const serialized = JSON.stringify(pack);
    assert.equal(/\$[\d,]|8,400,000|LTV 80|COMPLETE|committed funded/.test(serialized), false);
    const answer = answerApprovalCenterHonesty('pending approval for LIEN01', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledPending({
          approvalId: 'task:lien-pending-1',
          title: 'LIEN01 owner review gate',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.match(answer, /Approval Center for LIEN01/);
    assert.match(answer, /LIEN01 owner review gate/);
    assert.match(answer, /did not invent clients, amounts, lender criteria, or approval or funded state/);
    assert.match(answer, /did not auto-approve, send mail, or execute/);
    assert.equal(/\$|8,400,000|AUTO_RESPOND/.test(answer), false);
  });

  it('never leaks ACCG01 into a LIEN01 approval question', () => {
    const pack = composeApprovalCenterHonesty({
      question: 'What needs my approval for LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledPending({
          approvalId: 'task:lien-1',
          title: 'LIEN01 owner review gate',
          clientCode: 'LIEN01',
        }),
        entitledPending({
          approvalId: 'task:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
        }),
        entitledPending({
          approvalId: 'task:accg-title-on-lien',
          title: 'ACCG packet sitting on LIEN row',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.pendingCount, 1);
    assert.equal(pack.pendingItems[0]?.title, 'LIEN01 owner review gate');
    assert.equal(pack.pendingItems.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(JSON.stringify(pack.pendingItems).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack.pendingItems).includes('ACCG packet'), false);
    const answer = answerApprovalCenterHonesty('waiting on me for LIEN01', {
      entitledCodes: ['LIEN01'],
      entitledItems: [
        entitledPending({
          approvalId: 'task:lien-1',
          title: 'LIEN01 owner review gate',
          clientCode: 'LIEN01',
        }),
        entitledPending({
          approvalId: 'task:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Approval Center for LIEN01/);
    assert.equal(/ACCG01|\$/.test(answer), false);
  });

  it('keeps autoApprove, send, and execute false even with entitled pending items', () => {
    const pack = composeApprovalCenterHonesty({
      question: 'approval',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledPending({
          approvalId: 'task:pdg-1',
          title: 'PDG01 owner review gate',
          clientCode: 'PDG01',
        }),
      ],
    });
    assert.equal(pack.autoApprove, false);
    assert.equal(pack.send, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.ownerGated, true);
    assert.equal(pack.invented, false);
    assert.equal(pack.pendingItems[0]?.approved, false);
    assert.equal(pack.pendingItems[0]?.funded, false);
  });
});
