/**
 * ATLAS-ONBOARDING-RELATED-CAPITAL-001
 * Canonical onboarding CAPITAL CONTEXT: entitled same-scope PREPARE_ONLY
 * relatedCapital on onboarding agent records. Reuses relatedCapital() —
 * no second capital product. Fail-closed. Client A never receives Client B.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { getClientContext, searchAuthorizedKnowledge } from '../src/pm/operatorDesk/toolGateway.ts';
import { attachRelatedContextToOnboarding } from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyCapitalSubmissionPayload } from '../src/pm/operatorDesk/capitalSubmissionPrepare.ts';
import { emptyMailThreadPayload } from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyResearchIntelligencePayload } from '../src/pm/operatorDesk/researchIntelligence.ts';
import { emptyOnboardingPayload } from '../src/pm/operatorDesk/onboardingAgent.ts';
import { emptyClientSupportPayload } from '../src/pm/operatorDesk/clientSupportAgent.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type CapitalSubmissionPrepareRecord,
  type OnboardingAgentRecord,
  type OperatorOperatingPicture,
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

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function onboardingService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
          clientStage: 'Prospect',
        },
      ];
    },
    async listAuthorizedProjects() {
      return [
        {
          id: 'proj-onboard-1',
          name: 'New client onboarding',
          clientCode: 'SYN01',
          objective: 'Finish entitled onboarding checklist.',
          status: 'active',
        },
      ] as never;
    },
    async listAuthorizedTasks() {
      return [] as never;
    },
    async listWorkspaceCollections() {
      return emptyCollection;
    },
    async listOpportunities() {
      return [];
    },
    async listLeads() {
      return [];
    },
  };
}

function picture(): OperatorOperatingPicture {
  return emptyHonestOperatingPicture();
}

function syn01CapitalHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'capital_opportunity' as const,
    id: 'cap-syn-1',
    title: 'SYN01 entitled capital opportunity',
    href: '/capital?opportunity=cap-syn-1',
    source: 'HVCG_CapitalOpportunities',
    clientCode: 'SYN01',
    provenance: 'CONFIRMED' as const,
    ...overrides,
  };
}

function syn01OnboardingRecord(overrides: Partial<OnboardingAgentRecord> = {}): OnboardingAgentRecord {
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

function syn01CapitalRecord(
  overrides: Partial<CapitalSubmissionPrepareRecord> = {},
): CapitalSubmissionPrepareRecord {
  return {
    id: 'cap-syn-1',
    title: 'SYN01 entitled capital opportunity',
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    provenance: 'CONFIRMED',
    invented: false,
    financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
    financingStatusClassification: 'HONEST_EMPTY',
    lenderCriteriaInvented: false,
    evidence: [
      {
        kind: 'capital_opportunity',
        id: 'cap-syn-1',
        title: 'SYN01 entitled capital opportunity',
        source: 'HVCG_CapitalOpportunities',
        classification: 'CONFIRMED',
      },
    ],
    missingRequirements: [
      'Owner must review and approve before any external lender/investor submission.',
    ],
    nextAction:
      'Owner review of this PREPARE-only package. External lender/investor submission remains owner-gated.',
    ...overrides,
  };
}

function emptyRelatedSearch(
  onboarding: OnboardingAgentRecord[],
  capital: CapitalSubmissionPrepareRecord[] = [],
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
    threads: emptyMailThreadPayload(),
    capitalSubmissions: {
      ...emptyCapitalSubmissionPayload(),
      items: capital,
    },
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

describe('ATLAS-ONBOARDING-RELATED-CAPITAL-001 entitled same-scope inverse', () => {
  it('attaches same-scope PREPARE_ONLY relatedCapital on entitled onboarding A', async () => {
    const found = await searchSharePointPm(onboardingService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01CapitalHit()],
      }),
    });
    const current = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(current);
    assert.ok(capital);
    const related = current.relatedCapital?.find((row) => row.id === 'cap-syn-1');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 entitled capital opportunity');
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(related.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(related.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(related.lenderCriteriaInvented, false);
    assert.equal(related.invented, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(JSON.stringify(current.relatedCapital).includes('PDG01'), false);
    assert.equal(/TargetAmount|downloadUrl|Hub-MI|contentBytes|5000000/i.test(JSON.stringify(current.relatedCapital)), false);

    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledIndexHits: [...found.results, syn01CapitalHit()],
    });
    const ctxRow = viaIndex.clientContext.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.deepEqual(ctxRow?.relatedCapital, current.relatedCapital);
  });

  it('never attaches Client B capital to a Client A onboarding record', () => {
    const mixed = attachRelatedContextToOnboarding(
      staff,
      syn01OnboardingRecord(),
      emptyRelatedSearch(
        [syn01OnboardingRecord()],
        [
          syn01CapitalRecord(),
          syn01CapitalRecord({
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            clientCode: 'PDG01',
          }),
          syn01CapitalRecord({
            id: 'cap-lender-catalog',
            title: 'Live Oak Bank catalog',
            clientCode: undefined,
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(
      (mixed.relatedCapital || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('PDG01'), false);
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('cap-pdg'), false);
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('cap-lender-catalog'), false);
  });

  it('omits relatedCapital when onboarding ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToOnboarding(
      staff,
      syn01OnboardingRecord({ id: 'onboard-unscoped', clientCode: undefined }),
      emptyRelatedSearch([syn01OnboardingRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
  });

  it('omits relatedCapital when onboarding ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToOnboarding(
      staff,
      syn01OnboardingRecord({ id: 'onboard-noncanonical', clientCode: 'syn01' }),
      emptyRelatedSearch([syn01OnboardingRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
  });

  it('omits relatedCapital for unauthorized principals', () => {
    const denied = attachRelatedContextToOnboarding(
      otherStaff,
      syn01OnboardingRecord(),
      emptyRelatedSearch([syn01OnboardingRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(denied.relatedCapital, undefined);
    assert.equal('relatedCapital' in denied, false);
  });

  it('honestly omits relatedCapital when no entitled capital exists', () => {
    const alone = attachRelatedContextToOnboarding(
      staff,
      syn01OnboardingRecord(),
      emptyRelatedSearch([syn01OnboardingRecord()]),
    );
    assert.equal(alone.relatedCapital, undefined);
    assert.equal('relatedCapital' in alone, false);
    assert.equal(alone.invented, false);
    assert.equal(alone.execute, false);
    assert.equal(alone.activate, false);
    assert.equal(alone.send, false);
  });
});
