/**
 * ATLAS-ONBOARDING-HANDOFF-COMMS-001
 * Canonical onboarding COMMUNICATION CONTEXT: entitled same-scope
 * relatedEmail on onboarding agent records. Reuses relatedEmails() —
 * no second communications product. Fail-closed. DRAFT_ONLY. No send.
 * Client A never receives Client B.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attachRelatedContextToOnboarding } from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyCapitalSubmissionPayload } from '../src/pm/operatorDesk/capitalSubmissionPrepare.ts';
import { emptyMailThreadPayload } from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyResearchIntelligencePayload } from '../src/pm/operatorDesk/researchIntelligence.ts';
import { emptyOnboardingPayload } from '../src/pm/operatorDesk/onboardingAgent.ts';
import { emptyClientSupportPayload } from '../src/pm/operatorDesk/clientSupportAgent.ts';
import {
  COMMUNICATIONS_AUTO_RESPOND,
  COMMUNICATIONS_POLICY_CLASS,
  COMMUNICATIONS_SEND,
  type AtlasAuthorizedSearch,
  type MailThreadOperatingRecord,
  type OnboardingAgentRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Team Member'],
};

const otherStaff: AtlasPrincipal = {
  userId: '22222222-2222-4222-8222-bbbbbbbbbb02',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ZZZ99'],
  roles: ['HVCG Team Member'],
};

function onboardingRecord(overrides: Partial<OnboardingAgentRecord> = {}): OnboardingAgentRecord {
  return {
    id: 'proj-onboard-1',
    title: 'New client onboarding',
    clientCode: 'SYN01',
    evidenceKind: 'project',
    classification: 'CONFIRMED',
    provenance: 'CONFIRMED',
    invented: false,
    hubMiRow: false,
    execute: false,
    activate: false,
    send: false,
    liveGtmOutbound: false,
    evidence: [
      {
        kind: 'project',
        id: 'proj-onboard-1',
        title: 'New client onboarding',
        source: 'HVCG_Projects',
        classification: 'CONFIRMED',
      },
    ],
    missingRequirements: ['Owner must review and decide activation / onboarding completion.'],
    ownerDecisions: [
      { decision: 'Activate ClientStage to Active Client', status: 'escalated', execute: false },
    ],
    nextAction: 'Owner review of this entitled intake.',
    ...overrides,
  };
}

function thread(overrides: Partial<MailThreadOperatingRecord> = {}): MailThreadOperatingRecord {
  return {
    id: 'thread-syn-1',
    conversationId: 'conv-syn-1',
    title: 'SYN01 onboarding kickoff thread',
    clientCode: 'SYN01',
    channel: 'Email',
    preview: 'Can we confirm the kickoff agenda?',
    summary: 'Indexed preview only. Can we confirm the kickoff agenda?',
    summarySource: 'indexed_preview_only',
    invented: false,
    classification: 'CONFIRMED',
    provenance: 'CONFIRMED',
    commitments: [],
    unansweredQuestions: [],
    suggestedDraft: {
      policyClass: COMMUNICATIONS_POLICY_CLASS,
      send: COMMUNICATIONS_SEND,
      autoRespond: COMMUNICATIONS_AUTO_RESPOND,
      subject: 'Re: SYN01 onboarding kickoff thread',
      body: 'Draft only.',
      status: 'draft',
    },
    ...overrides,
  };
}

function searchWithThreads(
  onboarding: OnboardingAgentRecord[],
  threads: MailThreadOperatingRecord[],
): AtlasAuthorizedSearch {
  return {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: false,
    query: 'SYN01',
    hitCount: 0,
    hits: [],
    documents: {
      kind: 'document_operating_record_v1',
      policyClass: 'READ_AUTO',
      binariesInAtlas: false,
      items: [],
    },
    projects: {
      kind: 'project_operating_record_v1',
      policyClass: 'READ_AUTO',
      invented: false,
      currentClientsFirst: true,
      items: [],
    },
    threads: {
      ...emptyMailThreadPayload(),
      items: threads,
    },
    capitalSubmissions: emptyCapitalSubmissionPayload(),
    researchIntelligence: emptyResearchIntelligencePayload('2026-08-25T07:00:00.000Z'),
    onboarding: {
      ...emptyOnboardingPayload(),
      items: onboarding,
    },
    clientSupport: emptyClientSupportPayload(),
    classification: 'CONFIRMED',
    why: 'test',
    basedOn: 'test',
    entitled: true,
    ran: true,
    pictureComposed: true,
    actionabilityApplied: false,
  };
}

describe('ATLAS-ONBOARDING-HANDOFF-COMMS-001 entitled same-scope threads', () => {
  it('attaches same-scope relatedEmail on entitled onboarding A', () => {
    const current = attachRelatedContextToOnboarding(
      staff,
      onboardingRecord(),
      searchWithThreads([onboardingRecord()], [thread()]),
    );
    const related = current.relatedEmail?.find((row) => row.id === 'thread-syn-1');
    assert.ok(related);
    assert.equal(related?.title, 'SYN01 onboarding kickoff thread');
    assert.equal(related?.conversationId, 'conv-syn-1');
    assert.equal(current.send, false);
    assert.equal(current.liveGtmOutbound, false);
    assert.equal(JSON.stringify(current.relatedEmail).includes('PDG01'), false);
    assert.equal(/AUTO_RESPOND|contentBytes|downloadUrl/i.test(JSON.stringify(current.relatedEmail)), false);
  });

  it('never copies Client B threads onto Client A onboarding', () => {
    const mixed = attachRelatedContextToOnboarding(
      staff,
      onboardingRecord(),
      searchWithThreads(
        [onboardingRecord()],
        [
          thread(),
          thread({
            id: 'thread-pdg',
            conversationId: 'conv-pdg',
            title: 'PDG01 foreign thread',
            clientCode: 'PDG01',
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedEmail?.some((row) => row.id === 'thread-syn-1'), true);
    assert.equal(mixed.relatedEmail?.some((row) => row.id === 'thread-pdg'), false);
    assert.equal(JSON.stringify(mixed.relatedEmail).includes('PDG01'), false);
  });

  it('omits relatedEmail when onboarding ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToOnboarding(
      staff,
      onboardingRecord({ clientCode: undefined }),
      searchWithThreads([onboardingRecord({ clientCode: undefined })], [thread()]),
    );
    assert.equal(omitted.relatedEmail, undefined);
    assert.equal('relatedEmail' in omitted, false);
  });

  it('omits relatedEmail when onboarding ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToOnboarding(
      staff,
      onboardingRecord({ clientCode: 'not-a-code' }),
      searchWithThreads([onboardingRecord({ clientCode: 'not-a-code' })], [thread()]),
    );
    assert.equal(omitted.relatedEmail, undefined);
    assert.equal('relatedEmail' in omitted, false);
  });

  it('omits relatedEmail for unauthorized principals', () => {
    const denied = attachRelatedContextToOnboarding(
      otherStaff,
      onboardingRecord(),
      searchWithThreads([onboardingRecord()], [thread()]),
    );
    assert.equal(denied.relatedEmail, undefined);
    assert.equal('relatedEmail' in denied, false);
  });

  it('honestly omits relatedEmail when no entitled threads exist', () => {
    const alone = attachRelatedContextToOnboarding(
      staff,
      onboardingRecord(),
      searchWithThreads([onboardingRecord()], []),
    );
    assert.equal(alone.relatedEmail, undefined);
    assert.equal('relatedEmail' in alone, false);
  });
});
