/**
 * ATLAS-ONBOARDING-EXECUTE-HONESTY-001
 * Hub-only Ask Atlas honesty for onboarding status vs execute.
 * Status never claims LIVE execution and never calls execute.
 * Execute stays entitled-only. No sixth client.
 * Execute answers never invent ClientCodes, workspaces, projects, or Hub-MI.
 * Fail-closed: invented=false, send=false, autoRespond=false.
 * Empty/unsigned snapshots are not LIVE. Client A never receives Client B.
 * Capital, approval, communication-policy, and client-support honesty win first.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import {
  ONBOARDING_AGENT_ACTIVATE,
  ONBOARDING_AGENT_EXECUTE,
  ONBOARDING_AGENT_HUB_MI,
  ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
  ONBOARDING_AGENT_OWNER_GATED,
  ONBOARDING_AGENT_POLICY_CLASS,
  ONBOARDING_AGENT_SEND,
} from '../src/pm/operatorDesk/types.ts';
import {
  ONBOARDING_EXECUTE_HONESTY_ACTIVATE,
  ONBOARDING_EXECUTE_HONESTY_AUTO_RESPOND,
  ONBOARDING_EXECUTE_HONESTY_EXECUTE,
  ONBOARDING_EXECUTE_HONESTY_HUB_MI,
  ONBOARDING_EXECUTE_HONESTY_KIND,
  ONBOARDING_EXECUTE_HONESTY_LIVE_GTM_OUTBOUND,
  ONBOARDING_EXECUTE_HONESTY_MISSION_KEY,
  ONBOARDING_EXECUTE_HONESTY_OWNER_GATED,
  ONBOARDING_EXECUTE_HONESTY_SEND,
  answerOnboardingExecuteHonesty,
  composeOnboardingExecuteHonesty,
  classifyOnboardingExecuteHonestyIntent,
  mapsToOnboardingExecuteHonestyExecuteIntent,
  mapsToOnboardingExecuteHonestyIntent,
  mapsToOnboardingStatusHonestyIntent,
  onboardingHonestyShouldCallExecute,
} from '../src/pm/operatorDesk/onboardingExecuteHonesty.ts';
import { mapsToApprovalCenterHonestyIntent } from '../src/pm/operatorDesk/approvalCenterHonesty.ts';
import { mapsToCapitalSubmissionHonestyIntent } from '../src/pm/operatorDesk/capitalSubmissionHonesty.ts';
import { mapsToClientSupportHonestyIntent } from '../src/pm/operatorDesk/clientSupportHonesty.ts';
import { mapsToCommunicationPolicyHonestyIntent } from '../src/pm/operatorDesk/communicationPolicyHonesty.ts';

function entitledRun(over: {
  runId: string;
  title: string;
  clientCode?: string;
  workspace?: string;
  projectName?: string;
  status?: string;
  fromExistingOverlay?: boolean;
  fromExistingRun?: boolean;
}) {
  return {
    fromExistingOverlay: true,
    ...over,
  };
}

describe('onboarding execute honesty', () => {
  it('keeps the entitled roster and fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_MISSION_KEY, 'ATLAS-ONBOARDING-EXECUTE-HONESTY-001');
    assert.equal(ONBOARDING_AGENT_POLICY_CLASS, 'OWNER_ESCALATE');
    assert.equal(ONBOARDING_AGENT_EXECUTE, false);
    assert.equal(ONBOARDING_AGENT_ACTIVATE, false);
    assert.equal(ONBOARDING_AGENT_SEND, false);
    assert.equal(ONBOARDING_AGENT_HUB_MI, false);
    assert.equal(ONBOARDING_AGENT_OWNER_GATED, true);
    assert.equal(ONBOARDING_AGENT_LIVE_GTM_OUTBOUND, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_SEND, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_AUTO_RESPOND, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_EXECUTE, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_ACTIVATE, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_HUB_MI, false);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_OWNER_GATED, true);
    assert.equal(ONBOARDING_EXECUTE_HONESTY_LIVE_GTM_OUTBOUND, false);
  });

  it('maps status vs execute and lets capital/approval/comms/client-support win first', () => {
    assert.equal(mapsToOnboardingStatusHonestyIntent('Where are we on onboarding ACCG?'), true);
    assert.equal(mapsToOnboardingStatusHonestyIntent('What is the onboarding status for ACCG?'), true);
    assert.equal(mapsToOnboardingStatusHonestyIntent('Is onboarding complete for ACCG?'), true);
    assert.equal(mapsToOnboardingExecuteHonestyExecuteIntent('Start onboarding ACCG'), true);
    assert.equal(mapsToOnboardingExecuteHonestyExecuteIntent('Run onboarding for ACCG01'), true);
    assert.equal(mapsToOnboardingExecuteHonestyExecuteIntent('Execute onboarding ACCG'), true);
    assert.equal(classifyOnboardingExecuteHonestyIntent('Where are we on onboarding ACCG?'), 'status');
    assert.equal(classifyOnboardingExecuteHonestyIntent('Start onboarding ACCG'), 'execute');
    assert.equal(mapsToOnboardingExecuteHonestyIntent('capital submission'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('What is the submission package?'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('What needs my approval?'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('pending approval'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('Anything waiting on me?'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('what is the communication policy for ACCG?'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('comms policy for LIEN01'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('Is auto-respond enabled for ACCG?'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('client support for ACCG'), false);
    assert.equal(mapsToOnboardingExecuteHonestyIntent('open support tickets for LIEN01'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Where are we on onboarding ACCG?'), false);
    assert.equal(mapsToApprovalCenterHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('What is the onboarding status for ACCG?'), false);
    assert.equal(mapsToClientSupportHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('capital submission'), true);
    assert.equal(mapsToApprovalCenterHonestyIntent('What needs my approval?'), true);
    assert.equal(mapsToCommunicationPolicyHonestyIntent('what is the communication policy for ACCG?'), true);
    assert.equal(mapsToClientSupportHonestyIntent('client support for ACCG'), true);
  });

  it('answers an empty entitled snapshot honestly and never claims LIVE execution', () => {
    const pack = composeOnboardingExecuteHonesty({
      question: 'What is the onboarding status?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.equal(pack.kind, ONBOARDING_EXECUTE_HONESTY_KIND);
    assert.equal(pack.intent, 'status');
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.liveExecution, false);
    assert.equal(pack.mayExecute, false);
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
    assert.equal(onboardingHonestyShouldCallExecute(pack), false);
    assert.ok(pack.honestyNotes.includes('snapshot empty'));
    assert.ok(pack.honestyNotes.includes('unsigned'));
    assert.ok(pack.honestyNotes.includes('no recorded onboarding runs'));
    assert.ok(pack.honestyNotes.includes('LIVE evidence not claimed'));
    assert.ok(pack.honestyNotes.includes('LIVE execution not claimed'));
    assert.ok(pack.honestyNotes.includes('status questions do not execute onboarding'));
    const answer = answerOnboardingExecuteHonesty('What is the onboarding status?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.match(answer, /Onboarding status for Hub/);
    assert.match(answer, /onboarding_execute_honesty_v1/);
    assert.match(answer, /LIVE evidence: false/i);
    assert.match(answer, /LIVE execution: false/i);
    assert.match(answer, /Status questions do not execute onboarding/);
    assert.equal(/Executed governed|LIVE execution: true|live onboarding snapshot/i.test(answer), false);
    assert.equal(/sent mail|auto-send complete|delivery receipt/i.test(answer), false);
    assert.match(answer, /AUTO_RESPOND: false/);
    assert.match(answer, /Hub-MI: false/);
  });

  it('never leaks ACCG01 into a LIEN01 onboarding status question', () => {
    const pack = composeOnboardingExecuteHonesty({
      question: 'Where are we on onboarding LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:lien-1',
          title: 'LIEN01 entitled onboarding',
          clientCode: 'LIEN01',
          projectName: 'LIEN01 - Onboarding',
        }),
        entitledRun({
          runId: 'run:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
          projectName: 'ACCG01 - Onboarding',
        }),
        entitledRun({
          runId: 'run:accg-title-on-lien',
          title: 'ACCG packet sitting on LIEN row',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.intent, 'status');
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedItems[0]?.clientCode, 'LIEN01');
    assert.equal(pack.recordedItems[0]?.runId, 'run:lien-1');
    assert.equal(pack.recordedItems.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(JSON.stringify(pack.recordedItems).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack.recordedItems).includes('ACCG packet'), false);
    const answer = answerOnboardingExecuteHonesty('What is the onboarding status for LIEN01?', {
      entitledCodes: ['LIEN01'],
      entitledItems: [
        entitledRun({
          runId: 'run:lien-1',
          title: 'LIEN01 entitled onboarding',
          clientCode: 'LIEN01',
        }),
        entitledRun({
          runId: 'run:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Onboarding status for LIEN01/);
    assert.equal(/ACCG01|CPL01|sent mail/i.test(answer), false);
  });

  it('keeps invented, send, autoRespond false and never invents execute facts', () => {
    const pack = composeOnboardingExecuteHonesty({
      question: 'Start onboarding ACCG',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:accg-1',
          title: 'ACCG01 entitled onboarding',
          clientCode: 'ACCG01',
          projectName: 'ACCG01 - Onboarding',
        }),
        entitledRun({
          runId: 'run:accg-invent-send',
          title: 'sent mail delivery receipt',
          clientCode: 'ACCG01',
        }),
        entitledRun({
          runId: 'run:accg-invent-hubmi',
          title: 'Invented Hub-MI row',
          clientCode: 'ACCG01',
        }),
        entitledRun({
          runId: 'run:accg-invent-workspace',
          title: 'invented workspace for ACCG',
          clientCode: 'ACCG01',
          workspace: 'invented workspace',
        }),
        entitledRun({
          runId: 'run:accg-invent-project',
          title: 'invented project for ACCG',
          clientCode: 'ACCG01',
          projectName: 'invented project',
        }),
      ],
    });
    assert.equal(pack.intent, 'execute');
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.send, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.hubMi, false);
    assert.equal(pack.liveExecution, false);
    assert.equal(pack.ownerGated, true);
    assert.equal(pack.recordedCount, 1);
    assert.equal(pack.recordedItems[0]?.title, 'ACCG01 entitled onboarding');
    assert.equal(pack.recordedItems[0]?.send, false);
    assert.equal(pack.recordedItems[0]?.execute, false);
    assert.equal(pack.recordedItems[0]?.autoRespond, false);
    assert.equal(pack.recordedItems[0]?.hubMiRow, false);
    assert.equal(pack.recordedItems[0]?.liveExecution, false);
    assert.equal(pack.mayExecute, true);
    assert.equal(onboardingHonestyShouldCallExecute(pack), true);
    const serialized = JSON.stringify(pack.recordedItems);
    assert.equal(/sent mail|delivery receipt|auto-send complete|Invented Hub-MI row|invented workspace|invented project/i.test(serialized), false);
    const answer = answerOnboardingExecuteHonesty('Start onboarding ACCG', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:accg-1',
          title: 'ACCG01 entitled onboarding',
          clientCode: 'ACCG01',
          projectName: 'ACCG01 - Onboarding',
        }),
      ],
    });
    assert.match(answer, /Onboarding execute for ACCG01/);
    assert.match(answer, /AUTO_RESPOND: false/);
    assert.match(answer, /did not invent ClientCodes, workspaces, projects, or Hub-MI/);
    assert.match(answer, /LIVE execution: false/);
    assert.equal(/sent mail|delivery receipt|CPL01|SYN01|invented workspace|invented project/i.test(answer), false);
  });

  it('does not treat an outside sixth-client execute ask as LIVE or invented roster', () => {
    const pack = composeOnboardingExecuteHonesty({
      question: 'Start onboarding CPL01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:cpl-invented',
          title: 'CPL01 invented project',
          clientCode: 'CPL01',
          projectName: 'CPL01 invented workspace',
        }),
      ],
    });
    assert.equal(pack.intent, 'execute');
    assert.equal(pack.clientCode, undefined);
    assert.equal(pack.recordedCount, 0);
    assert.equal(pack.liveEvidence, false);
    assert.equal(pack.liveExecution, false);
    assert.equal(pack.mayExecute, false);
    assert.equal(pack.invented, false);
    assert.equal(onboardingHonestyShouldCallExecute(pack), false);
    assert.ok(pack.items.some((row) => /sixth client/i.test(row)));
    assert.deepEqual(pack.entitledCodes, ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    const answer = answerOnboardingExecuteHonesty('Start onboarding CPL01', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [],
    });
    assert.match(answer, /Execute not allowed/);
    assert.equal(/CPL01 workspace|invented project|LIVE execution: true/i.test(answer), false);
  });

  it('never calls execute for status questions even with an entitled overlay run', () => {
    const pack = composeOnboardingExecuteHonesty({
      question: 'Where are we on onboarding ACCG?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:accg-1',
          title: 'ACCG01 entitled onboarding',
          clientCode: 'ACCG01',
          projectName: 'ACCG01 - Onboarding',
        }),
      ],
    });
    assert.equal(pack.intent, 'status');
    assert.equal(pack.mayExecute, false);
    assert.equal(pack.execute, false);
    assert.equal(pack.liveExecution, false);
    assert.equal(onboardingHonestyShouldCallExecute(pack), false);
    const answer = answerOnboardingExecuteHonesty('Where are we on onboarding ACCG?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledItems: [
        entitledRun({
          runId: 'run:accg-1',
          title: 'ACCG01 entitled onboarding',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Status questions do not execute onboarding/);
    assert.equal(/Executed governed/i.test(answer), false);
  });
});
