/**
 * ATLAS-RESEARCH-INTELLIGENCE-001
 * + ATLAS-RESEARCH-INTELLIGENCE-RELATED-MEETINGS-001
 * Smallest Hub increment: source-backed research intelligence from
 * already-entitled Atlas/index evidence and the existing sourced lender
 * catalog titles. Stores source, retrieval date, confidence, superseded.
 * Never invent lender criteria or financing status. No live scrape / GTM.
 * Authorization before retrieval. No cross-client leak.
 * Optional relatedMeetings copies already-authorized same-scope
 * HVCG_Meetings refs (same inverse as capital / onboarding / client
 * support). Fail-closed when ClientCode is missing. No invented
 * ClientCodes. No new Graph calendar query.
 * + ATLAS-MEETING-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on MeetingOperatingRecord copies already-
 * authorized same-scope researchIntelligence items. Fail-closed when the
 * meeting ClientCode is missing. Unscoped lender catalog titles never
 * attach to a scoped meeting. No new research / KG product.
 * + ATLAS-ONBOARDING-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on OnboardingAgentRecord copies the same
 * already-authorized same-scope researchIntelligence items (same
 * RelatedMeetingResearchRef). Fail-closed when the onboarding ClientCode
 * is missing. Unscoped lender catalog titles never attach to a scoped
 * onboarding item. No new research / KG / onboarding product.
 * + ATLAS-ONBOARDING-RELATED-DOCUMENTS-001
 * Inverse relatedDocuments on OnboardingAgentRecord copies
 * already-authorized same-scope documents / hits kind=document (same
 * RelatedMeetingDocumentRef / relatedDocumentsForMeeting path as
 * meetings / research-intel / projects / threads / capital). There is
 * no document.onboardingRelationship field. Fail-closed when ClientCode
 * is missing / non-canonical. Unscoped never receives scoped document
 * refs. Unscoped lender catalog titles never attach scoped documents.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No TargetAmount. No Hub-MI invention. No invented
 * execute/activate/send. relatedMeetings / researchRelationship stay
 * as composed. OWNER_ESCALATE / execute=false / activate=false /
 * send=false / liveGtmOutbound=false / ownerGated=true / hubMi=false
 * stay as composed. No new Graph / search / KG / document /
 * onboarding product.
 * + ATLAS-CLIENT-SUPPORT-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on ClientSupportAgentRecord copies the same
 * already-authorized same-scope researchIntelligence items (same
 * RelatedMeetingResearchRef). Fail-closed when the support ClientCode
 * is missing. Unscoped lender catalog titles never attach to a scoped
 * support item. No new research / KG / support product.
 * + ATLAS-CLIENT-SUPPORT-RELATED-DOCUMENTS-001
 * Inverse relatedDocuments on ClientSupportAgentRecord copies
 * already-authorized same-scope documents / hits kind=document (same
 * RelatedMeetingDocumentRef / relatedDocumentsForMeeting path as
 * meetings / research-intel / projects / threads / capital /
 * onboarding). There is no document.clientSupportRelationship field.
 * Fail-closed when ClientCode is missing / non-canonical. Unscoped
 * never receives scoped document refs. Unscoped lender catalog titles
 * never attach scoped documents. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No TargetAmount.
 * No Hub-MI invention. No invented execute/send/autoRespond.
 * relatedMeetings / researchRelationship stay as composed.
 * OWNER_ESCALATE / execute=false / send=false / autoRespond=false /
 * draftOnly=true / hubMi=false stay as composed. No new Graph /
 * search / KG / document / support product.
 * + ATLAS-CAPITAL-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on CapitalSubmissionPrepareRecord copies
 * the same already-authorized same-scope researchIntelligence items
 * (same RelatedMeetingResearchRef). Fail-closed when the capital
 * ClientCode is missing. Unscoped lender catalog titles never attach
 * to a scoped capital row. PREPARE_ONLY stays as composed. No new
 * research / KG / capital product.
 * + ATLAS-CAPITAL-RELATED-DOCUMENTS-001
 * Inverse relatedDocuments on CapitalSubmissionPrepareRecord copies
 * already-authorized same-scope documents / hits kind=document (same
 * RelatedMeetingDocumentRef / relatedDocumentsForMeeting path as
 * meetings / research-intel / projects / threads). Inverse of
 * document.capitalRelationship. Fail-closed when ClientCode is missing
 * / non-canonical. Unscoped never receives scoped document refs.
 * Unscoped lender catalog titles never attach scoped documents.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No TargetAmount. No Hub-MI invention. No invented
 * lender criteria, fit, or financing status. relatedMeetings /
 * researchRelationship stay as composed. PREPARE_ONLY / send=false /
 * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN
 * stay as composed. No new Graph / search / KG / document / capital
 * product.
 * + ATLAS-CAPITAL-PREPARE-RELATED-ATTACHMENTS-001
 * Optional relatedAttachments on CapitalSubmissionPrepareRecord copies
 * already-indexed same-scope outlook-mail-attachment metadata (same
 * RelatedDocumentAttachmentRef / relatedAttachments path as documents
 * / meetings / onboarding / client-support). Fail-closed when
 * ClientCode is missing / non-canonical. Unscoped never receives
 * scoped attachments. Unscoped lender catalog titles never attach
 * scoped attachments. Client A never receives Client B. SAS /
 * anonymous webUrl dropped. No downloadUrl. No contentBytes.
 * binariesInAtlas stays false. No invented attachment names / ids /
 * counts, ClientCodes, Hub-MI, TargetAmount, lender criteria, fit, or
 * financing status. relatedMeetings / relatedDocuments /
 * researchRelationship stay as composed. PREPARE_ONLY / send=false /
 * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN
 * stay as composed. Not a second attachment or capital product. Not
 * external submit. Not send.
 * + ATLAS-DOCUMENT-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on DocumentOperatingRecord copies the
 * same already-authorized same-scope researchIntelligence items
 * (same RelatedMeetingResearchRef). Fail-closed when the document
 * ClientCode is missing. Unscoped lender catalog titles never attach
 * to a scoped document. Preview stays time-limited Graph preview only.
 * No new research / KG / document product.
 * + ATLAS-PROJECT-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on ProjectOperatingRecord copies the
 * same already-authorized same-scope researchIntelligence items
 * (same RelatedMeetingResearchRef). Fail-closed when the project
 * ClientCode is missing. Unscoped lender catalog titles never attach
 * to a scoped project. relatedMeetings stays as composed. No new
 * research / KG / project product.
 * + ATLAS-PROJECT-RELATED-DOCUMENTS-001
 * Inverse relatedDocuments on ProjectOperatingRecord copies already-
 * authorized same-scope documents / hits kind=document (same
 * RelatedMeetingDocumentRef / relatedDocumentsForMeeting path as
 * meetings / research-intel). Inverse of document.relatedProject.
 * Fail-closed when ClientCode is missing / non-canonical. Unscoped
 * never receives scoped document refs. Client A never receives Client
 * B. SAS / anonymous webUrl dropped. No downloadUrl. No TargetAmount.
 * No Hub-MI invention. relatedMeetings / researchRelationship stay as
 * composed. No new Graph / search / KG / document product.
 * + ATLAS-THREAD-RESEARCH-RELATIONSHIP-001
 * Inverse researchRelationship on MailThreadOperatingRecord copies the
 * same already-authorized same-scope researchIntelligence items
 * (same RelatedMeetingResearchRef). Fail-closed when the thread
 * ClientCode is missing. Unscoped lender catalog titles never attach
 * to a scoped thread. relatedMeetings stays as composed. DRAFT_ONLY /
 * send=false / autoRespond=false / indexedPreviewOnly stay as
 * composed. No new research / KG / communications product.
 * + ATLAS-THREAD-RELATED-DOCUMENTS-001
 * Inverse relatedDocuments on MailThreadOperatingRecord copies already-
 * authorized same-scope documents / hits kind=document (same
 * RelatedMeetingDocumentRef / relatedDocumentsForMeeting path as
 * meetings / research-intel / projects). Inverse of document.relatedEmail.
 * Fail-closed when ClientCode is missing / non-canonical. Unscoped
 * never receives scoped document refs. Client A never receives Client
 * B. SAS / anonymous webUrl dropped. No downloadUrl. No TargetAmount.
 * No Hub-MI invention. No preview body / suggestedDraft / send on the
 * refs. relatedMeetings / researchRelationship stay as composed.
 * DRAFT_ONLY / send=false / autoRespond=false / indexedPreviewOnly
 * stay as composed. No new Graph / search / KG / document /
 * communications product.
 * + ATLAS-RESEARCH-INTELLIGENCE-RELATED-DOCUMENTS-001
 * Optional relatedDocuments copies already-authorized same-scope
 * documents / hits kind=document (same RelatedMeetingDocumentRef /
 * relatedDocumentsForMeeting path as meetings). Fail-closed when
 * ClientCode is missing. Unscoped lender catalog rows never receive
 * scoped documents. relatedMeetings stays as composed. Preview stays
 * off this slice (refs only). No new research / KG / document product.
 * + ATLAS-RESEARCH-INTELLIGENCE-RELATED-PROJECTS-001
 * Optional relatedProjects copies already-authorized same-scope
 * projects (same RelatedDocumentProjectRef / relatedProjects path as
 * document / meeting relatedProject). Fail-closed when ClientCode is
 * missing. Unscoped lender catalog rows never receive scoped projects.
 * relatedMeetings and relatedDocuments stay as composed. Classification
 * stays CONFIRMED / LIKELY / PROPOSED / STALE_OR_UNCERTAIN / COMPLETE.
 * hubMiRow stays as composed (never invented). No new research / KG /
 * project product.
 * + ATLAS-RESEARCH-INTELLIGENCE-RELATED-THREADS-001
 * Optional relatedThreads copies already-authorized same-scope
 * mail-thread refs (same RelatedDocumentEmailRef / relatedEmails path
 * as document/meeting relatedEmail). Fail-closed when ClientCode is
 * missing. Unscoped lender catalog rows never receive scoped threads.
 * relatedMeetings, relatedDocuments, and relatedProjects stay as
 * composed. Refs only — no preview body, suggestedDraft, or send.
 * DRAFT_ONLY / send=false / autoRespond=false / indexedPreviewOnly
 * stay as composed on the thread payload. No new research / KG /
 * communications product.
 * + ATLAS-RESEARCH-INTELLIGENCE-RELATED-CAPITAL-001
 * Optional relatedCapital copies already-authorized same-scope
 * capital-prepare refs (same RelatedDocumentCapitalRef / relatedCapital
 * path as document/meeting capitalRelationship). Fail-closed when
 * ClientCode is missing. Unscoped lender catalog rows never receive
 * scoped capital. relatedMeetings, relatedDocuments, relatedProjects,
 * and relatedThreads stay as composed. PREPARE_ONLY / send=false /
 * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN /
 * HONEST_EMPTY stay as composed. Never invent TargetAmount, lender
 * criteria, fit, or financing status. No new research / KG / capital
 * product.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CATALOG_VERIFIED_AT } from '@hvcg/atlas-capital-core';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import {
  getClientContext,
  loadClientContext,
  searchAuthorizedKnowledge,
} from '../src/pm/operatorDesk/toolGateway.ts';
import {
  composeResearchIntelligence,
  emptyResearchIntelligencePayload,
  refreshResearchIntelligence,
  researchIntelligenceHasInventedFacts,
} from '../src/pm/operatorDesk/researchIntelligence.ts';
import {
  attachRelatedContextToMeetings,
  attachRelatedContextToMeeting,
  attachRelatedContextToOnboarding,
  attachRelatedContextToOnboardingRecord,
  attachRelatedContextToClientSupport,
  attachRelatedContextToClientSupportRecord,
  attachRelatedContextToCapitalSubmission,
  attachRelatedContextToCapitalSubmissions,
  attachRelatedContextToDocument,
  attachRelatedContextToDocuments,
  attachRelatedContextToProject,
  attachRelatedContextToProjects,
  attachRelatedContextToMailThread,
  attachRelatedContextToMailThreads,
  attachRelatedContextToResearchIntelligence,
  attachRelatedContextToResearchIntelligenceRecord,
  DOCUMENT_RELATED_CONTEXT_PAGE_SIZE,
} from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyMeetingOperatingPayload } from '../src/pm/operatorDesk/meetingOperatingRecord.ts';
import { emptyOnboardingPayload } from '../src/pm/operatorDesk/onboardingAgent.ts';
import { emptyClientSupportPayload } from '../src/pm/operatorDesk/clientSupportAgent.ts';
import { emptyCapitalSubmissionPayload } from '../src/pm/operatorDesk/capitalSubmissionPrepare.ts';
import { emptyMailThreadPayload } from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY,
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type AtlasClientContext,
  type CapitalSubmissionPrepareRecord,
  type ClientSupportAgentRecord,
  type DocumentOperatingRecord,
  type MailThreadOperatingRecord,
  type MeetingOperatingRecord,
  type OnboardingAgentRecord,
  type ProjectOperatingRecord,
  type OperatorOperatingPicture,
  type ResearchIntelligencePayload,
  type ResearchIntelligenceRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Team Member'],
};

const manny: AtlasPrincipal = {
  userId: MANNY_ENTRA_OID,
  organizationId: 'org-hvcg',
  allowedClientIds: ['*'],
  roles: ['HVCG Owner'],
};

const otherStaff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa02',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Team Member'],
};

const MEETING_SOURCE = 'https://outlook.office.com/calendar/item/syn01-standup';
const DOC_SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/intake-memo.pdf';
const ATT_PARENT_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-att-parent';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function researchService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
          industry: 'Food Manufacturing',
        },
      ];
    },
    async listAuthorizedProjects() {
      return [];
    },
    async listAuthorizedTasks() {
      return [];
    },
    async listWorkspaceCollections() {
      return emptyCollection;
    },
    async listOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
    async listVendors() {
      return [{ id: 'vnd-1', title: 'SYNTHETIC VendorCo', notes: 'tenant vendor', category: 'Ops' }];
    },
    async listLenders() {
      return [
        { id: 'ln-liveoak', title: 'Live Oak Bank', notes: 'Existing entitled catalog title' },
        { id: 'ln-invent', title: 'Invented Lender LTV 80', notes: 'must not leak as criteria' },
      ];
    },
  };
}

function picture(): OperatorOperatingPicture {
  return {
    ...emptyHonestOperatingPicture(),
    hvsRecoveredClients: [
      {
        client: 'SYNTHETIC Alpha Co',
        clientCode: 'SYN01',
        provenance: 'CONFIRMED',
        operationalized: false,
        hubMiAccessible: false,
        knowledgeIndexed: true,
        documentCount: 1,
        documentClasses: ['capital_package'],
        nextAction: 'Review recovered capital-packet filename.',
      },
    ],
  };
}

function noInventedCriteria(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/best[_ ]?fit/i.test(serialized), false);
  assert.equal(/credit box/i.test(serialized), false);
  assert.equal(/FundingStatus["']?\s*:\s*["'](?:Committed|Closed|Funded)/i.test(serialized), false);
}

function assertSourceBacked(
  payload: AtlasClientContext['researchIntelligence'] | AtlasAuthorizedSearch['researchIntelligence'],
): void {
  assert.equal(payload.kind, 'research_intelligence_v1');
  assert.equal(payload.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
  assert.equal(payload.outboundRefresh, RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH);
  assert.equal(payload.invented, false);
  assert.equal(payload.lenderCriteriaInvented, false);
  assert.equal(payload.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
  assert.equal(researchIntelligenceHasInventedFacts(payload), false);
  for (const row of payload.items) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.ok(row.source.trim());
    assert.ok(row.retrievalDate.trim());
    assert.ok(row.confidence);
    assert.equal(typeof row.superseded, 'boolean');
  }
}

describe('ATLAS-RESEARCH-INTELLIGENCE-001 source-backed research records', () => {
  it('keeps research intelligence SOURCE_BACKED_ONLY with no outbound refresh', () => {
    assert.equal(ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY, 'ATLAS-RESEARCH-INTELLIGENCE-001');
    assert.equal(RESEARCH_INTELLIGENCE_POLICY_CLASS, 'SOURCE_BACKED_ONLY');
    assert.equal(RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH, false);
    assert.equal(RESEARCH_INTELLIGENCE_FINANCING_STATUS, 'UNKNOWN');
    assert.equal(RESEARCH_INTELLIGENCE_FIT, 'NOT_EVALUATED');
  });

  it('stores source, retrieval date, confidence, and superseded from entitled evidence', async () => {
    const found = await searchSharePointPm(researchService(), staff, 'SYN01');
    const clientHit = found.results.find((row) => row.kind === 'client' && row.clientCode === 'SYN01');
    assert.ok(clientHit);
    assert.equal(clientHit.industry, 'Food Manufacturing');
    assert.equal(found.results.some((row) => row.kind === 'lender'), false);
    assert.equal(found.results.some((row) => row.kind === 'vendor'), false);

    const retrievedAt = '2026-08-24T09:51:00.000Z';
    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      now: retrievedAt,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now: retrievedAt,
      entitledIndexHits: found.results,
    });
    assert.deepEqual(viaIndex.clientContext.researchIntelligence, search.authorizedSearch.researchIntelligence);
    assertSourceBacked(search.authorizedSearch.researchIntelligence);

    const client = search.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.source, 'HVCG_Clients');
    assert.equal(client.retrievalDate, retrievedAt);
    assert.equal(client.superseded, false);
    assert.equal(client.financingStatus, 'UNKNOWN');

    const industry = search.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'industry' && row.title === 'Food Manufacturing',
    );
    assert.ok(industry);
    assert.equal(industry.source, 'HVCG_Clients');
    assert.equal(industry.clientCode, 'SYN01');
    assert.equal(industry.lenderCriteriaInvented, false);

    noInventedCriteria(search.authorizedSearch.researchIntelligence);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now: retrievedAt,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.researchIntelligence, search.authorizedSearch.researchIntelligence);
  });

  it('copies entitled lender/vendor titles and supersedes older catalog retrievals without inventing fit', async () => {
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: [
        {
          kind: 'client',
          id: 'SYN01',
          title: 'SYN01 · SYNTHETIC Alpha Co',
          href: '/clients/SYN01',
          source: 'HVCG_Clients',
          clientCode: 'SYN01',
          industry: 'Food Manufacturing',
        },
      ],
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.researchIntelligence.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('Food Manufacturing'), false);

    const leak = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async () => ({
        query: 'SYN01',
        results: [
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.researchIntelligence).includes('PDG01'), false);
    assert.equal(JSON.stringify(leak.authorizedSearch.researchIntelligence).includes('Hidden Industry'), false);
    assertSourceBacked(leak.authorizedSearch.researchIntelligence);

    const catalog = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      now: '2026-08-24T12:00:00.000Z',
      entitledSearch: async () => ({
        query: 'Live Oak',
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
            modifiedAt: '2026-08-24T12:00:00.000Z',
          },
          {
            kind: 'vendor' as const,
            id: 'vnd-1',
            title: 'SYNTHETIC VendorCo',
            href: '/procurement',
            source: 'HVCG_Vendors',
          },
        ],
      }),
    });
    assertSourceBacked(catalog.authorizedSearch.researchIntelligence);
    const lenders = catalog.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.some((row) => row.title === 'Live Oak Bank' && row.source === 'HVCG_Lenders' && row.superseded === false));
    const catalogCopy = lenders.find((row) => row.id === 'lender:ln-catalog-liveoak');
    assert.ok(catalogCopy);
    assert.equal(catalogCopy.retrievalDate, CATALOG_VERIFIED_AT);
    assert.equal(catalogCopy.superseded, true);
    assert.equal(catalogCopy.fit, 'NOT_EVALUATED');
    assert.equal(catalogCopy.lenderCriteriaInvented, false);
    const vendor = catalog.authorizedSearch.researchIntelligence.items.find((row) => row.subjectKind === 'vendor');
    assert.ok(vendor);
    assert.equal(vendor.title, 'SYNTHETIC VendorCo');
    assert.equal(vendor.source, 'HVCG_Vendors');
    noInventedCriteria(catalog.authorizedSearch.researchIntelligence);
  });

  it('marks older same-key research superseded on refresh and never invents investor criteria', () => {
    const first: ResearchIntelligenceRecord = {
      id: 'lender:ln-1',
      subjectKind: 'lender',
      title: 'Live Oak Bank',
      source: 'HVCG_Lenders',
      retrievalDate: '2026-08-18T00:00:00.000Z',
      confidence: 'CONFIRMED',
      superseded: false,
      classification: 'CONFIRMED',
      invented: false,
      lenderCriteriaInvented: false,
      financingStatus: 'UNKNOWN',
      fit: 'NOT_EVALUATED',
      evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
    };
    const second: ResearchIntelligenceRecord = {
      ...first,
      id: 'lender:ln-1:refresh',
      retrievalDate: '2026-08-24T12:00:00.000Z',
    };
    const refreshed = refreshResearchIntelligence([first], [second]);
    assert.equal(refreshed.filter((row) => !row.superseded).length, 1);
    assert.equal(refreshed.find((row) => !row.superseded)?.retrievalDate, '2026-08-24T12:00:00.000Z');
    assert.equal(refreshed.find((row) => row.superseded)?.supersededBy, 'lender:ln-1:refresh');

    const composed = composeResearchIntelligence(
      [
        {
          kind: 'investor',
          id: 'inv-1',
          title: 'Family office intro',
          source: 'HVCG_CapitalSources',
          why: 'entitled',
          basedOn: 'entitled',
          provenance: 'CONFIRMED',
          classification: 'CONFIRMED',
        } satisfies AtlasAuthorizedSearchHit,
      ],
      '2026-08-24T12:00:00.000Z',
    );
    assertSourceBacked(composed);
    assert.equal(composed.items[0]?.subjectKind, 'investor');
    assert.equal(composed.items[0]?.financingStatus, 'UNKNOWN');
    assert.equal(composed.items[0]?.fit, 'NOT_EVALUATED');
    noInventedCriteria(composed);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-research-intel-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      HOST: process.env.INTEGRATION_HOST,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      TENANT: process.env.MICROSOFT_TENANT_ID,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
    };
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_PM_BACKEND = 'development-json';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: async () => {
        const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
        err.status = 401;
        err.code = 'invalid_token';
        throw err;
      },
    };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = createAuthorizedPmRepository(cfg);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const server = createServer((req, res) => {
      handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
      const unsignedSearch = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=SYN01`);
      const searchText = await unsignedSearch.text();
      assert.equal(unsignedSearch.status, 401);
      const searchBody = JSON.parse(searchText) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(searchBody.error, 'unauthorized');
      assert.equal(searchBody.authorizedSearch, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Research SYN01 lenders')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|operatorDesk/i.test(runtimeText), false);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
      else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
    }
  });
});

function syn01ClientHit() {
  return {
    kind: 'client' as const,
    id: 'SYN01',
    title: 'SYN01 · SYNTHETIC Alpha Co',
    href: '/clients/SYN01',
    source: 'HVCG_Clients',
    clientCode: 'SYN01',
    industry: 'Food Manufacturing',
    modifiedAt: '2026-08-24T18:00:00.000Z',
  };
}

function syn01MeetingHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'meeting' as const,
    id: 'meet-syn-1',
    title: 'SYN01 weekly standup',
    href: '/clients/SYN01',
    source: 'HVCG_Meetings',
    clientCode: 'SYN01',
    webUrl: MEETING_SOURCE,
    provenance: 'CONFIRMED' as const,
    sourceEventId: 'AAMk-syn-cal-1',
    modifiedAt: '2026-08-21T15:00:00Z',
    ...overrides,
  };
}

function assertResearchHonesty(payload: ResearchIntelligencePayload): void {
  assertSourceBacked(payload);
  assert.equal(payload.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
  assert.equal(payload.outboundRefresh, false);
  assert.equal(payload.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
  assert.equal(payload.lenderCriteriaInvented, false);
  const withoutRelatedProjects = {
    ...payload,
    items: payload.items.map(({ relatedProjects: _relatedProjects, ...row }) => row),
  };
  const blob = JSON.stringify(withoutRelatedProjects);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  noInventedCriteria(payload);
  for (const row of payload.items) {
    for (const project of row.relatedProjects || []) {
      assert.equal(project.invented, false);
      assert.equal(typeof project.hubMiRow, 'boolean');
      assert.ok(
        project.classification === 'CONFIRMED' ||
          project.classification === 'LIKELY' ||
          project.classification === 'PROPOSED' ||
          project.classification === 'STALE_OR_UNCERTAIN' ||
          project.classification === 'COMPLETE',
      );
      assert.equal('downloadUrl' in project, false);
      assert.equal('transcript' in project, false);
      assert.equal('TargetAmount' in project, false);
      assert.equal('attendees' in project, false);
    }
    for (const thread of row.relatedThreads || []) {
      assert.equal('preview' in thread, false);
      assert.equal('suggestedDraft' in thread, false);
      assert.equal('send' in thread, false);
      assert.equal('autoRespond' in thread, false);
      assert.equal('downloadUrl' in thread, false);
      assert.equal('transcript' in thread, false);
      assert.equal('TargetAmount' in thread, false);
      assert.equal('attendees' in thread, false);
      assert.equal('hubMiRow' in thread, false);
    }
  }
}

describe('ATLAS-RESEARCH-INTELLIGENCE-RELATED-MEETINGS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedMeetings on entitled research items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const meeting = client.relatedMeetings?.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.title, 'SYN01 weekly standup');
    assert.equal(meeting.date, '2026-08-21T15:00:00Z');
    assert.equal(meeting.webUrl, MEETING_SOURCE);
    assert.equal(meeting.sourceEventId, 'AAMk-syn-cal-1');
    assert.ok((client.relatedMeetings?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(/downloadUrl|transcript|attendee/i.test(JSON.stringify(client.relatedMeetings)), false);
    assert.equal(JSON.stringify(client.relatedMeetings).includes('PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit()],
    });
    const ctxClient = viaIndex.clientContext.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(ctxClient);
    assert.equal(ctxClient.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxClient.relatedMeetings, client.relatedMeetings);
  });

  it('honestly omits relatedMeetings when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedMeetings, undefined);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never attaches Client B meetings to a Client A research item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          {
            kind: 'meeting' as const,
            id: 'meet-pdg',
            title: 'PDG01 leak standup',
            href: '/clients/PDG01',
            source: 'HVCG_Meetings',
            clientCode: 'PDG01',
            webUrl: 'https://outlook.office.com/calendar/item/pdg01-leak',
            provenance: 'CONFIRMED' as const,
            sourceEventId: 'AAMk-pdg-cal-1',
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((client.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.researchIntelligence.items.some((row) => row.clientCode === 'PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const mixed = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      {
        id: 'client:SYN01:synthetic alpha co',
        subjectKind: 'client',
        title: 'SYN01 · SYNTHETIC Alpha Co',
        source: 'HVCG_Clients',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        clientCode: 'SYN01',
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Clients title. Lender criteria and financing status were not invented.',
      },
      {
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
              sourceEventId: 'AAMk-syn-cal-1',
              date: '2026-08-21T15:00:00Z',
            },
            {
              id: 'meet-pdg',
              title: 'PDG01 leak standup',
              clientCode: 'PDG01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: 'https://outlook.office.com/calendar/item/pdg01-leak',
              sourceEventId: 'AAMk-pdg-cal-1',
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(mixed.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mixed.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mixed.relatedMeetings).includes('PDG01'), false);
  });

  it('omits relatedMeetings when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01MeetingHit(),
          {
            kind: 'meeting' as const,
            id: 'meet-unscoped',
            title: 'Internal research standup',
            href: '/meetings',
            source: 'HVCG_Meetings',
            webUrl: MEETING_SOURCE,
            provenance: 'PROPOSED' as const,
          },
        ],
      }),
    });
    const lenders = result.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.length);
    for (const row of lenders) {
      assert.equal(row.clientCode, undefined);
      assert.equal(row.relatedMeetings, undefined);
    }
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.researchIntelligence.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.researchIntelligence.items.some((row) => row.relatedMeetings),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.researchIntelligence);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToResearchIntelligenceRecord(
      otherStaff,
      {
        id: 'client:SYN01:synthetic alpha co',
        subjectKind: 'client',
        title: 'SYN01 · SYNTHETIC Alpha Co',
        source: 'HVCG_Clients',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        clientCode: 'SYN01',
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Clients title. Lender criteria and financing status were not invented.',
      },
      {
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(denied.relatedMeetings, undefined);
    assert.equal('relatedMeetings' in denied, false);
  });

  it('leaves the empty research payload unchanged and drops SAS or anonymous meeting webUrl', async () => {
    const empty = emptyResearchIntelligencePayload('2026-08-24T18:00:00.000Z');
    assert.deepEqual(empty.items, []);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(empty.outboundRefresh, false);
    const attachedEmpty = attachRelatedContextToResearchIntelligence(
      staff,
      empty,
      {
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.deepEqual(attachedEmpty, empty);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit({
            id: 'meet-sas',
            title: 'SYN01 SAS standup',
            webUrl: SAS,
            sourceEventId: 'AAMk-sas',
          }),
          syn01MeetingHit({
            id: 'meet-anon',
            title: 'SYN01 anonymous standup',
            webUrl: ANON,
            sourceEventId: 'AAMk-anon',
          }),
          syn01MeetingHit({
            id: 'meet-ok',
            title: 'SYN01 entitled standup',
            webUrl: MEETING_SOURCE,
            sourceEventId: 'AAMk-ok',
          }),
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const sasMeeting = client.relatedMeetings?.find((row) => row.id === 'meet-sas');
    const anonMeeting = client.relatedMeetings?.find((row) => row.id === 'meet-anon');
    const okMeeting = client.relatedMeetings?.find((row) => row.id === 'meet-ok');
    assert.ok(sasMeeting);
    assert.ok(anonMeeting);
    assert.ok(okMeeting);
    assert.equal(sasMeeting.webUrl, undefined);
    assert.equal(anonMeeting.webUrl, undefined);
    assert.equal(okMeeting.webUrl, MEETING_SOURCE);
    const blob = JSON.stringify(client.relatedMeetings);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript/i.test(blob), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never invents ClientCodes, lender criteria, financing status, fit, TargetAmount, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.ok(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });
});

describe('ATLAS-RESEARCH-INTELLIGENCE-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedDocuments on entitled research items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const document = client.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.clientCode, 'SYN01');
    assert.equal(document.title, 'SYN01 intake memo');
    assert.equal(document.webUrl, DOC_SOURCE);
    assert.equal(document.source, 'HVCG_Communications/file-index');
    assert.ok(
      document.classification === 'CONFIRMED' ||
        document.classification === 'LIKELY' ||
        document.classification === 'PROPOSED' ||
        document.classification === 'HONEST_EMPTY',
    );
    assert.ok((client.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(client.relatedDocuments)), false);
    assert.equal(JSON.stringify(client.relatedDocuments).includes('PDG01'), false);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
    assert.equal(result.authorizedSearch.researchIntelligence.outboundRefresh, false);
    assert.equal(result.authorizedSearch.researchIntelligence.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
    });
    const ctxClient = viaIndex.clientContext.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(ctxClient);
    assert.equal(ctxClient.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxClient.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxClient.relatedDocuments, client.relatedDocuments);
    assert.deepEqual(ctxClient.relatedMeetings, client.relatedMeetings);
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedDocuments, undefined);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never attaches Client B documents to a Client A research item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((client.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.researchIntelligence.items.some((row) => row.clientCode === 'PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const mixed = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [
            {
              id: 'file-syn-1',
              title: 'SYN01 intake memo',
              webUrl: DOC_SOURCE,
              clientCode: 'SYN01',
              provenance: 'CONFIRMED',
              source: 'HVCG_Communications/file-index',
            },
            {
              id: 'file-pdg',
              title: 'PDG01 leak packet',
              webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
              clientCode: 'PDG01',
              provenance: 'CONFIRMED',
              source: 'HVCG_Communications/file-index',
            },
          ],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
              sourceEventId: 'AAMk-syn-cal-1',
              date: '2026-08-21T15:00:00Z',
            },
            {
              id: 'meet-pdg',
              title: 'PDG01 leak standup',
              clientCode: 'PDG01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((mixed.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(mixed.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mixed.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
  });

  it('omits relatedDocuments when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01DocumentHit(),
          syn01MeetingHit(),
          {
            kind: 'document' as const,
            id: 'file-unscoped',
            title: 'Internal research packet',
            href: '/documents',
            source: 'HVCG_Communications/file-index',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED' as const,
          },
        ],
      }),
    });
    const lenders = result.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.length);
    for (const row of lenders) {
      assert.equal(row.clientCode, undefined);
      assert.equal(row.relatedDocuments, undefined);
      assert.equal(row.relatedMeetings, undefined);
    }
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('unscoped lender catalog rows never receive scoped documents', () => {
    const unscoped = attachRelatedContextToResearchIntelligenceRecord(
      manny,
      {
        id: 'lender:ln-liveoak',
        subjectKind: 'lender',
        title: 'Live Oak Bank',
        source: 'HVCG_Lenders',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
      },
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [],
        },
        hits: [syn01DocumentHit()],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.relatedMeetings, undefined);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
    assert.equal(unscoped.fit, 'NOT_EVALUATED');
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.researchIntelligence.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.researchIntelligence.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.researchIntelligence);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToResearchIntelligenceRecord(
      otherStaff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.relatedMeetings, undefined);
    assert.equal('relatedMeetings' in denied, false);
  });

  it('leaves the empty research payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyResearchIntelligencePayload('2026-08-24T18:00:00.000Z');
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(empty.outboundRefresh, false);
    const attachedEmpty = attachRelatedContextToResearchIntelligence(
      staff,
      empty,
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.deepEqual(attachedEmpty, empty);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const sasDoc = client.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = client.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = client.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    const blob = JSON.stringify(client.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never invents ClientCodes, lender criteria, financing status, fit, TargetAmount, downloadUrl, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
          syn01DocumentHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            previewGetUrl: 'https://evil.example/preview',
          }),
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.ok(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.ok(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    assert.equal('relatedProjects' in client, false);
    assert.equal('relatedThreads' in client, false);
    assert.equal('relatedCapital' in client, false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });
});

describe('ATLAS-RESEARCH-INTELLIGENCE-RELATED-PROJECTS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedProjects on entitled research items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit(), syn01ProjectHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const project = client.relatedProjects?.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    assert.equal(project.title, 'SYN01 entitled intake project');
    assert.equal(project.source, 'HVCG_Projects');
    assert.equal(project.invented, false);
    assert.equal(project.historicalHvs, false);
    assert.equal(typeof project.hubMiRow, 'boolean');
    assert.ok(
      project.classification === 'CONFIRMED' ||
        project.classification === 'LIKELY' ||
        project.classification === 'PROPOSED' ||
        project.classification === 'STALE_OR_UNCERTAIN' ||
        project.classification === 'COMPLETE',
    );
    assert.ok((client.relatedProjects?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(/downloadUrl|transcript|attendee|TargetAmount/i.test(JSON.stringify(client.relatedProjects)), false);
    assert.equal(JSON.stringify(client.relatedProjects).includes('PDG01'), false);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
    assert.equal(result.authorizedSearch.researchIntelligence.outboundRefresh, false);
    assert.equal(result.authorizedSearch.researchIntelligence.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit(), syn01ProjectHit()],
    });
    const ctxClient = viaIndex.clientContext.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(ctxClient);
    assert.equal(ctxClient.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(ctxClient.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(ctxClient.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.deepEqual(ctxClient.relatedProjects, client.relatedProjects);
    assert.deepEqual(ctxClient.relatedMeetings, client.relatedMeetings);
    assert.deepEqual(ctxClient.relatedDocuments, client.relatedDocuments);
  });

  it('honestly omits relatedProjects when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedProjects, undefined);
    assert.equal('relatedProjects' in client, false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never attaches Client B projects to a Client A research item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          {
            kind: 'project' as const,
            id: 'proj-pdg',
            title: 'PDG01 leak project',
            href: '/clients/PDG01',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal((client.relatedProjects || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.researchIntelligence.items.some((row) => row.clientCode === 'PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const mixed = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [
            syn01ProjectRecord(),
            syn01ProjectRecord({
              id: 'proj-pdg',
              title: 'PDG01 leak project',
              clientCode: 'PDG01',
            }),
          ],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
              sourceEventId: 'AAMk-syn-cal-1',
              date: '2026-08-21T15:00:00Z',
            },
            {
              id: 'meet-pdg',
              title: 'PDG01 leak standup',
              clientCode: 'PDG01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal((mixed.relatedProjects || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mixed.relatedProjects).includes('PDG01'), false);
    assert.equal(mixed.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mixed.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((mixed.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
  });

  it('omits relatedProjects when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01ProjectHit(),
          syn01DocumentHit(),
          syn01MeetingHit(),
        ],
      }),
    });
    const lenders = result.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.length);
    for (const row of lenders) {
      assert.equal(row.clientCode, undefined);
      assert.equal(row.relatedProjects, undefined);
      assert.equal(row.relatedDocuments, undefined);
      assert.equal(row.relatedMeetings, undefined);
    }
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('unscoped lender catalog rows never receive scoped projects', () => {
    const unscoped = attachRelatedContextToResearchIntelligenceRecord(
      manny,
      {
        id: 'lender:ln-liveoak',
        subjectKind: 'lender',
        title: 'Live Oak Bank',
        source: 'HVCG_Lenders',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
      },
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [],
        },
        hits: [syn01DocumentHit()],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(unscoped.relatedProjects, undefined);
    assert.equal('relatedProjects' in unscoped, false);
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal(unscoped.relatedMeetings, undefined);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
    assert.equal(unscoped.fit, 'NOT_EVALUATED');
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit(), syn01ProjectHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.researchIntelligence.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.researchIntelligence.items.some((row) => row.relatedProjects),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.researchIntelligence);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToResearchIntelligenceRecord(
      otherStaff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(denied.relatedProjects, undefined);
    assert.equal('relatedProjects' in denied, false);
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.relatedMeetings, undefined);
    assert.equal('relatedMeetings' in denied, false);
  });

  it('leaves the empty research payload unchanged and omits relatedProjects when search.projects is absent', async () => {
    const empty = emptyResearchIntelligencePayload('2026-08-24T18:00:00.000Z');
    assert.deepEqual(empty.items, []);
    assert.equal('relatedProjects' in empty, false);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(empty.outboundRefresh, false);
    const attachedEmpty = attachRelatedContextToResearchIntelligence(
      staff,
      empty,
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.deepEqual(attachedEmpty, empty);

    const absent = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(absent.relatedProjects, undefined);
    assert.equal('relatedProjects' in absent, false);
    assert.equal(absent.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(absent.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
  });

  it('never invents ClientCodes, lender criteria, financing status, fit, TargetAmount, downloadUrl, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
          syn01DocumentHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            previewGetUrl: 'https://evil.example/preview',
          }),
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.ok(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'));
    assert.ok(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.ok(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    const attached = client.relatedProjects?.find((row) => row.id === 'proj-syn-1');
    assert.ok(attached);
    assert.equal(attached.invented, false);
    assert.equal(typeof attached.hubMiRow, 'boolean');
    assert.ok(
      attached.classification === 'CONFIRMED' ||
        attached.classification === 'LIKELY' ||
        attached.classification === 'PROPOSED' ||
        attached.classification === 'STALE_OR_UNCERTAIN' ||
        attached.classification === 'COMPLETE',
    );
    assert.equal('relatedThreads' in client, false);
    assert.equal('relatedCapital' in client, false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('copies hubMiRow as composed and never invents Hub-MI on recovered projects', () => {
    const emptyMeetings = {
      kind: 'meeting_operating_record_v1' as const,
      policyClass: 'READ_AUTO' as const,
      invented: false as const,
      items: [],
    };
    const emptyDocuments = {
      kind: 'document_operating_record_v1' as const,
      policyClass: 'READ_AUTO' as const,
      binariesInAtlas: false as const,
      items: [],
    };
    const current = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: emptyDocuments,
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord({ hubMiRow: true, classification: 'CONFIRMED' })],
        },
        meetings: emptyMeetings,
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    const currentRef = current.relatedProjects?.find((row) => row.id === 'proj-syn-1');
    assert.ok(currentRef);
    assert.equal(currentRef.hubMiRow, true);
    assert.equal(currentRef.classification, 'CONFIRMED');
    assert.equal(currentRef.invented, false);

    const recovered = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: emptyDocuments,
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [
            syn01ProjectRecord({
              id: 'proj-recovered-1',
              title: 'SYN01 recovered HVS project',
              historicalHvs: true,
              hubMiRow: false,
              classification: 'STALE_OR_UNCERTAIN',
              operationalized: false,
            }),
          ],
        },
        meetings: emptyMeetings,
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    const recoveredRef = recovered.relatedProjects?.find((row) => row.id === 'proj-recovered-1');
    assert.ok(recoveredRef);
    assert.equal(recoveredRef.hubMiRow, false);
    assert.equal(recoveredRef.historicalHvs, true);
    assert.equal(recoveredRef.classification, 'STALE_OR_UNCERTAIN');
    assert.equal(recoveredRef.invented, false);
    assert.equal(JSON.stringify(recovered.relatedProjects).includes('TargetAmount'), false);
  });
});

function syn01ThreadsSlice(items: MailThreadOperatingRecord[] = [syn01ThreadRecord()]) {
  return {
    kind: 'mail_thread_operating_record_v1' as const,
    policyClass: 'DRAFT_ONLY' as const,
    invented: false as const,
    autoRespond: false as const,
    send: false as const,
    indexedPreviewOnly: true as const,
    items,
  };
}

describe('ATLAS-RESEARCH-INTELLIGENCE-RELATED-THREADS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedThreads on entitled research items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const thread = client.relatedThreads?.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.title, 'SYN01 intake follow-up');
    assert.equal(thread.webUrl, THREAD_SOURCE);
    assert.ok(
      thread.classification === 'CONFIRMED' ||
        thread.classification === 'LIKELY' ||
        thread.classification === 'PROPOSED' ||
        thread.classification === 'HONEST_EMPTY',
    );
    assert.equal('preview' in thread, false);
    assert.equal('suggestedDraft' in thread, false);
    assert.equal('send' in thread, false);
    assert.equal('autoRespond' in thread, false);
    assert.ok((client.relatedThreads?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(
      /downloadUrl|transcript|attendee|TargetAmount|suggestedDraft/i.test(JSON.stringify(client.relatedThreads)),
      false,
    );
    assert.equal(JSON.stringify(client.relatedThreads).includes('Can you confirm the next entitled document?'), false);
    assert.equal(JSON.stringify(client.relatedThreads).includes('PDG01'), false);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
    assert.equal(result.authorizedSearch.researchIntelligence.outboundRefresh, false);
    assert.equal(result.authorizedSearch.researchIntelligence.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [
        syn01ClientHit(),
        syn01MeetingHit(),
        syn01DocumentHit(),
        syn01ProjectHit(),
        syn01ThreadHit(),
      ],
    });
    const ctxClient = viaIndex.clientContext.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(ctxClient);
    assert.equal(ctxClient.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(ctxClient.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(ctxClient.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxClient.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.deepEqual(ctxClient.relatedThreads, client.relatedThreads);
    assert.deepEqual(ctxClient.relatedMeetings, client.relatedMeetings);
    assert.deepEqual(ctxClient.relatedDocuments, client.relatedDocuments);
    assert.deepEqual(ctxClient.relatedProjects, client.relatedProjects);
    assert.equal(viaIndex.clientContext.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(viaIndex.clientContext.threads.send, false);
    assert.equal(viaIndex.clientContext.threads.autoRespond, false);
  });

  it('honestly omits relatedThreads when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit(), syn01ProjectHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedThreads, undefined);
    assert.equal('relatedThreads' in client, false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never attaches Client B threads to a Client A research item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
          {
            kind: 'communication' as const,
            id: 'mail-pdg',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'conv-pdg',
            provenance: 'PROPOSED' as const,
            preview: 'PDG01 leak preview body must not copy',
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal((client.relatedThreads || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.researchIntelligence.items.some((row) => row.clientCode === 'PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const mixed = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice([
          syn01ThreadRecord(),
          syn01ThreadRecord({
            id: 'mail-pdg',
            conversationId: 'conv-pdg',
            title: 'PDG01 leak thread',
            clientCode: 'PDG01',
          }),
        ]),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
              sourceEventId: 'AAMk-syn-cal-1',
              date: '2026-08-21T15:00:00Z',
            },
            {
              id: 'meet-pdg',
              title: 'PDG01 leak standup',
              clientCode: 'PDG01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(mixed.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal((mixed.relatedThreads || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mixed.relatedThreads).includes('PDG01'), false);
    assert.equal(mixed.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mixed.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((mixed.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal((mixed.relatedProjects || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
  });

  it('omits relatedThreads when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01ThreadHit(),
          syn01ProjectHit(),
          syn01DocumentHit(),
          syn01MeetingHit(),
        ],
      }),
    });
    const lenders = result.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.length);
    for (const row of lenders) {
      assert.equal(row.clientCode, undefined);
      assert.equal(row.relatedThreads, undefined);
      assert.equal(row.relatedProjects, undefined);
      assert.equal(row.relatedDocuments, undefined);
      assert.equal(row.relatedMeetings, undefined);
    }
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('unscoped lender catalog rows never receive scoped threads', () => {
    const unscoped = attachRelatedContextToResearchIntelligenceRecord(
      manny,
      {
        id: 'lender:ln-liveoak',
        subjectKind: 'lender',
        title: 'Live Oak Bank',
        source: 'HVCG_Lenders',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
      },
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [],
        },
        hits: [syn01DocumentHit()],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(unscoped.relatedThreads, undefined);
    assert.equal('relatedThreads' in unscoped, false);
    assert.equal(unscoped.relatedProjects, undefined);
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal(unscoped.relatedMeetings, undefined);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
    assert.equal(unscoped.fit, 'NOT_EVALUATED');
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
        ],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.researchIntelligence.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.researchIntelligence.items.some((row) => row.relatedThreads),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.researchIntelligence);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToResearchIntelligenceRecord(
      otherStaff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(denied.relatedThreads, undefined);
    assert.equal('relatedThreads' in denied, false);
    assert.equal(denied.relatedProjects, undefined);
    assert.equal('relatedProjects' in denied, false);
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.relatedMeetings, undefined);
    assert.equal('relatedMeetings' in denied, false);
  });

  it('leaves the empty research payload unchanged and omits relatedThreads when search.threads is absent', async () => {
    const empty = emptyResearchIntelligencePayload('2026-08-24T18:00:00.000Z');
    assert.deepEqual(empty.items, []);
    assert.equal('relatedThreads' in empty, false);
    assert.equal('relatedProjects' in empty, false);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(empty.outboundRefresh, false);
    const attachedEmpty = attachRelatedContextToResearchIntelligence(
      staff,
      empty,
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.deepEqual(attachedEmpty, empty);

    const absent = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(absent.relatedThreads, undefined);
    assert.equal('relatedThreads' in absent, false);
    assert.equal(absent.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(absent.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(absent.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
  });

  it('never invents ClientCodes, lender criteria, financing status, fit, TargetAmount, downloadUrl, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
          syn01DocumentHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            previewGetUrl: 'https://evil.example/preview',
          }),
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            suggestedDraft: { send: true, autoRespond: true, body: 'full mail body' },
          },
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.ok(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'));
    assert.ok(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'));
    assert.ok(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.ok(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    const attached = client.relatedThreads?.find((row) => row.id === 'mail-syn-1');
    assert.ok(attached);
    assert.equal('preview' in attached, false);
    assert.equal('suggestedDraft' in attached, false);
    assert.equal('send' in attached, false);
    assert.equal('autoRespond' in attached, false);
    assert.equal(JSON.stringify(client.relatedThreads).includes('full mail body'), false);
    assert.equal('relatedCapital' in client, false);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('drops SAS / anonymous thread webUrl and never copies preview bodies', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01ThreadHit({ id: 'mail-sas', conversationId: 'conv-sas', webUrl: SAS }),
          syn01ThreadHit({ id: 'mail-anon', conversationId: 'conv-anon', webUrl: ANON }),
          syn01ThreadHit({ id: 'mail-ok', conversationId: 'conv-ok', webUrl: THREAD_SOURCE }),
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const sasThread = client.relatedThreads?.find((row) => row.id === 'mail-sas');
    const anonThread = client.relatedThreads?.find((row) => row.id === 'mail-anon');
    const okThread = client.relatedThreads?.find((row) => row.id === 'mail-ok');
    if (sasThread) assert.equal(sasThread.webUrl, undefined);
    if (anonThread) assert.equal(anonThread.webUrl, undefined);
    assert.ok(okThread);
    assert.equal(okThread.webUrl, THREAD_SOURCE);
    const blob = JSON.stringify(client.relatedThreads || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|suggestedDraft|previewGetUrl/i.test(blob), false);
    assert.equal(blob.includes('Can you confirm the next entitled document?'), false);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });
});

function syn01CapitalSlice(items: CapitalSubmissionPrepareRecord[] = [syn01CapitalRecord()]) {
  return {
    kind: 'capital_submission_request_v1' as const,
    policyClass: 'PREPARE_ONLY' as const,
    invented: false as const,
    send: false as const,
    externalSubmit: false as const,
    ownerGated: true as const,
    catalogCopies: [] as const,
    items,
  };
}

describe('ATLAS-RESEARCH-INTELLIGENCE-RELATED-CAPITAL-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedCapital on entitled research items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
          syn01CapitalHit(),
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    const capital = client.relatedCapital?.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.clientCode, 'SYN01');
    assert.equal(capital.title, 'SYN01 entitled capital opportunity');
    assert.equal(capital.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(capital.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(capital.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.invented, false);
    assert.equal('TargetAmount' in capital, false);
    assert.equal('downloadUrl' in capital, false);
    assert.equal('transcript' in capital, false);
    assert.ok((client.relatedCapital?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(
      /downloadUrl|transcript|attendee|TargetAmount|suggestedDraft/i.test(JSON.stringify(client.relatedCapital)),
      false,
    );
    assert.equal(JSON.stringify(client.relatedCapital).includes('PDG01'), false);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
    assert.equal(result.authorizedSearch.researchIntelligence.outboundRefresh, false);
    assert.equal(result.authorizedSearch.researchIntelligence.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [
        syn01ClientHit(),
        syn01MeetingHit(),
        syn01DocumentHit(),
        syn01ProjectHit(),
        syn01ThreadHit(),
        syn01CapitalHit(),
      ],
    });
    const ctxClient = viaIndex.clientContext.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(ctxClient);
    assert.equal(ctxClient.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(ctxClient.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(ctxClient.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxClient.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(ctxClient.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.deepEqual(ctxClient.relatedCapital, client.relatedCapital);
    assert.deepEqual(ctxClient.relatedMeetings, client.relatedMeetings);
    assert.deepEqual(ctxClient.relatedDocuments, client.relatedDocuments);
    assert.deepEqual(ctxClient.relatedProjects, client.relatedProjects);
    assert.deepEqual(ctxClient.relatedThreads, client.relatedThreads);
    assert.equal(viaIndex.clientContext.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(viaIndex.clientContext.capitalSubmissions.send, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.externalSubmit, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.ownerGated, true);
  });

  it('honestly omits relatedCapital when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit(), syn01ProjectHit(), syn01ThreadHit()],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedCapital, undefined);
    assert.equal('relatedCapital' in client, false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('never attaches Client B capital to a Client A research item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
          syn01CapitalHit(),
          {
            kind: 'capital_opportunity' as const,
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            href: '/capital?opportunity=cap-pdg',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal((client.relatedCapital || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.researchIntelligence.items.some((row) => row.clientCode === 'PDG01'), false);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);

    const mixed = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        capitalSubmissions: syn01CapitalSlice([
          syn01CapitalRecord(),
          {
            ...syn01CapitalRecord(),
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            clientCode: 'PDG01',
          },
        ]),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
              sourceEventId: 'AAMk-syn-cal-1',
              date: '2026-08-21T15:00:00Z',
            },
            {
              id: 'meet-pdg',
              title: 'PDG01 leak standup',
              clientCode: 'PDG01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(mixed.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal((mixed.relatedCapital || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('PDG01'), false);
    assert.equal(mixed.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mixed.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((mixed.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal((mixed.relatedProjects || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(mixed.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal((mixed.relatedThreads || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
  });

  it('omits relatedCapital when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01CapitalHit(),
          syn01ThreadHit(),
          syn01ProjectHit(),
          syn01DocumentHit(),
          syn01MeetingHit(),
        ],
      }),
    });
    const lenders = result.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.length);
    for (const row of lenders) {
      assert.equal(row.clientCode, undefined);
      assert.equal(row.relatedCapital, undefined);
      assert.equal(row.relatedThreads, undefined);
      assert.equal(row.relatedProjects, undefined);
      assert.equal(row.relatedDocuments, undefined);
      assert.equal(row.relatedMeetings, undefined);
    }
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });

  it('unscoped lender catalog rows never receive scoped capital', () => {
    const unscoped = attachRelatedContextToResearchIntelligenceRecord(
      manny,
      {
        id: 'lender:ln-liveoak',
        subjectKind: 'lender',
        title: 'Live Oak Bank',
        source: 'HVCG_Lenders',
        retrievalDate: '2026-08-24T18:00:00.000Z',
        confidence: 'CONFIRMED',
        superseded: false,
        classification: 'CONFIRMED',
        invented: false,
        lenderCriteriaInvented: false,
        financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
        fit: RESEARCH_INTELLIGENCE_FIT,
        evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
      },
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        capitalSubmissions: syn01CapitalSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [],
        },
        hits: [syn01DocumentHit()],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(unscoped.relatedCapital, undefined);
    assert.equal('relatedCapital' in unscoped, false);
    assert.equal(unscoped.relatedThreads, undefined);
    assert.equal(unscoped.relatedProjects, undefined);
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal(unscoped.relatedMeetings, undefined);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
    assert.equal(unscoped.fit, 'NOT_EVALUATED');
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01ProjectHit(),
          syn01ThreadHit(),
          syn01CapitalHit(),
        ],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.researchIntelligence.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.researchIntelligence.items.some((row) => row.relatedCapital),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.researchIntelligence);
    assert.equal(unknownBlob.includes('cap-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToResearchIntelligenceRecord(
      otherStaff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        capitalSubmissions: syn01CapitalSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(denied.relatedCapital, undefined);
    assert.equal('relatedCapital' in denied, false);
    assert.equal(denied.relatedThreads, undefined);
    assert.equal('relatedThreads' in denied, false);
    assert.equal(denied.relatedProjects, undefined);
    assert.equal('relatedProjects' in denied, false);
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.relatedMeetings, undefined);
    assert.equal('relatedMeetings' in denied, false);
  });

  it('leaves the empty research payload unchanged and omits relatedCapital when search.capitalSubmissions is absent', async () => {
    const empty = emptyResearchIntelligencePayload('2026-08-24T18:00:00.000Z');
    assert.deepEqual(empty.items, []);
    assert.equal('relatedCapital' in empty, false);
    assert.equal('relatedThreads' in empty, false);
    assert.equal('relatedProjects' in empty, false);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(empty.outboundRefresh, false);
    const attachedEmpty = attachRelatedContextToResearchIntelligence(
      staff,
      empty,
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        capitalSubmissions: syn01CapitalSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.deepEqual(attachedEmpty, empty);

    const absent = attachRelatedContextToResearchIntelligenceRecord(
      staff,
      syn01ClientResearchRecord(),
      {
        documents: {
          kind: 'document_operating_record_v1',
          policyClass: 'READ_AUTO',
          binariesInAtlas: false,
          items: [syn01DocumentRecord()],
        },
        projects: {
          kind: 'project_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          currentClientsFirst: true,
          items: [syn01ProjectRecord()],
        },
        threads: syn01ThreadsSlice(),
        meetings: {
          kind: 'meeting_operating_record_v1',
          policyClass: 'READ_AUTO',
          invented: false,
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              clientCode: 'SYN01',
              classification: 'CONFIRMED',
              source: 'HVCG_Meetings',
              invented: false,
              webUrl: MEETING_SOURCE,
            },
          ],
        },
        hits: [],
      } as unknown as AtlasAuthorizedSearch,
    );
    assert.equal(absent.relatedCapital, undefined);
    assert.equal('relatedCapital' in absent, false);
    assert.equal(absent.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(absent.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(absent.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(absent.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
  });

  it('never invents ClientCodes, lender criteria, financing status, fit, TargetAmount, downloadUrl, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
          syn01DocumentHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            previewGetUrl: 'https://evil.example/preview',
          }),
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            suggestedDraft: { send: true, autoRespond: true, body: 'full mail body' },
          },
          {
            ...syn01CapitalHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
            send: true,
            externalSubmit: true,
            ownerGated: false,
            financingStatus: 'Committed',
            fit: 'BEST_FIT',
          },
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.researchIntelligence);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const client = result.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.financingStatus, 'UNKNOWN');
    assert.equal(client.fit, 'NOT_EVALUATED');
    assert.equal(client.lenderCriteriaInvented, false);
    assert.equal(client.invented, false);
    assert.ok(client.relatedCapital?.some((row) => row.id === 'cap-syn-1'));
    assert.ok(client.relatedThreads?.some((row) => row.id === 'mail-syn-1'));
    assert.ok(client.relatedProjects?.some((row) => row.id === 'proj-syn-1'));
    assert.ok(client.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.ok(client.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    const attached = client.relatedCapital?.find((row) => row.id === 'cap-syn-1');
    assert.ok(attached);
    assert.equal(attached.financingStatus, 'UNKNOWN');
    assert.equal(attached.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(attached.lenderCriteriaInvented, false);
    assert.equal(attached.invented, false);
    assert.equal(attached.policyClass, 'PREPARE_ONLY');
    assert.equal('TargetAmount' in attached, false);
    assert.equal('downloadUrl' in attached, false);
    assert.equal('transcript' in attached, false);
    assert.equal('send' in attached, false);
    assert.equal('externalSubmit' in attached, false);
    assert.equal(JSON.stringify(client.relatedCapital).includes('5000000'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertResearchHonesty(result.authorizedSearch.researchIntelligence);
  });
});

function searchWithResearch(items: ResearchIntelligenceRecord[]): AtlasAuthorizedSearch {
  return {
    documents: { kind: 'document_operating_record_v1', policyClass: 'READ_AUTO', binariesInAtlas: false, items: [] },
    projects: { kind: 'project_operating_record_v1', policyClass: 'READ_AUTO', invented: false, currentClientsFirst: true, items: [] },
    threads: { kind: 'mail_thread_operating_record_v1', policyClass: 'DRAFT_ONLY', invented: false, items: [] },
    capitalSubmissions: {
      kind: 'capital_submission_request_v1',
      policyClass: 'PREPARE_ONLY',
      invented: false,
      send: false,
      externalSubmit: false,
      ownerGated: true,
      catalogCopies: [],
      items: [],
    },
    researchIntelligence: {
      kind: 'research_intelligence_v1',
      policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
      invented: false,
      outboundRefresh: false,
      financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
      lenderCriteriaInvented: false,
      retrievedAt: '2026-08-24T18:00:00.000Z',
      items,
    },
    meetings: { kind: 'meeting_operating_record_v1', policyClass: 'READ_AUTO', invented: false, items: [] },
    onboarding: emptyOnboardingPayload(),
    clientSupport: emptyClientSupportPayload(),
    hits: [],
  } as unknown as AtlasAuthorizedSearch;
}

function syn01ClientResearchRecord(overrides: Partial<ResearchIntelligenceRecord> = {}): ResearchIntelligenceRecord {
  return {
    id: 'client:SYN01:synthetic alpha co',
    subjectKind: 'client',
    title: 'SYN01 · SYNTHETIC Alpha Co',
    source: 'HVCG_Clients',
    retrievalDate: '2026-08-24T18:00:00.000Z',
    confidence: 'CONFIRMED',
    superseded: false,
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    invented: false,
    lenderCriteriaInvented: false,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    fit: RESEARCH_INTELLIGENCE_FIT,
    evidence: 'Copied entitled HVCG_Clients title.',
    ...overrides,
  };
}

function syn01MeetingRecord(): MeetingOperatingRecord {
  return {
    id: 'meet-syn-1',
    title: 'SYN01 weekly standup',
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    source: 'HVCG_Meetings',
    invented: false,
    webUrl: MEETING_SOURCE,
    sourceEventId: 'AAMk-syn-cal-1',
    date: '2026-08-21T15:00:00Z',
  };
}

function assertMeetingResearchHonesty(meeting: MeetingOperatingRecord): void {
  const blob = JSON.stringify(meeting);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  for (const row of meeting.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
  }
}

describe('ATLAS-MEETING-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled meetings and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit()],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    const research = meeting.researchRelationship?.find(
      (row) => row.clientCode === 'SYN01' && /synthetic alpha/i.test(row.title),
    );
    assert.ok(research);
    assert.equal(research.source, 'HVCG_Clients');
    assert.equal(research.invented, false);
    assert.equal(research.lenderCriteriaInvented, false);
    assert.equal(research.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(research.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(research.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(research.superseded, false);
    assert.ok(research.retrievalDate);
    assert.ok((meeting.researchRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assertMeetingResearchHonesty(meeting);
    assert.equal(JSON.stringify(meeting.researchRelationship).includes('PDG01'), false);
    assert.equal(meeting.relatedDocuments, undefined);
    assert.equal(meeting.relatedEmail, undefined);
    assert.equal(meeting.relatedProject, undefined);
    assert.equal(meeting.relatedAttachments, undefined);
    assert.equal(meeting.capitalRelationship, undefined);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit()],
    });
    const ctxMeeting = viaIndex.clientContext.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(ctxMeeting);
    assert.equal(
      ctxMeeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxMeeting.researchRelationship, meeting.researchRelationship);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01MeetingHit()],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.researchRelationship, undefined);
    assert.equal('researchRelationship' in meeting, false);
    assertMeetingResearchHonesty(meeting);
  });

  it('never attaches Client B research to a Client A meeting', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(
      meeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      (meeting.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.meetings);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertMeetingResearchHonesty(meeting);

    const mixed = attachRelatedContextToMeeting(
      staff,
      syn01MeetingRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
  });

  it('omits researchRelationship when meeting ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToMeeting(
      manny,
      {
        id: 'meet-unscoped',
        title: 'Internal research standup',
        classification: 'PROPOSED',
        source: 'HVCG_Meetings',
        invented: false,
        webUrl: MEETING_SOURCE,
      },
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal('researchRelationship' in omitted, false);
  });

  it('does not attach unscoped lender research to a scoped meeting', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01MeetingHit(),
        ],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.researchRelationship, undefined);
    const blob = JSON.stringify(meeting);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertMeetingResearchHonesty(meeting);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.meetings.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.meetings.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.meetings);
    assert.equal(unknownBlob.includes('meet-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToMeeting(
      otherStaff,
      syn01MeetingRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
  });

  it('leaves the empty meetings payload unchanged', () => {
    const empty = emptyMeetingOperatingPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    const attachedEmpty = attachRelatedContextToMeetings(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty, empty);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          syn01MeetingHit({
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          }),
        ],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    const blob = JSON.stringify(result.authorizedSearch.meetings);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(meeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assertMeetingResearchHonesty(meeting);
  });
});

function syn01OnboardingHit() {
  return {
    kind: 'project' as const,
    id: 'proj-onboard-1',
    title: 'New client onboarding',
    href: '/projects/proj-onboard-1',
    source: 'HVCG_Projects',
    clientCode: 'SYN01',
  };
}

function syn01OnboardingRecord(): OnboardingAgentRecord {
  return {
    id: 'proj-onboard-1',
    title: 'New client onboarding',
    clientCode: 'SYN01',
    evidenceKind: 'project',
    classification: 'PROPOSED',
    provenance: 'PROPOSED',
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
        classification: 'PROPOSED',
      },
    ],
    missingRequirements: [
      'Owner must review and decide activation / onboarding completion. Agent does not activate, complete, or send.',
    ],
    ownerDecisions: [{ decision: 'Activate ClientStage to Active Client', status: 'escalated', execute: false }],
    nextAction:
      'Owner review of this entitled intake. Activation, onboarding completion, and live GTM outbound remain owner-gated.',
  };
}

describe('ATLAS-ONBOARDING-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches the same entitled research refs on meetings and onboarding', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01OnboardingHit()],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(meeting);
    assert.ok(project);
    assert.equal(
      meeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(project.researchRelationship, meeting.researchRelationship);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(JSON.stringify(meeting.researchRelationship).includes('PDG01'), false);
    for (const row of meeting.researchRelationship || []) {
      assert.equal(row.invented, false);
      assert.equal(row.lenderCriteriaInvented, false);
      assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
      assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
      assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
      assert.equal('downloadUrl' in row, false);
      assert.equal('transcript' in row, false);
      assert.equal('TargetAmount' in row, false);
    }
    const blob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
    assert.equal(blob.includes('PDG01'), false);
  });

  it('never attaches Client B or unscoped lender research to Client A onboarding', () => {
    const mixed = attachRelatedContextToOnboardingRecord(
      staff,
      syn01OnboardingRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
    assert.equal(/live oak/i.test(JSON.stringify(mixed)), false);
  });

  it('omits extras for unauthorized principals and empty onboarding payloads', () => {
    const denied = attachRelatedContextToOnboardingRecord(
      otherStaff,
      syn01OnboardingRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);

    const empty = emptyOnboardingPayload();
    const attachedEmpty = attachRelatedContextToOnboarding(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty, empty);
  });
});

function assertOnboardingRelatedDocumentsHonesty(item: OnboardingAgentRecord): void {
  const { relatedProjects: _relatedProjects, ...withoutProjects } = item;
  const blob = JSON.stringify(withoutProjects);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  assert.equal(item.invented, false);
  assert.equal(item.hubMiRow, false);
  assert.equal(item.execute, false);
  assert.equal(item.activate, false);
  assert.equal(item.send, false);
  assert.equal(item.liveGtmOutbound, false);
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
  }
  for (const row of item.relatedDocuments || []) {
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.equal('previewGetUrl' in row, false);
    assert.equal('previewPostUrl' in row, false);
  }
}

describe('ATLAS-ONBOARDING-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  function searchWithDocuments(
    documents: DocumentOperatingRecord[],
    hits: AtlasAuthorizedSearchHit[] = [],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedDocuments on entitled onboarding and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01OnboardingHit(), syn01DocumentHit()],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(project);
    assert.ok(document);
    const related = project.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(related);
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.title, 'SYN01 intake memo');
    assert.equal(related.webUrl, DOC_SOURCE);
    assert.equal(related.source, 'HVCG_Communications/file-index');
    assert.ok((project.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(JSON.stringify(project.relatedDocuments).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.onboarding.execute, false);
    assert.equal(result.authorizedSearch.onboarding.activate, false);
    assert.equal(result.authorizedSearch.onboarding.send, false);
    assert.equal(result.authorizedSearch.onboarding.liveGtmOutbound, false);
    assert.equal(result.authorizedSearch.onboarding.ownerGated, true);
    assert.equal(result.authorizedSearch.onboarding.hubMi, false);
    assertOnboardingRelatedDocumentsHonesty(project);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01OnboardingHit(), syn01DocumentHit()],
    });
    const ctxProject = viaIndex.clientContext.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(ctxProject);
    assert.equal(ctxProject.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxProject.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxProject.relatedDocuments, project.relatedDocuments);
    assert.deepEqual(ctxProject.relatedMeetings, project.relatedMeetings);
    assert.deepEqual(ctxProject.researchRelationship, project.researchRelationship);
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01OnboardingHit()],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in project, false);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assertOnboardingRelatedDocumentsHonesty(project);
  });

  it('never attaches Client B documents to a Client A onboarding item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01OnboardingHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((project.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertOnboardingRelatedDocumentsHonesty(project);

    const mixed = attachRelatedContextToOnboardingRecord(
      staff,
      syn01OnboardingRecord(),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [
          syn01DocumentHit(),
          {
            kind: 'document',
            id: 'file-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
          },
        ],
      ),
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(
      (mixed.relatedDocuments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(
      mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(mixed.execute, false);
    assert.equal(mixed.activate, false);
    assert.equal(mixed.send, false);
  });

  it('omits relatedDocuments when onboarding ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToOnboardingRecord(
      manny,
      {
        ...syn01OnboardingRecord(),
        id: 'proj-unscoped',
        clientCode: undefined,
      },
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-unscoped',
            title: 'Internal research packet',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [syn01DocumentHit()],
      ),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.execute, false);
    assert.equal(omitted.activate, false);
  });

  it('omits relatedDocuments when onboarding ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToOnboardingRecord(
      manny,
      {
        ...syn01OnboardingRecord(),
        id: 'proj-noncanonical',
        clientCode: 'syn01',
      },
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.execute, false);
    assert.equal(omitted.activate, false);
  });

  it('unscoped never receives scoped document refs', () => {
    const unscoped = attachRelatedContextToOnboardingRecord(
      manny,
      {
        ...syn01OnboardingRecord(),
        id: 'proj-unscoped',
        clientCode: undefined,
      },
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.execute, false);
    assert.equal(unscoped.activate, false);
  });

  it('unscoped lender catalog titles never attach scoped documents', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'lender',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital?lender=ln-liveoak',
            source: 'HVCG_Lenders',
            provenance: 'CONFIRMED' as const,
          },
          syn01DocumentHit(),
        ],
      }),
    });
    assert.equal(result.authorizedSearch.onboarding.items.length, 0);
    assert.equal(
      result.authorizedSearch.onboarding.items.some((row) => row.relatedDocuments),
      false,
    );
    const catalogBlob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(/relatedDocuments/i.test(catalogBlob), false);
    assert.equal(/TargetAmount/i.test(catalogBlob), false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.onboarding.execute, false);
    assert.equal(result.authorizedSearch.onboarding.activate, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01OnboardingHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.onboarding.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.onboarding.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.onboarding);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('proj-onboard-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToOnboardingRecord(
      otherStaff,
      syn01OnboardingRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.execute, false);
    assert.equal(denied.activate, false);
  });

  it('leaves the empty onboarding payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyOnboardingPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal(empty.execute, false);
    assert.equal(empty.activate, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    const attachedEmpty = attachRelatedContextToOnboarding(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01OnboardingHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    const sasDoc = project.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = project.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = project.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    const blob = JSON.stringify(project.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assertOnboardingRelatedDocumentsHonesty(project);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI on relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01OnboardingHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    const blob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.ok(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.equal(project.execute, false);
    assert.equal(project.activate, false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assertOnboardingRelatedDocumentsHonesty(project);
  });

  it('still attaches existing relatedMeetings and researchRelationship next to relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01OnboardingHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(project.relatedDocuments).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.onboarding.execute, false);
    assert.equal(result.authorizedSearch.onboarding.activate, false);
    assertOnboardingRelatedDocumentsHonesty(project);
  });
});

function syn01SupportHit() {
  return {
    kind: 'communication' as const,
    id: 'mail-syn-1',
    title: 'SYN01 — Can you confirm the next step?',
    href: '/clients/SYN01',
    source: 'HVCG_Communications',
    clientCode: 'SYN01',
    preview: 'Indexed preview only.',
  };
}

function syn01SupportRecord(): ClientSupportAgentRecord {
  return {
    id: 'mail-syn-1',
    title: 'SYN01 — Can you confirm the next step?',
    clientCode: 'SYN01',
    evidenceKind: 'communication',
    suggestedRoute: 'Owner review',
    classification: 'PROPOSED',
    provenance: 'PROPOSED',
    invented: false,
    hubMiRow: false,
    execute: false,
    send: false,
    autoRespond: false,
    draftOnly: true,
    evidence: [
      {
        kind: 'communication',
        id: 'mail-syn-1',
        title: 'SYN01 — Can you confirm the next step?',
        source: 'HVCG_Communications',
        classification: 'PROPOSED',
      },
    ],
    missingRequirements: [
      'Owner must review and decide reply, reassign, or close. Agent does not send, auto-respond, or execute routing.',
    ],
    ownerDecisions: [{ decision: 'Reply or send to the client', status: 'escalated', execute: false }],
    nextAction:
      'Owner review of this entitled support item. Reply, reassign, close, and send remain owner-gated. Suggested replies stay draft-only.',
  };
}

describe('ATLAS-CLIENT-SUPPORT-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches the same entitled research refs on meetings and client support', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01SupportHit()],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(meeting);
    assert.ok(mail);
    assert.equal(
      meeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(mail.researchRelationship, meeting.researchRelationship);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(JSON.stringify(meeting.researchRelationship).includes('PDG01'), false);
    for (const row of meeting.researchRelationship || []) {
      assert.equal(row.invented, false);
      assert.equal(row.lenderCriteriaInvented, false);
      assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
      assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
      assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
      assert.equal('downloadUrl' in row, false);
      assert.equal('transcript' in row, false);
      assert.equal('TargetAmount' in row, false);
    }
    const blob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
    assert.equal(blob.includes('PDG01'), false);
  });

  it('never attaches Client B or unscoped lender research to Client A support', () => {
    const mixed = attachRelatedContextToClientSupportRecord(
      staff,
      syn01SupportRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
    assert.equal(/live oak/i.test(JSON.stringify(mixed)), false);
  });

  it('omits extras for unauthorized principals and empty client-support payloads', () => {
    const denied = attachRelatedContextToClientSupportRecord(
      otherStaff,
      syn01SupportRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);

    const empty = emptyClientSupportPayload();
    const attachedEmpty = attachRelatedContextToClientSupport(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty, empty);
  });
});

function assertSupportRelatedDocumentsHonesty(item: ClientSupportAgentRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  assert.equal(item.invented, false);
  assert.equal(item.hubMiRow, false);
  assert.equal(item.execute, false);
  assert.equal(item.send, false);
  assert.equal(item.autoRespond, false);
  assert.equal(item.draftOnly, true);
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
  }
  for (const row of item.relatedDocuments || []) {
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.equal('previewGetUrl' in row, false);
    assert.equal('previewPostUrl' in row, false);
  }
}

describe('ATLAS-CLIENT-SUPPORT-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  function searchWithDocuments(
    documents: DocumentOperatingRecord[],
    hits: AtlasAuthorizedSearchHit[] = [],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedDocuments on entitled support and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01SupportHit(), syn01DocumentHit()],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(mail);
    assert.ok(document);
    const related = mail.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(related);
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.title, 'SYN01 intake memo');
    assert.equal(related.webUrl, DOC_SOURCE);
    assert.equal(related.source, 'HVCG_Communications/file-index');
    assert.ok((mail.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(mail.relatedDocuments)), false);
    assert.equal(JSON.stringify(mail.relatedDocuments).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.clientSupport.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.clientSupport.execute, false);
    assert.equal(result.authorizedSearch.clientSupport.send, false);
    assert.equal(result.authorizedSearch.clientSupport.autoRespond, false);
    assert.equal(result.authorizedSearch.clientSupport.draftOnly, true);
    assert.equal(result.authorizedSearch.clientSupport.hubMi, false);
    assertSupportRelatedDocumentsHonesty(mail);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01SupportHit(), syn01DocumentHit()],
    });
    const ctxMail = viaIndex.clientContext.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(ctxMail);
    assert.equal(ctxMail.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxMail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxMail.relatedDocuments, mail.relatedDocuments);
    assert.deepEqual(ctxMail.relatedMeetings, mail.relatedMeetings);
    assert.deepEqual(ctxMail.researchRelationship, mail.researchRelationship);
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01SupportHit()],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in mail, false);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assertSupportRelatedDocumentsHonesty(mail);
  });

  it('never attaches Client B documents to a Client A support item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01SupportHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((mail.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertSupportRelatedDocumentsHonesty(mail);

    const mixed = attachRelatedContextToClientSupportRecord(
      staff,
      syn01SupportRecord(),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [
          syn01DocumentHit(),
          {
            kind: 'document',
            id: 'file-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
          },
        ],
      ),
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(
      (mixed.relatedDocuments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(
      mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(mixed.execute, false);
    assert.equal(mixed.send, false);
    assert.equal(mixed.autoRespond, false);
    assert.equal(mixed.draftOnly, true);
  });

  it('omits relatedDocuments when support ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToClientSupportRecord(
      manny,
      {
        ...syn01SupportRecord(),
        id: 'mail-unscoped',
        clientCode: undefined,
      },
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-unscoped',
            title: 'Internal research packet',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [syn01DocumentHit()],
      ),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.execute, false);
    assert.equal(omitted.send, false);
    assert.equal(omitted.autoRespond, false);
    assert.equal(omitted.draftOnly, true);
  });

  it('omits relatedDocuments when support ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToClientSupportRecord(
      manny,
      {
        ...syn01SupportRecord(),
        id: 'mail-noncanonical',
        clientCode: 'syn01',
      },
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.execute, false);
    assert.equal(omitted.send, false);
    assert.equal(omitted.autoRespond, false);
    assert.equal(omitted.draftOnly, true);
  });

  it('unscoped never receives scoped document refs', () => {
    const unscoped = attachRelatedContextToClientSupportRecord(
      manny,
      {
        ...syn01SupportRecord(),
        id: 'mail-unscoped',
        clientCode: undefined,
      },
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.execute, false);
    assert.equal(unscoped.send, false);
    assert.equal(unscoped.autoRespond, false);
    assert.equal(unscoped.draftOnly, true);
  });

  it('unscoped lender catalog titles never attach scoped documents', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'lender',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital?lender=ln-liveoak',
            source: 'HVCG_Lenders',
            provenance: 'CONFIRMED' as const,
          },
          syn01DocumentHit(),
        ],
      }),
    });
    assert.equal(result.authorizedSearch.clientSupport.items.length, 0);
    assert.equal(
      result.authorizedSearch.clientSupport.items.some((row) => row.relatedDocuments),
      false,
    );
    const catalogBlob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(/relatedDocuments/i.test(catalogBlob), false);
    assert.equal(/TargetAmount/i.test(catalogBlob), false);
    assert.equal(result.authorizedSearch.clientSupport.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.clientSupport.execute, false);
    assert.equal(result.authorizedSearch.clientSupport.send, false);
    assert.equal(result.authorizedSearch.clientSupport.autoRespond, false);
    assert.equal(result.authorizedSearch.clientSupport.draftOnly, true);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01SupportHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.clientSupport.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.clientSupport.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.clientSupport);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToClientSupportRecord(
      otherStaff,
      syn01SupportRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.execute, false);
    assert.equal(denied.send, false);
    assert.equal(denied.autoRespond, false);
    assert.equal(denied.draftOnly, true);
  });

  it('leaves the empty client-support payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyClientSupportPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal(empty.execute, false);
    assert.equal(empty.send, false);
    assert.equal(empty.autoRespond, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    const attachedEmpty = attachRelatedContextToClientSupport(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01SupportHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    const sasDoc = mail.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = mail.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = mail.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    const blob = JSON.stringify(mail.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assertSupportRelatedDocumentsHonesty(mail);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI on relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01SupportHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    const blob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.ok(mail.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.equal(mail.execute, false);
    assert.equal(mail.send, false);
    assert.equal(mail.autoRespond, false);
    assert.equal(result.authorizedSearch.clientSupport.policyClass, 'OWNER_ESCALATE');
    assertSupportRelatedDocumentsHonesty(mail);
  });

  it('still attaches existing relatedMeetings and researchRelationship next to relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01SupportHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(mail.relatedDocuments).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(mail.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(mail.relatedDocuments)), false);
    assert.equal(result.authorizedSearch.clientSupport.policyClass, 'OWNER_ESCALATE');
    assert.equal(result.authorizedSearch.clientSupport.execute, false);
    assert.equal(result.authorizedSearch.clientSupport.send, false);
    assert.equal(result.authorizedSearch.clientSupport.autoRespond, false);
    assertSupportRelatedDocumentsHonesty(mail);
  });
});

function syn01CapitalHit() {
  return {
    kind: 'capital_opportunity' as const,
    id: 'cap-syn-1',
    title: 'SYN01 entitled capital opportunity',
    href: '/capital?opportunity=cap-syn-1',
    source: 'HVCG_CapitalOpportunities',
    clientCode: 'SYN01',
    provenance: 'CONFIRMED' as const,
  };
}

function syn01CapitalRecord(overrides: Partial<CapitalSubmissionPrepareRecord> = {}): CapitalSubmissionPrepareRecord {
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

describe('ATLAS-CAPITAL-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches the same entitled research refs on meetings and capital', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01CapitalHit()],
      }),
    });
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(meeting);
    assert.ok(capital);
    assert.equal(
      meeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(capital.researchRelationship, meeting.researchRelationship);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(JSON.stringify(meeting.researchRelationship).includes('PDG01'), false);
    for (const row of meeting.researchRelationship || []) {
      assert.equal(row.invented, false);
      assert.equal(row.lenderCriteriaInvented, false);
      assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
      assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
      assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
      assert.equal('downloadUrl' in row, false);
      assert.equal('transcript' in row, false);
      assert.equal('TargetAmount' in row, false);
    }
    const blob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(capital.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(capital.lenderCriteriaInvented, false);
  });

  it('never attaches Client B or unscoped lender research to Client A capital', () => {
    const mixed = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
    assert.equal(/live oak/i.test(JSON.stringify(mixed)), false);
  });

  it('omits extras for unauthorized principals and empty capital payloads', () => {
    const denied = attachRelatedContextToCapitalSubmission(
      otherStaff,
      syn01CapitalRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);

    const empty = emptyCapitalSubmissionPayload();
    const attachedEmpty = attachRelatedContextToCapitalSubmissions(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty, empty);
  });
});

function assertCapitalRelatedDocumentsHonesty(item: CapitalSubmissionPrepareRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  assert.equal(item.invented, false);
  assert.equal(item.lenderCriteriaInvented, false);
  assert.equal(item.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
  assert.equal(item.financingStatusClassification, 'HONEST_EMPTY');
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
  }
  for (const row of item.relatedDocuments || []) {
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.equal('previewGetUrl' in row, false);
    assert.equal('previewPostUrl' in row, false);
  }
}

describe('ATLAS-CAPITAL-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  function searchWithDocuments(
    documents: DocumentOperatingRecord[],
    hits: AtlasAuthorizedSearchHit[] = [],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedDocuments on entitled capital and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01CapitalHit(), syn01DocumentHit()],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(capital);
    assert.ok(document);
    const related = capital.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(related);
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.title, 'SYN01 intake memo');
    assert.equal(related.webUrl, DOC_SOURCE);
    assert.equal(related.source, 'HVCG_Communications/file-index');
    assert.ok(
      related.classification === 'CONFIRMED' ||
        related.classification === 'LIKELY' ||
        related.classification === 'PROPOSED' ||
        related.classification === 'HONEST_EMPTY',
    );
    assert.ok((capital.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(document.capitalRelationship?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(capital.relatedDocuments)), false);
    assert.equal(JSON.stringify(capital.relatedDocuments).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(capital.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.invented, false);
    assertCapitalRelatedDocumentsHonesty(capital);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01CapitalHit(), syn01DocumentHit()],
    });
    const ctxCapital = viaIndex.clientContext.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(ctxCapital);
    assert.equal(ctxCapital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxCapital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxCapital.relatedDocuments, capital.relatedDocuments);
    assert.deepEqual(ctxCapital.relatedMeetings, capital.relatedMeetings);
    assert.deepEqual(ctxCapital.researchRelationship, capital.researchRelationship);
    assert.equal(viaIndex.clientContext.capitalSubmissions.send, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.externalSubmit, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.ownerGated, true);
    assert.equal(viaIndex.clientContext.capitalSubmissions.policyClass, 'PREPARE_ONLY');
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01CapitalHit()],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in capital, false);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assertCapitalRelatedDocumentsHonesty(capital);
  });

  it('never attaches Client B documents to a Client A capital row', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01CapitalHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((capital.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assertCapitalRelatedDocumentsHonesty(capital);

    const mixed = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [
          syn01DocumentHit(),
          {
            kind: 'document',
            id: 'file-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
          },
        ],
      ),
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(
      (mixed.relatedDocuments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(
      mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(mixed.invented, false);
    assert.equal(mixed.lenderCriteriaInvented, false);
    assert.equal(mixed.financingStatus, 'UNKNOWN');
  });

  it('omits relatedDocuments when capital ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-unscoped',
        clientCode: undefined,
      }),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-unscoped',
            title: 'Internal research packet',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [syn01DocumentHit()],
      ),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.lenderCriteriaInvented, false);
    assert.equal(omitted.financingStatus, 'UNKNOWN');
  });

  it('omits relatedDocuments when capital ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-noncanonical',
        clientCode: 'syn01',
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.lenderCriteriaInvented, false);
    assert.equal(omitted.financingStatus, 'UNKNOWN');
  });

  it('unscoped never receives scoped document refs', () => {
    const unscoped = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-unscoped',
        clientCode: undefined,
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.invented, false);
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
  });

  it('unscoped lender catalog titles never attach scoped documents', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'lender',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital?lender=ln-liveoak',
            source: 'HVCG_Lenders',
            provenance: 'CONFIRMED' as const,
          },
          syn01DocumentHit(),
        ],
      }),
    });
    assert.equal(result.authorizedSearch.capitalSubmissions.items.length, 0);
    assert.equal(
      result.authorizedSearch.capitalSubmissions.items.some((row) => row.relatedDocuments),
      false,
    );
    assert.equal(
      result.authorizedSearch.capitalSubmissions.catalogCopies.some((row) => 'relatedDocuments' in row),
      false,
    );
    const catalogBlob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(/relatedDocuments/i.test(catalogBlob), false);
    assert.equal(/TargetAmount/i.test(catalogBlob), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01CapitalHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.capitalSubmissions.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.capitalSubmissions);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('cap-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.externalSubmit, false);

    const denied = attachRelatedContextToCapitalSubmission(
      otherStaff,
      syn01CapitalRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.invented, false);
    assert.equal(denied.lenderCriteriaInvented, false);
    assert.equal(denied.financingStatus, 'UNKNOWN');
  });

  it('leaves the empty capital payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyCapitalSubmissionPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal(empty.send, false);
    assert.equal(empty.externalSubmit, false);
    assert.equal(empty.ownerGated, true);
    assert.equal(empty.policyClass, 'PREPARE_ONLY');
    const attachedEmpty = attachRelatedContextToCapitalSubmissions(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.send, false);
    assert.equal(attachedEmpty.externalSubmit, false);
    assert.equal(attachedEmpty.ownerGated, true);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01CapitalHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    const sasDoc = capital.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = capital.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = capital.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    const blob = JSON.stringify(capital.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assertCapitalRelatedDocumentsHonesty(capital);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI on relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01CapitalHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    const blob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.ok(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.equal(capital.invented, false);
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assertCapitalRelatedDocumentsHonesty(capital);
  });

  it('still attaches existing relatedMeetings and researchRelationship next to relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01CapitalHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(capital.relatedDocuments).includes('PDG01'), false);
    assert.equal(JSON.stringify(capital.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(capital.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(capital.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(capital.relatedDocuments)), false);
    assert.equal(capital.invented, false);
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assertCapitalRelatedDocumentsHonesty(capital);
  });
});

function syn01AttachmentHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'document' as const,
    id: 'mail-att-syn',
    title: 'SYN01 term-sheet.pdf',
    href: '/clients/SYN01',
    source: 'HVCG_Communications/file-index',
    clientCode: 'SYN01',
    webUrl: ATT_PARENT_SOURCE,
    provenance: 'CONFIRMED' as const,
    parentMessageId: 'AAMk-syn-parent',
    attachmentId: 'att-syn-1',
    contentType: 'application/pdf',
    size: 1200,
    ...overrides,
  };
}

function syn01AttachmentRecord(overrides: Partial<DocumentOperatingRecord> = {}): DocumentOperatingRecord {
  return {
    id: 'mail-att-syn',
    title: 'SYN01 term-sheet.pdf',
    webUrl: ATT_PARENT_SOURCE,
    clientCode: 'SYN01',
    provenance: 'CONFIRMED',
    source: 'HVCG_Communications/file-index',
    parentMessageId: 'AAMk-syn-parent',
    attachmentId: 'att-syn-1',
    contentType: 'application/pdf',
    size: 1200,
    ...overrides,
  };
}

function assertCapitalRelatedAttachmentsHonesty(item: CapitalSubmissionPrepareRecord): void {
  assertCapitalRelatedDocumentsHonesty(item);
  const blob = JSON.stringify(item.relatedAttachments || []);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee|TargetAmount/i.test(blob), false);
  assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
  assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
  for (const row of item.relatedAttachments || []) {
    assert.equal(row.binariesInAtlas, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('contentBytes' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.ok(Boolean(row.attachmentId || row.parentMessageId));
    assert.ok(
      row.classification === 'CONFIRMED' ||
        row.classification === 'LIKELY' ||
        row.classification === 'PROPOSED' ||
        row.classification === 'HONEST_EMPTY',
    );
  }
}

describe('ATLAS-CAPITAL-PREPARE-RELATED-ATTACHMENTS-001 entitled same-scope inverse', () => {
  function searchWithAttachments(
    documents: DocumentOperatingRecord[] = [syn01DocumentRecord(), syn01AttachmentRecord()],
    hits: AtlasAuthorizedSearchHit[] = [syn01DocumentHit(), syn01AttachmentHit()],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedAttachments on entitled capital and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01CapitalHit(),
          syn01DocumentHit(),
          syn01AttachmentHit(),
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    const attachment = capital.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(attachment);
    assert.equal(attachment.title, 'SYN01 term-sheet.pdf');
    assert.equal(attachment.parentMessageId, 'AAMk-syn-parent');
    assert.equal(attachment.attachmentId, 'att-syn-1');
    assert.equal(attachment.contentType, 'application/pdf');
    assert.equal(attachment.size, 1200);
    assert.equal(attachment.binariesInAtlas, false);
    assert.equal(attachment.webUrl, ATT_PARENT_SOURCE);
    assert.equal('downloadUrl' in attachment, false);
    assert.equal('contentBytes' in attachment, false);
    assert.ok((capital.relatedAttachments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal((capital.relatedAttachments || []).some((row) => row.id === 'file-syn-1'), false);
    assert.equal(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      /downloadUrl|contentBytes|transcript|attendee/i.test(JSON.stringify(capital.relatedAttachments)),
      false,
    );
    assert.equal(JSON.stringify(capital.relatedAttachments).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(capital.relatedAttachments)), false);
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(capital.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.invented, false);
    assertCapitalRelatedAttachmentsHonesty(capital);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [
        syn01ClientHit(),
        syn01MeetingHit(),
        syn01CapitalHit(),
        syn01DocumentHit(),
        syn01AttachmentHit(),
      ],
    });
    const ctxCapital = viaIndex.clientContext.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(ctxCapital);
    assert.equal(ctxCapital.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.deepEqual(ctxCapital.relatedAttachments, capital.relatedAttachments);
    assert.deepEqual(ctxCapital.relatedDocuments, capital.relatedDocuments);
    assert.deepEqual(ctxCapital.relatedMeetings, capital.relatedMeetings);
    assert.deepEqual(ctxCapital.researchRelationship, capital.researchRelationship);
    assert.equal(viaIndex.clientContext.capitalSubmissions.send, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.externalSubmit, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.ownerGated, true);
    assert.equal(viaIndex.clientContext.capitalSubmissions.policyClass, 'PREPARE_ONLY');
  });

  it('honestly omits relatedAttachments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01CapitalHit(), syn01DocumentHit()],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in capital, false);
    assert.equal(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assertCapitalRelatedAttachmentsHonesty(capital);
  });

  it('never attaches Client B attachments to a Client A capital row', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01CapitalHit(),
          syn01DocumentHit(),
          syn01AttachmentHit(),
          {
            kind: 'document' as const,
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://outlook.office.com/mail/pdg-leak',
            provenance: 'CONFIRMED' as const,
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
            contentType: 'application/pdf',
            size: 88,
          },
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (capital.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('att-pdg-1'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assertCapitalRelatedAttachmentsHonesty(capital);

    const mixed = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithAttachments(
        [
          syn01DocumentRecord(),
          syn01AttachmentRecord(),
          syn01AttachmentRecord({
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            clientCode: 'PDG01',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
          }),
        ],
        [
          syn01DocumentHit(),
          syn01AttachmentHit(),
          syn01AttachmentHit({
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            clientCode: 'PDG01',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (mixed.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedAttachments).includes('PDG01'), false);
    assert.equal(JSON.stringify(mixed.relatedAttachments).includes('att-pdg-1'), false);
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(mixed.invented, false);
    assert.equal(mixed.lenderCriteriaInvented, false);
    assert.equal(mixed.financingStatus, 'UNKNOWN');
  });

  it('omits relatedAttachments when capital ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-unscoped',
        clientCode: undefined,
      }),
      searchWithAttachments(),
    );
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in omitted, false);
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.lenderCriteriaInvented, false);
    assert.equal(omitted.financingStatus, 'UNKNOWN');
  });

  it('omits relatedAttachments when capital ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-noncanonical',
        clientCode: 'syn01',
      }),
      searchWithAttachments(),
    );
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in omitted, false);
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.lenderCriteriaInvented, false);
    assert.equal(omitted.financingStatus, 'UNKNOWN');
  });

  it('unscoped never receives scoped attachment refs', () => {
    const unscoped = attachRelatedContextToCapitalSubmission(
      manny,
      syn01CapitalRecord({
        id: 'cap-unscoped',
        clientCode: undefined,
      }),
      searchWithAttachments(),
    );
    assert.equal(unscoped.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.invented, false);
    assert.equal(unscoped.lenderCriteriaInvented, false);
    assert.equal(unscoped.financingStatus, 'UNKNOWN');
  });

  it('unscoped lender catalog titles never attach scoped attachments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'lender',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital?lender=ln-liveoak',
            source: 'HVCG_Lenders',
            provenance: 'CONFIRMED' as const,
          },
          syn01AttachmentHit(),
        ],
      }),
    });
    assert.equal(result.authorizedSearch.capitalSubmissions.items.length, 0);
    assert.equal(
      result.authorizedSearch.capitalSubmissions.items.some((row) => row.relatedAttachments),
      false,
    );
    assert.equal(
      result.authorizedSearch.capitalSubmissions.catalogCopies.some((row) => 'relatedAttachments' in row),
      false,
    );
    const catalogBlob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(/relatedAttachments/i.test(catalogBlob), false);
    assert.equal(/TargetAmount/i.test(catalogBlob), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01CapitalHit(), syn01AttachmentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.capitalSubmissions.items.some((row) => row.relatedAttachments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.capitalSubmissions);
    assert.equal(unknownBlob.includes('mail-att-syn'), false);
    assert.equal(unknownBlob.includes('att-syn-1'), false);
    assert.equal(unknownBlob.includes('cap-syn-1'), false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(unknown.authorizedSearch.capitalSubmissions.externalSubmit, false);

    const denied = attachRelatedContextToCapitalSubmission(
      otherStaff,
      syn01CapitalRecord(),
      searchWithAttachments(),
    );
    assert.equal(denied.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in denied, false);
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.invented, false);
    assert.equal(denied.lenderCriteriaInvented, false);
    assert.equal(denied.financingStatus, 'UNKNOWN');
  });

  it('drops SAS and anonymous webUrl and never emits downloadUrl or contentBytes', () => {
    const sas = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithAttachments(
        [syn01DocumentRecord(), syn01AttachmentRecord({ webUrl: SAS })],
        [syn01DocumentHit(), syn01AttachmentHit({ webUrl: SAS })],
      ),
    );
    const sasAtt = sas.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(sasAtt);
    assert.equal(sasAtt.webUrl, undefined);
    assert.equal(sasAtt.binariesInAtlas, false);
    assert.equal(sasAtt.attachmentId, 'att-syn-1');
    assert.equal(sasAtt.parentMessageId, 'AAMk-syn-parent');
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(JSON.stringify(sas)), false);
    assert.equal(/downloadUrl|contentBytes|TargetAmount/i.test(JSON.stringify(sas)), false);

    const anon = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithAttachments(
        [syn01DocumentRecord(), syn01AttachmentRecord({ webUrl: ANON })],
        [syn01DocumentHit(), syn01AttachmentHit({ webUrl: ANON })],
      ),
    );
    const anonAtt = anon.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(anonAtt);
    assert.equal(anonAtt.webUrl, undefined);
    assert.equal(anonAtt.binariesInAtlas, false);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(JSON.stringify(anon)), false);
    assert.equal(/downloadUrl|contentBytes|TargetAmount/i.test(JSON.stringify(anon)), false);
    assertCapitalRelatedAttachmentsHonesty(sas);
    assertCapitalRelatedAttachmentsHonesty(anon);
  });

  it('leaves the empty capital payload unchanged and omits relatedAttachments when attachment metadata is absent', () => {
    const empty = emptyCapitalSubmissionPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedAttachments' in empty, false);
    assert.equal(empty.send, false);
    assert.equal(empty.externalSubmit, false);
    assert.equal(empty.ownerGated, true);
    assert.equal(empty.policyClass, 'PREPARE_ONLY');
    const attachedEmpty = attachRelatedContextToCapitalSubmissions(
      staff,
      empty,
      searchWithAttachments(),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.send, false);
    assert.equal(attachedEmpty.externalSubmit, false);

    const absent = attachRelatedContextToCapitalSubmission(
      staff,
      syn01CapitalRecord(),
      searchWithAttachments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(absent.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in absent, false);
    assert.equal(absent.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(absent.invented, false);
    assert.equal(absent.lenderCriteriaInvented, false);
    assert.equal(absent.financingStatus, 'UNKNOWN');
  });

  it('never invents attachment names, ids, downloadUrl, contentBytes, or TargetAmount', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01CapitalHit(),
            downloadUrl: 'https://evil.example/download',
            contentBytes: 'Invented binary',
            TargetAmount: 5000000,
          },
          {
            ...syn01AttachmentHit(),
            downloadUrl: 'https://evil.example/download',
            contentBytes: 'Invented binary',
            transcript: 'Invented transcript text',
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    const blob = JSON.stringify(result.authorizedSearch.capitalSubmissions);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/contentBytes/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    const attached = capital.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(attached);
    assert.equal(attached.title, 'SYN01 term-sheet.pdf');
    assert.equal(attached.attachmentId, 'att-syn-1');
    assert.equal(attached.parentMessageId, 'AAMk-syn-parent');
    assert.equal(attached.binariesInAtlas, false);
    assert.equal('downloadUrl' in attached, false);
    assert.equal('contentBytes' in attached, false);
    assert.equal(capital.relatedAttachments?.length, 1);
    assert.equal(capital.invented, false);
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assertCapitalRelatedAttachmentsHonesty(capital);
  });

  it('still attaches relatedMeetings, researchRelationship, and relatedDocuments next to relatedAttachments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01CapitalHit(),
          syn01MeetingHit(),
          syn01DocumentHit(),
          syn01AttachmentHit(),
        ],
      }),
    });
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(capital.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(capital.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      capital.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(capital.relatedAttachments).includes('PDG01'), false);
    assert.equal(JSON.stringify(capital.relatedDocuments).includes('PDG01'), false);
    assert.equal(/downloadUrl|contentBytes|transcript|TargetAmount/i.test(JSON.stringify(capital.relatedAttachments)), false);
    assert.equal(capital.relatedAttachments?.every((row) => row.binariesInAtlas === false), true);
    assert.equal(capital.invented, false);
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assertCapitalRelatedAttachmentsHonesty(capital);
  });
});

function syn01DocumentHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'document' as const,
    id: 'file-syn-1',
    title: 'SYN01 intake memo',
    href: '/clients/SYN01',
    source: 'HVCG_Communications/file-index',
    clientCode: 'SYN01',
    webUrl: DOC_SOURCE,
    provenance: 'CONFIRMED' as const,
    modifiedAt: '2026-08-20T18:04:00Z',
    ...overrides,
  };
}

function syn01DocumentRecord(): DocumentOperatingRecord {
  return {
    id: 'file-syn-1',
    title: 'SYN01 intake memo',
    webUrl: DOC_SOURCE,
    clientCode: 'SYN01',
    provenance: 'CONFIRMED',
    source: 'HVCG_Communications/file-index',
  };
}

function syn01ProjectHit() {
  return {
    kind: 'project' as const,
    id: 'proj-syn-1',
    title: 'SYN01 entitled intake project',
    href: '/clients/SYN01',
    source: 'HVCG_Projects',
    clientCode: 'SYN01',
    provenance: 'CONFIRMED' as const,
  };
}

function syn01ProjectRecord(overrides: Partial<ProjectOperatingRecord> = {}): ProjectOperatingRecord {
  return {
    id: 'proj-syn-1',
    title: 'SYN01 entitled intake project',
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    source: 'HVCG_Projects',
    historicalHvs: false,
    hubMiRow: true,
    invented: false,
    operationalized: true,
    ...overrides,
  };
}

function assertProjectResearchHonesty(item: ProjectOperatingRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  assert.ok(
    item.classification === 'CONFIRMED' ||
      item.classification === 'LIKELY' ||
      item.classification === 'PROPOSED' ||
      item.classification === 'STALE_OR_UNCERTAIN' ||
      item.classification === 'COMPLETE',
  );
  assert.equal(item.invented, false);
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
  }
  for (const row of item.relatedDocuments || []) {
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
  }
}

function assertDocumentResearchHonesty(item: DocumentOperatingRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
  }
}

describe('ATLAS-DOCUMENT-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled documents and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(document);
    assert.ok(meeting);
    const research = document.researchRelationship?.find(
      (row) => row.clientCode === 'SYN01' && /synthetic alpha/i.test(row.title),
    );
    assert.ok(research);
    assert.equal(research.source, 'HVCG_Clients');
    assert.equal(research.invented, false);
    assert.equal(research.lenderCriteriaInvented, false);
    assert.equal(research.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(research.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(research.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(research.superseded, false);
    assert.ok(research.retrievalDate);
    assert.ok((document.researchRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.deepEqual(document.researchRelationship, meeting.researchRelationship);
    assert.equal(document.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assertDocumentResearchHonesty(document);
    assert.equal(JSON.stringify(document.researchRelationship).includes('PDG01'), false);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01DocumentHit()],
    });
    const ctxMeeting = viaIndex.clientContext.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(ctxMeeting);
    assert.equal(
      ctxMeeting.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxMeeting.researchRelationship, document.researchRelationship);
    assert.equal('documents' in viaIndex.clientContext, false);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01DocumentHit()],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.researchRelationship, undefined);
    assert.equal('researchRelationship' in document, false);
    assertDocumentResearchHonesty(document);
  });

  it('never attaches Client B research to a Client A document', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01DocumentHit(),
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
          {
            kind: 'document' as const,
            id: 'file-pdg-leak',
            title: 'PDG01 leak memo',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/leak.pdf',
            provenance: 'CONFIRMED' as const,
          },
        ],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(
      document.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      (document.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.documents);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertDocumentResearchHonesty(document);

    const mixed = attachRelatedContextToDocument(
      staff,
      syn01DocumentRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
  });

  it('omits researchRelationship when document ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToDocument(
      manny,
      {
        ...syn01DocumentRecord(),
        id: 'file-unscoped',
        clientCode: undefined,
      },
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal('researchRelationship' in omitted, false);
  });

  it('does not attach unscoped lender research to a scoped document', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01DocumentHit(),
        ],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.clientCode, 'SYN01');
    assert.equal(document.researchRelationship, undefined);
    const blob = JSON.stringify(document);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertDocumentResearchHonesty(document);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.documents.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.documents.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.documents);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToDocument(
      otherStaff,
      syn01DocumentRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
  });

  it('leaves the empty documents payload unchanged', () => {
    const empty = {
      kind: 'document_operating_record_v1' as const,
      policyClass: 'READ_AUTO' as const,
      binariesInAtlas: false as const,
      items: [] as DocumentOperatingRecord[],
    };
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    const attachedEmpty = attachRelatedContextToDocuments(
      staff,
      empty.items,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.deepEqual(attachedEmpty, []);
    assert.equal(empty.items.length, 0);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    const blob = JSON.stringify(result.authorizedSearch.documents);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(document.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assertDocumentResearchHonesty(document);
  });

  it('still attaches existing relatedMeetings and other related* next to researchRelationship', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01DocumentHit(),
          syn01MeetingHit(),
          syn01CapitalHit(),
          {
            kind: 'project' as const,
            id: 'proj-syn-1',
            title: 'SYN01 entitled intake project',
            href: '/clients/SYN01',
            source: 'HVCG_Projects',
            clientCode: 'SYN01',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'communication' as const,
            id: 'mail-syn-1',
            title: 'SYN01 intake follow-up',
            href: '/clients/SYN01',
            source: 'HVCG_Communications',
            clientCode: 'SYN01',
            conversationId: 'conv-syn-1',
            webUrl: 'https://outlook.office.com/mail/deeplink/read/syn01-thread',
            provenance: 'CONFIRMED' as const,
          },
        ],
      }),
    });
    const document = result.authorizedSearch.documents.items.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(document.relatedEmail?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(document.relatedProject?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(document.capitalRelationship?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(
      document.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(document.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(document.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(document.researchRelationship)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(document.researchRelationship)), false);
    noInventedCriteria(document.researchRelationship);
  });
});

describe('ATLAS-PROJECT-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled projects and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ProjectHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(project);
    assert.ok(meeting);
    assert.equal(project.classification, 'CONFIRMED');
    assert.equal(project.invented, false);
    assert.equal(project.hubMiRow, true);
    const research = project.researchRelationship?.find(
      (row) => row.clientCode === 'SYN01' && /synthetic alpha/i.test(row.title),
    );
    assert.ok(research);
    assert.equal(research.source, 'HVCG_Clients');
    assert.equal(research.invented, false);
    assert.equal(research.lenderCriteriaInvented, false);
    assert.equal(research.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(research.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(research.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(research.superseded, false);
    assert.ok(research.retrievalDate);
    assert.ok((project.researchRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.deepEqual(project.researchRelationship, meeting.researchRelationship);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assertProjectResearchHonesty(project);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01ProjectHit()],
    });
    const ctxProject = viaIndex.clientContext.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(ctxProject);
    assert.equal(
      ctxProject.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxProject.researchRelationship, project.researchRelationship);
    assert.equal(ctxProject.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(ctxProject.hubMiRow, true);
    assert.equal(ctxProject.invented, false);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ProjectHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.researchRelationship, undefined);
    assert.equal('researchRelationship' in project, false);
    assert.equal(project.hubMiRow, true);
    assertProjectResearchHonesty(project);
  });

  it('never attaches Client B research to a Client A project', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01ProjectHit(),
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
          {
            kind: 'project' as const,
            id: 'proj-pdg-leak',
            title: 'PDG01 leak project',
            href: '/clients/PDG01',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED' as const,
          },
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      (project.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectResearchHonesty(project);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
  });

  it('omits researchRelationship when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal('researchRelationship' in omitted, false);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('does not attach unscoped lender research to a scoped project', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01ProjectHit(),
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    assert.equal(project.researchRelationship, undefined);
    const blob = JSON.stringify(project);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertProjectResearchHonesty(project);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ProjectHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
    assert.equal(denied.hubMiRow, true);
  });

  it('leaves the empty projects payload unchanged', () => {
    const empty = {
      kind: 'project_operating_record_v1' as const,
      policyClass: 'READ_AUTO' as const,
      invented: false as const,
      currentClientsFirst: true as const,
      items: [] as ProjectOperatingRecord[],
    };
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    const attachedEmpty = attachRelatedContextToProjects(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(project.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assert.equal(project.hubMiRow, true);
    assert.equal(project.invented, false);
    assertProjectResearchHonesty(project);
  });

  it('still attaches existing relatedMeetings next to researchRelationship', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ProjectHit(), syn01MeetingHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(project.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(project.researchRelationship)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(project.researchRelationship)), false);
    noInventedCriteria(project.researchRelationship);
    assert.equal(project.hubMiRow, true);
    assert.equal(project.invented, false);
    assert.equal(project.classification, 'CONFIRMED');
  });

  it('preserves hubMiRow=false on recovered projects and does not invent Hub-MI', () => {
    const recovered = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord({
        historicalHvs: true,
        hubMiRow: false,
        operationalized: false,
        source: 'operator_operating_picture',
      }),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(recovered.hubMiRow, false);
    assert.equal(recovered.historicalHvs, true);
    assert.equal(recovered.invented, false);
    assert.equal(recovered.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(/Hub-MI/i.test(JSON.stringify(recovered.researchRelationship)), false);
    assertProjectResearchHonesty(recovered);
  });
});

describe('ATLAS-PROJECT-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  function searchWithDocuments(
    documents: DocumentOperatingRecord[],
    hits: AtlasAuthorizedSearchHit[] = [],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedDocuments on entitled projects and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ProjectHit(), syn01DocumentHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    const document = project.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.clientCode, 'SYN01');
    assert.equal(document.title, 'SYN01 intake memo');
    assert.equal(document.webUrl, DOC_SOURCE);
    assert.equal(document.source, 'HVCG_Communications/file-index');
    assert.ok(
      document.classification === 'CONFIRMED' ||
        document.classification === 'LIKELY' ||
        document.classification === 'PROPOSED' ||
        document.classification === 'HONEST_EMPTY',
    );
    assert.ok((project.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(JSON.stringify(project.relatedDocuments).includes('PDG01'), false);
    assert.equal(project.hubMiRow, true);
    assert.equal(project.invented, false);
    assertProjectResearchHonesty(project);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01ProjectHit(), syn01DocumentHit()],
    });
    const ctxProject = viaIndex.clientContext.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(ctxProject);
    assert.equal(ctxProject.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxProject.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxProject.relatedDocuments, project.relatedDocuments);
    assert.deepEqual(ctxProject.relatedMeetings, project.relatedMeetings);
    assert.deepEqual(ctxProject.researchRelationship, project.researchRelationship);
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ProjectHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in project, false);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assertProjectResearchHonesty(project);
  });

  it('never attaches Client B documents to a Client A project', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01ProjectHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((project.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectResearchHonesty(project);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [
          syn01DocumentHit(),
          {
            kind: 'document',
            id: 'file-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
          },
        ],
      ),
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(
      (mixed.relatedDocuments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(
      mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
  });

  it('omits relatedDocuments when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-unscoped',
            title: 'Internal research packet',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [syn01DocumentHit()],
      ),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('omits relatedDocuments when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-noncanonical',
        clientCode: 'syn01',
        hubMiRow: false,
        operationalized: false,
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped document refs', () => {
    const unscoped = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.hubMiRow, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ProjectHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.hubMiRow, true);
  });

  it('leaves the empty projects payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = {
      kind: 'project_operating_record_v1' as const,
      policyClass: 'READ_AUTO' as const,
      invented: false as const,
      currentClientsFirst: true as const,
      items: [] as ProjectOperatingRecord[],
    };
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    const attachedEmpty = attachRelatedContextToProjects(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01ProjectHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    const sasDoc = project.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = project.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = project.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    const blob = JSON.stringify(project.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assertProjectResearchHonesty(project);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI on relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.ok(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.equal(project.hubMiRow, true);
    assert.equal(project.invented, false);
    assertProjectResearchHonesty(project);
  });

  it('still attaches existing relatedMeetings and researchRelationship next to relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ProjectHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const project = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(project.relatedDocuments).includes('PDG01'), false);
    assert.equal(JSON.stringify(project.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(project.hubMiRow, true);
    assert.equal(project.invented, false);
    assert.equal(project.classification, 'CONFIRMED');
  });
});

const THREAD_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-thread';

function syn01ThreadHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'communication' as const,
    id: 'mail-syn-1',
    title: 'SYN01 intake follow-up',
    href: '/clients/SYN01',
    source: 'HVCG_Communications',
    clientCode: 'SYN01',
    conversationId: 'conv-syn-1',
    provenance: 'PROPOSED' as const,
    webUrl: THREAD_SOURCE,
    preview: 'Can you confirm the next entitled document?',
    ...overrides,
  };
}

function syn01ThreadRecord(overrides: Partial<MailThreadOperatingRecord> = {}): MailThreadOperatingRecord {
  return {
    id: 'mail-syn-1',
    conversationId: 'conv-syn-1',
    title: 'SYN01 intake follow-up',
    clientCode: 'SYN01',
    channel: 'Email',
    preview: 'Can you confirm the next entitled document?',
    summary: 'Indexed preview only. Can you confirm the next entitled document?',
    summarySource: 'indexed_preview_only',
    invented: false,
    classification: 'PROPOSED',
    provenance: 'PROPOSED',
    commitments: [],
    unansweredQuestions: [],
    suggestedDraft: {
      policyClass: 'DRAFT_ONLY',
      send: false,
      autoRespond: false,
      subject: 'Re: SYN01 intake follow-up',
      body: 'This suggested reply is a draft only. It has not been sent.',
      status: 'draft',
    },
    ...overrides,
  };
}

function assertThreadResearchHonesty(item: MailThreadOperatingRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  assert.equal(item.invented, false);
  assert.equal(item.summarySource, 'indexed_preview_only');
  assert.equal(item.suggestedDraft.send, false);
  assert.equal(item.suggestedDraft.autoRespond, false);
  assert.equal(item.suggestedDraft.policyClass, 'DRAFT_ONLY');
  assert.equal(item.suggestedDraft.status, 'draft');
  for (const row of item.researchRelationship || []) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(row.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
  }
  for (const row of item.relatedDocuments || []) {
    assert.equal('downloadUrl' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.equal('preview' in row, false);
    assert.equal('suggestedDraft' in row, false);
    assert.equal('send' in row, false);
  }
}

describe('ATLAS-THREAD-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled threads and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ThreadHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    const meeting = result.authorizedSearch.meetings.items.find((row) => row.id === 'meet-syn-1');
    assert.ok(thread);
    assert.ok(meeting);
    assert.equal(thread.invented, false);
    assert.equal(thread.summarySource, 'indexed_preview_only');
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(thread.suggestedDraft.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    const research = thread.researchRelationship?.find(
      (row) => row.clientCode === 'SYN01' && /synthetic alpha/i.test(row.title),
    );
    assert.ok(research);
    assert.equal(research.source, 'HVCG_Clients');
    assert.equal(research.invented, false);
    assert.equal(research.lenderCriteriaInvented, false);
    assert.equal(research.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(research.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(research.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal(research.superseded, false);
    assert.ok(research.retrievalDate);
    assert.ok((thread.researchRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.deepEqual(thread.researchRelationship, meeting.researchRelationship);
    assert.equal(thread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assertThreadResearchHonesty(thread);
    assert.equal(JSON.stringify(thread.researchRelationship).includes('PDG01'), false);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01ThreadHit()],
    });
    const ctxThread = viaIndex.clientContext.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(ctxThread);
    assert.equal(
      ctxThread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxThread.researchRelationship, thread.researchRelationship);
    assert.equal(ctxThread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(viaIndex.clientContext.threads.autoRespond, false);
    assert.equal(viaIndex.clientContext.threads.send, false);
    assert.equal(viaIndex.clientContext.threads.indexedPreviewOnly, true);
    assert.equal(ctxThread.invented, false);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.researchRelationship, undefined);
    assert.equal('researchRelationship' in thread, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertThreadResearchHonesty(thread);
  });

  it('never attaches Client B research to a Client A thread', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01ThreadHit(),
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
          {
            kind: 'communication' as const,
            id: 'mail-pdg-leak',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'conv-pdg-1',
            provenance: 'PROPOSED' as const,
            preview: 'PDG01 must not leak into SYN01 research.',
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      (thread.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertThreadResearchHonesty(thread);

    const mixed = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'client:PDG01:must not leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          evidence: 'must not leak',
        }),
      ]),
    );
    assert.equal(mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'), true);
    assert.equal(
      (mixed.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.researchRelationship).includes('PDG01'), false);
    assert.equal(mixed.suggestedDraft.send, false);
    assert.equal(mixed.suggestedDraft.autoRespond, false);
    assert.equal(mixed.invented, false);
  });

  it('omits researchRelationship when thread ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      manny,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithResearch([
        syn01ClientResearchRecord(),
        syn01ClientResearchRecord({
          id: 'lender:ln-liveoak',
          subjectKind: 'lender',
          title: 'Live Oak Bank',
          source: 'HVCG_Lenders',
          clientCode: undefined,
          evidence: 'Copied existing sourced lender catalog title.',
        }),
      ]),
    );
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal('researchRelationship' in omitted, false);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
  });

  it('does not attach unscoped lender research to a scoped thread', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          syn01ThreadHit(),
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.clientCode, 'SYN01');
    assert.equal(thread.researchRelationship, undefined);
    const blob = JSON.stringify(thread);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertThreadResearchHonesty(thread);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ThreadHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.threads.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.threads.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.threads);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);
    assert.equal(unknown.authorizedSearch.threads.autoRespond, false);
    assert.equal(unknown.authorizedSearch.threads.send, false);

    const denied = attachRelatedContextToMailThread(
      otherStaff,
      syn01ThreadRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
    assert.equal(denied.suggestedDraft.send, false);
    assert.equal(denied.suggestedDraft.autoRespond, false);
  });

  it('leaves the empty threads payload unchanged', () => {
    const empty = emptyMailThreadPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    assert.equal(empty.autoRespond, false);
    assert.equal(empty.send, false);
    assert.equal(empty.indexedPreviewOnly, true);
    const attachedEmpty = attachRelatedContextToMailThreads(
      staff,
      empty,
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.autoRespond, false);
    assert.equal(attachedEmpty.send, false);
    assert.equal(attachedEmpty.indexedPreviewOnly, true);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ClientHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assert.equal(thread.invented, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assertThreadResearchHonesty(thread);
  });

  it('still attaches existing relatedMeetings next to researchRelationship', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ThreadHit(), syn01MeetingHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(thread.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(thread.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(thread.researchRelationship)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(thread.researchRelationship)), false);
    noInventedCriteria(thread.researchRelationship);
    assert.equal(thread.invented, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(thread.suggestedDraft.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertThreadResearchHonesty(thread);
  });
});

describe('ATLAS-THREAD-RELATED-DOCUMENTS-001 entitled same-scope inverse', () => {
  function searchWithDocuments(
    documents: DocumentOperatingRecord[],
    hits: AtlasAuthorizedSearchHit[] = [],
    research: ResearchIntelligenceRecord[] = [syn01ClientResearchRecord()],
  ): AtlasAuthorizedSearch {
    return {
      ...searchWithResearch(research),
      documents: {
        kind: 'document_operating_record_v1',
        policyClass: 'READ_AUTO',
        binariesInAtlas: false,
        items: documents,
      },
      hits,
    };
  }

  it('attaches same-scope relatedDocuments on entitled threads and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ThreadHit(), syn01DocumentHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    const document = thread.relatedDocuments?.find((row) => row.id === 'file-syn-1');
    assert.ok(document);
    assert.equal(document.clientCode, 'SYN01');
    assert.equal(document.title, 'SYN01 intake memo');
    assert.equal(document.webUrl, DOC_SOURCE);
    assert.equal(document.source, 'HVCG_Communications/file-index');
    assert.ok(
      document.classification === 'CONFIRMED' ||
        document.classification === 'LIKELY' ||
        document.classification === 'PROPOSED' ||
        document.classification === 'HONEST_EMPTY',
    );
    assert.ok((thread.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(thread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(/downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(thread.relatedDocuments)), false);
    assert.equal(/preview|suggestedDraft|"send"/i.test(JSON.stringify(thread.relatedDocuments)), false);
    assert.equal(JSON.stringify(thread.relatedDocuments).includes('PDG01'), false);
    assert.equal(thread.invented, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(thread.suggestedDraft.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertThreadResearchHonesty(thread);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ClientHit(), syn01MeetingHit(), syn01ThreadHit(), syn01DocumentHit()],
    });
    const ctxThread = viaIndex.clientContext.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(ctxThread);
    assert.equal(ctxThread.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(ctxThread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxThread.relatedDocuments, thread.relatedDocuments);
    assert.deepEqual(ctxThread.relatedMeetings, thread.relatedMeetings);
    assert.deepEqual(ctxThread.researchRelationship, thread.researchRelationship);
    assert.equal(viaIndex.clientContext.threads.autoRespond, false);
    assert.equal(viaIndex.clientContext.threads.send, false);
    assert.equal(viaIndex.clientContext.threads.indexedPreviewOnly, true);
  });

  it('honestly omits relatedDocuments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01MeetingHit(), syn01ThreadHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in thread, false);
    assert.equal(thread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertThreadResearchHonesty(thread);
  });

  it('never attaches Client B documents to a Client A thread', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01MeetingHit(),
          syn01ThreadHit(),
          syn01DocumentHit(),
          {
            kind: 'document' as const,
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            provenance: 'CONFIRMED' as const,
          },
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal((thread.relatedDocuments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertThreadResearchHonesty(thread);

    const mixed = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-pdg',
            title: 'PDG01 leak packet',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/secret.pdf',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [
          syn01DocumentHit(),
          {
            kind: 'document',
            id: 'file-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
          },
        ],
      ),
    );
    assert.equal(mixed.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(
      (mixed.relatedDocuments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedDocuments).includes('PDG01'), false);
    assert.equal(
      mixed.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(mixed.suggestedDraft.send, false);
    assert.equal(mixed.suggestedDraft.autoRespond, false);
    assert.equal(mixed.invented, false);
  });

  it('omits relatedDocuments when thread ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      manny,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithDocuments(
        [
          syn01DocumentRecord(),
          {
            id: 'file-unscoped',
            title: 'Internal research packet',
            webUrl: DOC_SOURCE,
            provenance: 'PROPOSED',
            source: 'HVCG_Communications/file-index',
          },
        ],
        [syn01DocumentHit()],
      ),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
  });

  it('omits relatedDocuments when thread ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      manny,
      syn01ThreadRecord({
        id: 'mail-noncanonical',
        clientCode: 'syn01',
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(omitted.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in omitted, false);
    assert.equal(omitted.researchRelationship, undefined);
    assert.equal(omitted.invented, false);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
  });

  it('unscoped never receives scoped document refs', () => {
    const unscoped = attachRelatedContextToMailThread(
      manny,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(unscoped.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.invented, false);
    assert.equal(unscoped.suggestedDraft.send, false);
    assert.equal(unscoped.suggestedDraft.autoRespond, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ThreadHit(), syn01DocumentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.threads.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.threads.items.some((row) => row.relatedDocuments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.threads);
    assert.equal(unknownBlob.includes('file-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);
    assert.equal(unknown.authorizedSearch.threads.autoRespond, false);
    assert.equal(unknown.authorizedSearch.threads.send, false);

    const denied = attachRelatedContextToMailThread(
      otherStaff,
      syn01ThreadRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.suggestedDraft.send, false);
    assert.equal(denied.suggestedDraft.autoRespond, false);
  });

  it('leaves the empty threads payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyMailThreadPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal(empty.autoRespond, false);
    assert.equal(empty.send, false);
    assert.equal(empty.indexedPreviewOnly, true);
    const attachedEmpty = attachRelatedContextToMailThreads(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.autoRespond, false);
    assert.equal(attachedEmpty.send, false);
    assert.equal(attachedEmpty.indexedPreviewOnly, true);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01ThreadHit(),
          syn01DocumentHit({
            id: 'file-sas',
            title: 'SYN01 SAS packet',
            webUrl: SAS,
          }),
          syn01DocumentHit({
            id: 'file-anon',
            title: 'SYN01 anonymous packet',
            webUrl: ANON,
          }),
          syn01DocumentHit({
            id: 'file-ok',
            title: 'SYN01 entitled packet',
            webUrl: DOC_SOURCE,
          }),
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    const sasDoc = thread.relatedDocuments?.find((row) => row.id === 'file-sas');
    const anonDoc = thread.relatedDocuments?.find((row) => row.id === 'file-anon');
    const okDoc = thread.relatedDocuments?.find((row) => row.id === 'file-ok');
    if (sasDoc) assert.equal(sasDoc.webUrl, undefined);
    if (anonDoc) assert.equal(anonDoc.webUrl, undefined);
    assert.ok(okDoc);
    assert.equal(okDoc.webUrl, DOC_SOURCE);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    const blob = JSON.stringify(thread.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertThreadResearchHonesty(thread);
  });

  it('never invents TargetAmount, downloadUrl, transcript, criteria, or Hub-MI on relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
          {
            ...syn01DocumentHit(),
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(/Hub-MI/i.test(blob), false);
    assert.ok(thread.relatedDocuments?.some((row) => row.id === 'file-syn-1'));
    assert.equal(thread.invented, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assertThreadResearchHonesty(thread);
  });

  it('still attaches existing relatedMeetings and researchRelationship next to relatedDocuments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01ThreadHit(), syn01MeetingHit(), syn01DocumentHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(thread);
    assert.equal(thread.relatedDocuments?.some((row) => row.id === 'file-syn-1'), true);
    assert.equal(thread.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      thread.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(thread.relatedDocuments).includes('PDG01'), false);
    assert.equal(JSON.stringify(thread.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(thread.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(thread.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(thread.relatedDocuments)), false);
    assert.equal(thread.invented, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(thread.suggestedDraft.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertThreadResearchHonesty(thread);
  });
});
