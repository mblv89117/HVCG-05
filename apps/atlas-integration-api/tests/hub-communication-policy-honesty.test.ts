/**
 * ATLAS-COMMUNICATION-POLICY-HONESTY-001
 * Hub-only Ask Atlas honesty for Communication Policy Center /
 * comms policy / auto-respond. Already-recorded entitled overlay
 * rows only. No sixth client. No invented emails, contacts, or
 * send receipts. AUTO_RESPOND stays globally false. DRAFT_ONLY.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { COMMUNICATIONS_AUTO_RESPOND, COMMUNICATIONS_POLICY_CLASS } from '../src/pm/operatorDesk/types.ts';
import {
  COMMUNICATION_POLICY_HONESTY_AUTO_RESPOND,
  COMMUNICATION_POLICY_HONESTY_KIND,
  COMMUNICATION_POLICY_HONESTY_LIVE_GTM_OUTBOUND,
  COMMUNICATION_POLICY_HONESTY_MISSION_KEY,
  COMMUNICATION_POLICY_HONESTY_SEND,
  answerCommunicationPolicyHonesty,
  composeCommunicationPolicyHonesty,
  mapsToCommunicationPolicyHonestyIntent,
} from '../src/pm/operatorDesk/communicationPolicyHonesty.ts';
import { mapsToApprovalCenterHonestyIntent } from '../src/pm/operatorDesk/approvalCenterHonesty.ts';
import { mapsToCapitalSubmissionHonestyIntent } from '../src/pm/operatorDesk/capitalSubmissionHonesty.ts';
import { mapsToResearchIntelligenceHonestyIntent } from '../src/pm/operatorDesk/researchIntelligenceHonesty.ts';

function entitledPolicy(over: {
  policyId: string;
  scopeKind: 'org' | 'client' | 'domain' | 'contact';
  mode?: string;
  clientCode?: string;
  domain?: string;
  contact?: string;
  fromExistingOverlay?: boolean;
}) {
  return {
    mode: 'DRAFT_ONLY',
    fromExistingOverlay: true,
    ...over,
  };
}

describe('communication policy honesty', () => {
  it('keeps the entitled roster and fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(COMMUNICATIONS_POLICY_CLASS, 'DRAFT_ONLY');
    assert.equal(COMMUNICATION_POLICY_HONESTY_MISSION_KEY, 'ATLAS-COMMUNICATION-POLICY-HONESTY-001');
    assert.equal(COMMUNICATION_POLICY_HONESTY_SEND, false);
    assert.equal(COMMUNICATION_POLICY_HONESTY_AUTO_RESPOND, false);
    assert.equal(COMMUNICATION_POLICY_HONESTY_LIVE_GTM_OUTBOUND, false);
  });

  it('maps communication-policy questions and not capital/approval/onboarding/research', () => {
    assert.equal(mapsToCommunicationPolicyHonestyIntent('what is the communication policy for ACCG?'), true);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('comms policy for LIEN01'), true);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('Is auto-respond enabled for ACCG?'), true);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('capital submission'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('What is the submission package?'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('What needs my approval?'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('pending approval'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('Anything waiting on me?'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('research intelligence'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('what is the communication policy for ACCG?'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('what is the communication policy for ACCG?'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('comms policy for LIEN01'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('capital submission'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('What needs my approval?'), true);
  });

  it('answers an empty entitled snapshot honestly and never claims LIVE', () => {
    const pack = composeCommunicationPolicyHonesty({
      question: 'what is the communication policy?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledRecords: [],
    });
    assert.equal(pack.kind, COMMUNICATION_POLICY_HONESTY_KIND);
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.snapshotEmpty, true);
    assert.equal(pack.snapshotUnsigned, true);
    assert.equal(pack.recordedCount, 0);
    assert.equal(pack.send, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.communicationPolicy, 'DRAFT_ONLY');
    assert.ok(pack.honestyNotes.includes('snapshot empty'));
    assert.ok(pack.honestyNotes.includes('unsigned'));
    assert.ok(pack.honestyNotes.includes('no recorded policies'));
    assert.ok(pack.honestyNotes.includes('LIVE evidence not claimed'));
    const answer = answerCommunicationPolicyHonesty('what is the communication policy?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledRecords: [],
    });
    assert.match(answer, /Communication policy for Hub/);
    assert.match(answer, /communication_policy_honesty_v1/);
    assert.match(answer, /LIVE evidence: false/i);
    assert.equal(/live Communication Policy Center snapshot/i.test(answer), false);
    assert.equal(/Live Atlas runtime evidence available/i.test(answer), false);
    assert.equal(/sent mail|auto-send complete|delivery receipt|@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(answer), false);
    assert.match(answer, /AUTO_RESPOND: false/);
  });

  it('never leaks ACCG01 into a LIEN01 communication-policy question', () => {
    const pack = composeCommunicationPolicyHonesty({
      question: 'what is the communication policy for LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledRecords: [
        entitledPolicy({
          policyId: 'client:LIEN01',
          scopeKind: 'client',
          clientCode: 'LIEN01',
          mode: 'DRAFT_ONLY',
        }),
        entitledPolicy({
          policyId: 'client:ACCG01',
          scopeKind: 'client',
          clientCode: 'ACCG01',
          mode: 'AUTO_RESPOND',
        }),
        entitledPolicy({
          policyId: 'contact:accg-on-lien',
          scopeKind: 'contact',
          clientCode: 'LIEN01',
          contact: 'accg.owner@example.com',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedPolicies[0]?.clientCode, 'LIEN01');
    assert.equal(pack.recordedPolicies[0]?.policyId, 'client:LIEN01');
    assert.equal(pack.recordedPolicies.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(JSON.stringify(pack.recordedPolicies).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack.recordedPolicies).includes('accg.owner@example.com'), false);
    const answer = answerCommunicationPolicyHonesty('comms policy for LIEN01', {
      entitledCodes: ['LIEN01'],
      entitledRecords: [
        entitledPolicy({
          policyId: 'client:LIEN01',
          scopeKind: 'client',
          clientCode: 'LIEN01',
        }),
        entitledPolicy({
          policyId: 'client:ACCG01',
          scopeKind: 'client',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Communication policy for LIEN01/);
    assert.equal(/ACCG01|CPL01|accg\.owner@|sent mail/i.test(answer), false);
  });

  it('keeps AUTO_RESPOND, send, and live GTM outbound false even with recorded policies', () => {
    const pack = composeCommunicationPolicyHonesty({
      question: 'what is the communication policy for ACCG?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledRecords: [
        entitledPolicy({
          policyId: 'client:ACCG01',
          scopeKind: 'client',
          clientCode: 'ACCG01',
          mode: 'AUTO_RESPOND',
        }),
        entitledPolicy({
          policyId: 'contact:invented-send',
          scopeKind: 'contact',
          clientCode: 'ACCG01',
          contact: 'sent mail delivery receipt',
        }),
      ],
    });
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.send, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedPolicies[0]?.mode, 'AUTO_RESPOND');
    assert.equal(pack.recordedPolicies[0]?.send, false);
    const serialized = JSON.stringify(pack);
    assert.equal(/sent mail|delivery receipt|auto-send complete/i.test(serialized), false);
    const answer = answerCommunicationPolicyHonesty('Is auto-respond enabled for ACCG?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledRecords: [
        entitledPolicy({
          policyId: 'client:ACCG01',
          scopeKind: 'client',
          clientCode: 'ACCG01',
          mode: 'AUTO_RESPOND',
        }),
      ],
    });
    assert.match(answer, /AUTO_RESPOND: false/);
    assert.match(answer, /did not invent emails, contacts, clients, or send receipts/);
    assert.match(answer, /did not send mail, auto-respond, or launch GTM/);
  });
});
