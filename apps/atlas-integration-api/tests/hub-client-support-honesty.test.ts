/**
 * ATLAS-CLIENT-SUPPORT-HONESTY-001
 * Hub-only Ask Atlas honesty for client support / routing.
 * Already-entitled client-support agent rows only. No sixth client.
 * No invented clients, tickets, Hub-MI rows, or send receipts.
 * AUTO_RESPOND / send / execute stay false. Empty/unsigned not LIVE.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import {
  CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
  CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
  CLIENT_SUPPORT_AGENT_EXECUTE,
  CLIENT_SUPPORT_AGENT_HUB_MI,
  CLIENT_SUPPORT_AGENT_OWNER_GATED,
  CLIENT_SUPPORT_AGENT_POLICY_CLASS,
  CLIENT_SUPPORT_AGENT_SEND,
} from '../src/pm/operatorDesk/types.ts';
import {
  CLIENT_SUPPORT_HONESTY_AUTO_RESPOND,
  CLIENT_SUPPORT_HONESTY_DRAFT_ONLY,
  CLIENT_SUPPORT_HONESTY_EXECUTE,
  CLIENT_SUPPORT_HONESTY_HUB_MI,
  CLIENT_SUPPORT_HONESTY_KIND,
  CLIENT_SUPPORT_HONESTY_MISSION_KEY,
  CLIENT_SUPPORT_HONESTY_OWNER_GATED,
  CLIENT_SUPPORT_HONESTY_SEND,
  answerClientSupportHonesty,
  composeClientSupportHonesty,
  mapsToClientSupportHonestyIntent,
} from '../src/pm/operatorDesk/clientSupportHonesty.ts';
import { mapsToApprovalCenterHonestyIntent } from '../src/pm/operatorDesk/approvalCenterHonesty.ts';
import { mapsToCapitalSubmissionHonestyIntent } from '../src/pm/operatorDesk/capitalSubmissionHonesty.ts';
import { mapsToCommunicationPolicyHonestyIntent } from '../src/pm/operatorDesk/communicationPolicyHonesty.ts';

function entitledSupport(over: {
  supportId: string;
  title: string;
  clientCode?: string;
  evidenceKind?: string;
  suggestedRoute?: string;
  fromExistingSupport?: boolean;
  fromExistingOverlay?: boolean;
}) {
  return {
    evidenceKind: 'task',
    suggestedRoute: 'Owner review',
    fromExistingSupport: true,
    ...over,
  };
}

describe('client support honesty', () => {
  it('keeps the entitled roster and fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    assert.equal(CLIENT_SUPPORT_HONESTY_MISSION_KEY, 'ATLAS-CLIENT-SUPPORT-HONESTY-001');
    assert.equal(CLIENT_SUPPORT_AGENT_POLICY_CLASS, 'OWNER_ESCALATE');
    assert.equal(CLIENT_SUPPORT_AGENT_EXECUTE, false);
    assert.equal(CLIENT_SUPPORT_AGENT_SEND, false);
    assert.equal(CLIENT_SUPPORT_AGENT_AUTO_RESPOND, false);
    assert.equal(CLIENT_SUPPORT_AGENT_DRAFT_ONLY, true);
    assert.equal(CLIENT_SUPPORT_AGENT_OWNER_GATED, true);
    assert.equal(CLIENT_SUPPORT_AGENT_HUB_MI, false);
    assert.equal(CLIENT_SUPPORT_HONESTY_SEND, false);
    assert.equal(CLIENT_SUPPORT_HONESTY_AUTO_RESPOND, false);
    assert.equal(CLIENT_SUPPORT_HONESTY_EXECUTE, false);
    assert.equal(CLIENT_SUPPORT_HONESTY_HUB_MI, false);
    assert.equal(CLIENT_SUPPORT_HONESTY_OWNER_GATED, true);
    assert.equal(CLIENT_SUPPORT_HONESTY_DRAFT_ONLY, true);
  });

  it('maps client-support / routing and not capital/approval/comms/onboarding', () => {
    assert.equal(mapsToClientSupportHonestyIntent('client support for ACCG'), true);
    assert.equal(mapsToClientSupportHonestyIntent('open support tickets for LIEN01'), true);
    assert.equal(mapsToClientSupportHonestyIntent('help desk for PDG01'), true);
    assert.equal(mapsToClientSupportHonestyIntent('support routing for CCB01'), true);
    assert.equal(mapsToClientSupportHonestyIntent('who should handle this support item'), true);
    assert.equal(mapsToClientSupportHonestyIntent('capital submission'), false);
    assert.equal(mapsToClientSupportHonestyIntent('What is the submission package?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('What needs my approval?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('pending approval'), false);
    assert.equal(mapsToClientSupportHonestyIntent('Anything waiting on me?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('what is the communication policy for ACCG?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('comms policy for LIEN01'), false);
    assert.equal(mapsToClientSupportHonestyIntent('Is auto-respond enabled for ACCG?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('client support for ACCG'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('client support for ACCG'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('open support tickets for LIEN01'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('capital submission'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('What needs my approval?'), true);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('what is the communication policy for ACCG?'), true);
  });

  it('answers an empty entitled snapshot honestly and never claims LIVE', () => {
    const pack = composeClientSupportHonesty({
      question: 'client support',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.equal(pack.kind, CLIENT_SUPPORT_HONESTY_KIND);
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.snapshotEmpty, true);
    assert.equal(pack.snapshotUnsigned, true);
    assert.equal(pack.recordedCount, 0);
    assert.equal(pack.send, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.hubMi, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(pack.policyClass, 'OWNER_ESCALATE');
    assert.ok(pack.honestyNotes.includes('snapshot empty'));
    assert.ok(pack.honestyNotes.includes('unsigned'));
    assert.ok(pack.honestyNotes.includes('no recorded support items'));
    assert.ok(pack.honestyNotes.includes('LIVE evidence not claimed'));
    const answer = answerClientSupportHonesty('client support', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.match(answer, /Client support for Hub/);
    assert.match(answer, /client_support_honesty_v1/);
    assert.match(answer, /LIVE evidence: false/i);
    assert.equal(/live client support snapshot/i.test(answer), false);
    assert.equal(/Live Atlas runtime evidence available/i.test(answer), false);
    assert.equal(/sent mail|auto-send complete|delivery receipt|@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(answer), false);
    assert.match(answer, /AUTO_RESPOND: false/);
    assert.match(answer, /Hub-MI: false/);
  });

  it('never leaks ACCG01 into a LIEN01 client-support question', () => {
    const pack = composeClientSupportHonesty({
      question: 'client support for LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledSupport({
          supportId: 'task:lien-support-1',
          title: 'LIEN01 follow-up check-in',
          clientCode: 'LIEN01',
          evidenceKind: 'task',
        }),
        entitledSupport({
          supportId: 'task:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
        }),
        entitledSupport({
          supportId: 'task:accg-title-on-lien',
          title: 'ACCG packet sitting on LIEN row',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedItems[0]?.clientCode, 'LIEN01');
    assert.equal(pack.recordedItems[0]?.supportId, 'task:lien-support-1');
    assert.equal(pack.recordedItems.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(JSON.stringify(pack.recordedItems).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack.recordedItems).includes('ACCG packet'), false);
    const answer = answerClientSupportHonesty('support tickets for LIEN01', {
      entitledCodes: ['LIEN01'],
      entitledItems: [
        entitledSupport({
          supportId: 'task:lien-support-1',
          title: 'LIEN01 follow-up check-in',
          clientCode: 'LIEN01',
        }),
        entitledSupport({
          supportId: 'task:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Client support for LIEN01/);
    assert.equal(/ACCG01|CPL01|sent mail/i.test(answer), false);
  });

  it('keeps invented, send, autoRespond, and execute false even with recorded items', () => {
    const pack = composeClientSupportHonesty({
      question: 'client support for ACCG',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledSupport({
          supportId: 'task:accg-support-1',
          title: 'ACCG01 entitled follow-up',
          clientCode: 'ACCG01',
          evidenceKind: 'task',
        }),
        entitledSupport({
          supportId: 'task:accg-invent-send',
          title: 'sent mail delivery receipt',
          clientCode: 'ACCG01',
        }),
        entitledSupport({
          supportId: 'task:accg-invent-hubmi',
          title: 'Invented Hub-MI row',
          clientCode: 'ACCG01',
        }),
        entitledSupport({
          supportId: 'task:accg-invent-ticket',
          title: 'Invented ticket #4821',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.send, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.hubMi, false);
    assert.equal(pack.draftOnly, true);
    assert.equal(pack.ownerGated, true);
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedItems[0]?.title, 'ACCG01 entitled follow-up');
    assert.equal(pack.recordedItems[0]?.send, false);
    assert.equal(pack.recordedItems[0]?.execute, false);
    assert.equal(pack.recordedItems[0]?.autoRespond, false);
    assert.equal(pack.recordedItems[0]?.hubMiRow, false);
    const serialized = JSON.stringify(pack);
    assert.equal(/sent mail|delivery receipt|auto-send complete|Hub-MI row|ticket #4821/i.test(serialized), false);
    const answer = answerClientSupportHonesty('help desk for ACCG', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledSupport({
          supportId: 'task:accg-support-1',
          title: 'ACCG01 entitled follow-up',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /AUTO_RESPOND: false/);
    assert.match(answer, /did not invent clients, tickets, Hub-MI rows, or send receipts/);
    assert.match(answer, /did not send mail, auto-respond, or execute routing/);
    assert.equal(/sent mail|delivery receipt|CPL01|SYN01/.test(answer), false);
  });

  it('does not treat an outside sixth-client ask as LIVE or invented roster', () => {
    const pack = composeClientSupportHonesty({
      question: 'client support for CPL01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledSupport({
          supportId: 'task:cpl-invented',
          title: 'CPL01 invented ticket',
          clientCode: 'CPL01',
        }),
      ],
    });
    assert.equal(pack.clientCode, undefined);
    assert.equal(pack.recordedCount, 0);
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.invented, false);
    assert.ok(pack.items.some((row) => /sixth client/i.test(row)));
    assert.deepEqual(pack.entitledCodes, ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
  });
});
