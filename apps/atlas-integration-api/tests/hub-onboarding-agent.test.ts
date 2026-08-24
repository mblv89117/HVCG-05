/**
 * ATLAS-ONBOARDING-AGENT-001
 * Smallest Hub increment: native governed onboarding agent from
 * already-entitled Atlas/index intake evidence. Activation, completion,
 * Hub-MI, and live GTM stay OWNER-GATED. Authorization before retrieval.
 * No invented ClientCodes. No cross-client leak.
 * + ATLAS-ONBOARDING-RELATED-MEETINGS-001 entitled same-scope inverse.
 * + ATLAS-ONBOARDING-RESEARCH-RELATIONSHIP-001 entitled same-scope
 * research refs (same RelatedMeetingResearchRef as meetings).
 * + ATLAS-ONBOARDING-RELATED-DOCUMENTS-001 entitled same-scope
 * document refs (same RelatedMeetingDocumentRef /
 * relatedDocumentsForMeeting path as meetings / research-intel /
 * projects / threads / capital). Fail-closed when ClientCode is
 * missing / non-canonical. Unscoped never receives scoped document
 * refs. Unscoped lender catalog titles never attach scoped documents.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No TargetAmount. No Hub-MI invention. No invented
 * execute/activate/send. relatedMeetings / researchRelationship stay
 * as composed. OWNER_ESCALATE unchanged. No document.onboardingRelationship
 * field. No new Graph / search / KG / document / onboarding product.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
import { emptyOnboardingPayload, onboardingPayloadHasInventedFacts } from '../src/pm/operatorDesk/onboardingAgent.ts';
import {
  attachRelatedContextToOnboarding,
  attachRelatedContextToOnboardingRecord,
  DOCUMENT_RELATED_CONTEXT_PAGE_SIZE,
} from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_ONBOARDING_AGENT_MISSION_KEY,
  ONBOARDING_AGENT_ACTIVATE,
  ONBOARDING_AGENT_EXECUTE,
  ONBOARDING_AGENT_HUB_MI,
  ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
  ONBOARDING_AGENT_OWNER_GATED,
  ONBOARDING_AGENT_POLICY_CLASS,
  ONBOARDING_AGENT_SEND,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type AtlasClientContext,
  type DocumentOperatingRecord,
  type OnboardingAgentRecord,
  type OperatorOperatingPicture,
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
        {
          id: 'proj-capital-1',
          name: 'Capital advisory engagement',
          clientCode: 'SYN01',
          objective: 'Prepare entitled capital package.',
          status: 'active',
        },
      ] as never;
    },
    async listAuthorizedTasks() {
      return [
        {
          id: 'task-kyc-1',
          title: 'Collect KYC / identity documents',
          clientCode: 'SYN01',
          description: 'Existing entitled onboarding task.',
        },
        {
          id: 'task-other-1',
          title: 'Prepare lender memo',
          clientCode: 'SYN01',
        },
      ] as never;
    },
    async listWorkspaceCollections() {
      return emptyCollection;
    },
    async listOpportunities() {
      return [];
    },
    async listLeads() {
      return [
        {
          id: 'lead-syn-1',
          title: 'SYN01 website intake',
          clientCode: 'SYN01',
          notes: 'Existing entitled intake row.',
        },
        {
          id: 'lead-pdg-leak',
          title: 'PDG01 onboarding intake must not leak',
          clientCode: 'PDG01',
        },
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
        documentClasses: ['intake'],
        nextAction: 'Review recovered intake filename.',
      },
    ],
  };
}

function noInventedFacts(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/best[_ ]?fit/i.test(serialized), false);
  assert.equal(/credit box/i.test(serialized), false);
  assert.equal(serialized.includes('Hub-MI'), false);
  assert.equal(/has been (?:sent|activated|completed|emailed)/i.test(serialized), false);
}

function assertOwnerEscalate(
  payload: AtlasClientContext['onboarding'] | AtlasAuthorizedSearch['onboarding'],
): void {
  assert.equal(payload.kind, 'onboarding_agent_v1');
  assert.equal(payload.policyClass, ONBOARDING_AGENT_POLICY_CLASS);
  assert.equal(payload.execute, ONBOARDING_AGENT_EXECUTE);
  assert.equal(payload.activate, ONBOARDING_AGENT_ACTIVATE);
  assert.equal(payload.send, ONBOARDING_AGENT_SEND);
  assert.equal(payload.liveGtmOutbound, ONBOARDING_AGENT_LIVE_GTM_OUTBOUND);
  assert.equal(payload.ownerGated, ONBOARDING_AGENT_OWNER_GATED);
  assert.equal(payload.hubMi, ONBOARDING_AGENT_HUB_MI);
  assert.equal(payload.invented, false);
  assert.equal(onboardingPayloadHasInventedFacts(payload), false);
  for (const row of payload.items) {
    assert.equal(row.invented, false);
    assert.equal(row.hubMiRow, false);
    assert.equal(row.execute, false);
    assert.equal(row.activate, false);
    assert.equal(row.send, false);
    assert.equal(row.liveGtmOutbound, false);
    assert.match(row.nextAction, /owner-gated/i);
    assert.ok(row.ownerDecisions.length > 0);
    assert.ok(row.ownerDecisions.every((decision) => decision.status === 'escalated' && decision.execute === false));
    if (row.relatedMeetings) {
      assert.ok(row.relatedMeetings.length > 0);
      assert.ok(row.relatedMeetings.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assert.equal(/downloadUrl|transcript|attendee/i.test(JSON.stringify(row.relatedMeetings)), false);
    }
    if (row.researchRelationship) {
      assert.ok(row.researchRelationship.length > 0);
      assert.ok(row.researchRelationship.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assertOnboardingResearchHonesty(row);
    }
    if (row.relatedDocuments) {
      assert.ok(row.relatedDocuments.length > 0);
      assert.ok(row.relatedDocuments.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assert.equal(
        /downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(row.relatedDocuments)),
        false,
      );
      for (const doc of row.relatedDocuments) {
        assert.equal('downloadUrl' in doc, false);
        assert.equal('transcript' in doc, false);
        assert.equal('TargetAmount' in doc, false);
        assert.equal('hubMiRow' in doc, false);
        assert.equal('previewGetUrl' in doc, false);
        assert.equal('previewPostUrl' in doc, false);
      }
    }
  }
}

describe('ATLAS-ONBOARDING-AGENT-001 governed onboarding agent', () => {
  it('keeps onboarding policy OWNER_ESCALATE with execute/send/activate off', () => {
    assert.equal(ASK_ATLAS_ONBOARDING_AGENT_MISSION_KEY, 'ATLAS-ONBOARDING-AGENT-001');
    assert.equal(ONBOARDING_AGENT_POLICY_CLASS, 'OWNER_ESCALATE');
    assert.equal(ONBOARDING_AGENT_EXECUTE, false);
    assert.equal(ONBOARDING_AGENT_ACTIVATE, false);
    assert.equal(ONBOARDING_AGENT_SEND, false);
    assert.equal(ONBOARDING_AGENT_LIVE_GTM_OUTBOUND, false);
    assert.equal(ONBOARDING_AGENT_OWNER_GATED, true);
    assert.equal(ONBOARDING_AGENT_HUB_MI, false);
  });

  it('attaches the same onboarding records on search and client-context from entitled evidence', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const found = await searchSharePointPm(onboardingService(), staff, 'SYN01');
    const clientHit = found.results.find((row) => row.kind === 'client' && row.clientCode === 'SYN01');
    assert.ok(clientHit);
    assert.equal(clientHit.clientStage, 'Prospect');
    assert.equal(found.results.some((row) => row.id === 'proj-onboard-1'), true);
    assert.equal(found.results.some((row) => row.id === 'lead-pdg-leak'), false);

    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: found.results,
    });
    assert.deepEqual(viaIndex.clientContext.onboarding, search.authorizedSearch.onboarding);
    assertOwnerEscalate(search.authorizedSearch.onboarding);

    const client = search.authorizedSearch.onboarding.items.find((row) => row.evidenceKind === 'client');
    assert.ok(client);
    assert.equal(client.clientCode, 'SYN01');
    assert.equal(client.clientStage, 'Prospect');
    assert.match(client.missingRequirements.join(' '), /Copied ClientStage is Prospect/);

    const project = search.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.evidenceKind, 'project');
    assert.equal(project.evidence[0]?.source, 'HVCG_Projects');

    const task = search.authorizedSearch.onboarding.items.find((row) => row.id === 'task-kyc-1');
    assert.ok(task);
    assert.equal(task.evidenceKind, 'task');

    const lead = search.authorizedSearch.onboarding.items.find((row) => row.id === 'lead-syn-1');
    assert.ok(lead);
    assert.equal(lead.evidenceKind, 'lead');

    assert.equal(search.authorizedSearch.onboarding.items.some((row) => row.id === 'proj-capital-1'), false);
    assert.equal(search.authorizedSearch.onboarding.items.some((row) => row.id === 'task-other-1'), false);

    const recovered = search.authorizedSearch.onboarding.items.find((row) => row.evidenceKind === 'recovered_client');
    assert.ok(recovered);
    assert.match(recovered.missingRequirements.join(' '), /Recovered folder\/filename only/);

    noInventedFacts(search.authorizedSearch.onboarding);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.onboarding, search.authorizedSearch.onboarding);
  });

  it('fails closed for unknown clients and does not leak foreign onboarding rows', async () => {
    const found = await searchSharePointPm(onboardingService(), staff, 'SYN01');
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: found.results,
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.onboarding.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('proj-onboard-1'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);

    const reserved = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Capital',
      entitledIndexHits: found.results,
    });
    assert.equal(reserved.clientContext.onboarding.items.length, 0);

    const leak = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async () => ({
        query: 'SYN01',
        results: [
          ...found.results,
          {
            kind: 'project' as const,
            id: 'proj-pdg-onboard',
            title: 'PDG01 client onboarding',
            href: '/projects/proj-pdg-onboard',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.onboarding).includes('PDG01'), false);
    assert.equal(leak.authorizedSearch.onboarding.items.some((row) => row.id === 'proj-pdg-onboard'), false);
    assertOwnerEscalate(leak.authorizedSearch.onboarding);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-onboarding-agent-'));
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
      assert.equal(/onboarding|OWNER_ESCALATE|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/onboarding|OWNER_ESCALATE|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Onboard SYN01')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/onboarding|OWNER_ESCALATE|operatorDesk/i.test(runtimeText), false);
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

const MEETING_SOURCE = 'https://outlook.office.com/calendar/item/syn01-standup';
const DOC_SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/intake-memo.pdf';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

describe('ATLAS-ONBOARDING-RELATED-MEETINGS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedMeetings on entitled onboarding items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'project',
            id: 'proj-onboard-1',
            title: 'New client onboarding',
            href: '/projects/proj-onboard-1',
            source: 'HVCG_Projects',
            clientCode: 'SYN01',
          },
          {
            kind: 'meeting',
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
            modifiedAt: '2026-08-21T15:00:00Z',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    const meeting = project.relatedMeetings?.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.title, 'SYN01 weekly standup');
    assert.equal(meeting.date, '2026-08-21T15:00:00Z');
    assert.equal(meeting.webUrl, MEETING_SOURCE);
    assert.equal(meeting.sourceEventId, 'AAMk-syn-cal-1');
    assert.ok((project.relatedMeetings?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(/downloadUrl|transcript|attendee/i.test(JSON.stringify(project.relatedMeetings)), false);
    assert.equal(JSON.stringify(project.relatedMeetings).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [
        {
          kind: 'project',
          id: 'proj-onboard-1',
          title: 'New client onboarding',
          href: '/projects/proj-onboard-1',
          source: 'HVCG_Projects',
          clientCode: 'SYN01',
        },
        {
          kind: 'meeting',
          id: 'meet-syn-1',
          title: 'SYN01 weekly standup',
          href: '/clients/SYN01',
          source: 'HVCG_Meetings',
          clientCode: 'SYN01',
          webUrl: MEETING_SOURCE,
          provenance: 'CONFIRMED',
          sourceEventId: 'AAMk-syn-cal-1',
          modifiedAt: '2026-08-21T15:00:00Z',
        },
      ],
    });
    const ctxProject = viaIndex.clientContext.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(ctxProject);
    assert.equal(ctxProject.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxProject.relatedMeetings, project.relatedMeetings);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('honestly omits relatedMeetings when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'project',
            id: 'proj-onboard-only',
            title: 'New client onboarding',
            href: '/projects/proj-onboard-only',
            source: 'HVCG_Projects',
            clientCode: 'SYN01',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-only');
    assert.ok(project);
    assert.equal(project.relatedMeetings, undefined);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('never attaches Client B meetings to a Client A onboarding item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'project',
            id: 'proj-onboard-1',
            title: 'New client onboarding',
            href: '/projects/proj-onboard-1',
            source: 'HVCG_Projects',
            clientCode: 'SYN01',
          },
          {
            kind: 'meeting',
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
          },
          {
            kind: 'meeting',
            id: 'meet-pdg',
            title: 'PDG01 leak standup',
            href: '/clients/PDG01',
            source: 'HVCG_Meetings',
            clientCode: 'PDG01',
            webUrl: 'https://outlook.office.com/calendar/item/pdg01-leak',
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-pdg-cal-1',
          },
          {
            kind: 'project',
            id: 'proj-pdg-onboard',
            title: 'PDG01 client onboarding',
            href: '/projects/proj-pdg-onboard',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((project.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(project).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.onboarding.items.some((row) => row.id === 'proj-pdg-onboard'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.onboarding).includes('PDG01'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.onboarding).includes('ACCG01'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.onboarding).includes('CCB01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('omits relatedMeetings when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'client onboarding kickoff',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'project',
            id: 'proj-unscoped',
            title: 'New client onboarding',
            href: '/projects/proj-unscoped',
            source: 'HVCG_Projects',
          },
          {
            kind: 'meeting',
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
          },
          {
            kind: 'meeting',
            id: 'meet-unscoped',
            title: 'Internal onboarding standup',
            href: '/meetings',
            source: 'HVCG_Meetings',
            webUrl: MEETING_SOURCE,
            provenance: 'PROPOSED',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-unscoped');
    assert.ok(project);
    assert.equal(project.clientCode, undefined);
    assert.equal(project.relatedMeetings, undefined);
    assert.equal(JSON.stringify(project).includes('SYN01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
  });

  it('leaves the empty onboarding payload unchanged', async () => {
    const empty = emptyOnboardingPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    assert.equal(empty.execute, false);
    assert.equal(empty.activate, false);
    assert.equal(empty.send, false);
    assert.equal(empty.liveGtmOutbound, false);
    assert.equal(empty.hubMi, false);
    assert.equal(empty.ownerGated, true);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'capital raise package',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'meeting',
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
          },
        ],
      }),
    });
    assert.deepEqual(result.authorizedSearch.onboarding, empty);
    assert.equal(result.authorizedSearch.onboarding.items.length, 0);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
  });

  it('never invents ClientCodes, attendees, downloadUrl, or transcript text', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'project',
            id: 'proj-onboard-1',
            title: 'New client onboarding',
            href: '/projects/proj-onboard-1',
            source: 'HVCG_Projects',
            clientCode: 'SYN01',
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          },
          {
            kind: 'meeting',
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
            downloadUrl: 'https://evil.example/download',
            transcript: 'Invented transcript text',
            attendees: ['invented@example.com'],
          },
        ],
      }),
    });
    const blob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    assert.ok(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
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
    evidence: [{ kind: 'project', id: 'proj-onboard-1', title: 'New client onboarding', source: 'HVCG_Projects', classification: 'PROPOSED' }],
    missingRequirements: ['Owner must review and decide activation / onboarding completion. Agent does not activate, complete, or send.'],
    ownerDecisions: [{ decision: 'Activate ClientStage to Active Client', status: 'escalated', execute: false }],
    nextAction: 'Owner review of this entitled intake. Activation, onboarding completion, and live GTM outbound remain owner-gated.',
  };
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
    hits: [],
  } as unknown as AtlasAuthorizedSearch;
}

function assertOnboardingResearchHonesty(row: OnboardingAgentRecord): void {
  const blob = JSON.stringify(row);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|transcript|attendee/i.test(blob), false);
  assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(blob), false);
  assert.equal(/credit box/i.test(blob), false);
  for (const research of row.researchRelationship || []) {
    assert.equal(research.invented, false);
    assert.equal(research.lenderCriteriaInvented, false);
    assert.equal(research.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(research.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.equal(research.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
    assert.equal('downloadUrl' in research, false);
    assert.equal('transcript' in research, false);
    assert.equal('TargetAmount' in research, false);
  }
}

describe('ATLAS-ONBOARDING-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled onboarding items and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01OnboardingHit()],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
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
    assertOnboardingResearchHonesty(project);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01OnboardingHit()],
    });
    const ctxProject = viaIndex.clientContext.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(ctxProject);
    assert.equal(
      ctxProject.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxProject.researchRelationship, project.researchRelationship);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01OnboardingHit()],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.researchRelationship, undefined);
    assert.equal('researchRelationship' in project, false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('never attaches Client B research to a Client A onboarding item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01OnboardingHit(),
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
            id: 'proj-pdg-onboard',
            title: 'PDG01 client onboarding',
            href: '/projects/proj-pdg-onboard',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
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
    assert.equal(result.authorizedSearch.onboarding.items.some((row) => row.id === 'proj-pdg-onboard'), false);
    const blob = JSON.stringify(result.authorizedSearch.onboarding);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);

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

  it('omits researchRelationship when ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToOnboardingRecord(
      manny,
      {
        ...syn01OnboardingRecord(),
        id: 'proj-unscoped',
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

  it('does not attach unscoped lender research to a scoped onboarding item', async () => {
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
          syn01OnboardingHit(),
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    assert.equal(project.researchRelationship, undefined);
    const blob = JSON.stringify(project);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertOnboardingResearchHonesty(project);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01OnboardingHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.onboarding.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.onboarding.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.onboarding);
    assert.equal(unknownBlob.includes('proj-onboard-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToOnboardingRecord(
      otherStaff,
      syn01OnboardingRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
  });

  it('leaves the empty onboarding payload unchanged', () => {
    const empty = emptyOnboardingPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    assert.equal(empty.execute, false);
    assert.equal(empty.activate, false);
    assert.equal(empty.send, false);
    assert.equal(empty.liveGtmOutbound, false);
    assert.equal(empty.hubMi, false);
    assert.equal(empty.ownerGated, true);
    const attachedEmpty = attachRelatedContextToOnboarding(
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
          {
            ...syn01OnboardingHit(),
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
    assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(project.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assertOnboardingResearchHonesty(project);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
  });

  it('still attaches existing relatedMeetings next to researchRelationship', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01OnboardingHit(),
          {
            kind: 'meeting' as const,
            id: 'meet-syn-1',
            title: 'SYN01 weekly standup',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-cal-1',
            modifiedAt: '2026-08-21T15:00:00Z',
          },
        ],
      }),
    });
    const project = result.authorizedSearch.onboarding.items.find((row) => row.id === 'proj-onboard-1');
    assert.ok(project);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(project.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
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

function syn01MeetingHit() {
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
  };
}

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

function assertOnboardingRelatedDocumentsHonesty(item: OnboardingAgentRecord): void {
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
    assert.ok(
      related.classification === 'CONFIRMED' ||
        related.classification === 'LIKELY' ||
        related.classification === 'PROPOSED' ||
        related.classification === 'HONEST_EMPTY',
    );
    assert.ok((project.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(project.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      /downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(project.relatedDocuments)),
      false,
    );
    assert.equal(JSON.stringify(project.relatedDocuments).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
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
    assertOwnerEscalate(viaIndex.clientContext.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
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
    assertOwnerEscalate(result.authorizedSearch.onboarding);
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
    assertOwnerEscalate(result.authorizedSearch.onboarding);
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
    assert.equal(mixed.invented, false);
    assert.equal(mixed.hubMiRow, false);
    assert.equal(mixed.execute, false);
    assert.equal(mixed.activate, false);
    assert.equal(mixed.send, false);
    assert.equal(mixed.liveGtmOutbound, false);
  });

  it('omits relatedDocuments when ClientCode is missing rather than guessing', () => {
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

  it('omits relatedDocuments when ClientCode is non-canonical rather than guessing', () => {
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
    assert.equal(omitted.invented, false);
    assert.equal(omitted.hubMiRow, false);
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
    assert.equal(unscoped.invented, false);
    assert.equal(unscoped.hubMiRow, false);
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
    assertOwnerEscalate(result.authorizedSearch.onboarding);
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
    assert.equal(unknown.authorizedSearch.onboarding.execute, false);
    assert.equal(unknown.authorizedSearch.onboarding.activate, false);

    const denied = attachRelatedContextToOnboardingRecord(
      otherStaff,
      syn01OnboardingRecord(),
      searchWithDocuments([syn01DocumentRecord()], [syn01DocumentHit()]),
    );
    assert.equal(denied.relatedDocuments, undefined);
    assert.equal('relatedDocuments' in denied, false);
    assert.equal(denied.researchRelationship, undefined);
    assert.equal(denied.invented, false);
    assert.equal(denied.hubMiRow, false);
    assert.equal(denied.execute, false);
    assert.equal(denied.activate, false);
  });

  it('leaves the empty onboarding payload unchanged and drops SAS or anonymous document webUrl', async () => {
    const empty = emptyOnboardingPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedDocuments' in empty, false);
    assert.equal(empty.execute, false);
    assert.equal(empty.activate, false);
    assert.equal(empty.send, false);
    assert.equal(empty.liveGtmOutbound, false);
    assert.equal(empty.ownerGated, true);
    assert.equal(empty.hubMi, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    const attachedEmpty = attachRelatedContextToOnboarding(
      staff,
      empty,
      searchWithDocuments([syn01DocumentRecord()]),
    );
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.execute, false);
    assert.equal(attachedEmpty.activate, false);
    assert.equal(attachedEmpty.ownerGated, true);

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
    assert.equal(
      project.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    const blob = JSON.stringify(project.relatedDocuments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|transcript|previewGetUrl|previewPostUrl/i.test(blob), false);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
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
    assert.equal(project.invented, false);
    assert.equal(project.hubMiRow, false);
    assert.equal(project.execute, false);
    assert.equal(project.activate, false);
    assert.equal(project.send, false);
    assert.equal(project.liveGtmOutbound, false);
    assert.equal(result.authorizedSearch.onboarding.execute, false);
    assert.equal(result.authorizedSearch.onboarding.activate, false);
    assert.equal(result.authorizedSearch.onboarding.send, false);
    assert.equal(result.authorizedSearch.onboarding.liveGtmOutbound, false);
    assert.equal(result.authorizedSearch.onboarding.ownerGated, true);
    assert.equal(result.authorizedSearch.onboarding.hubMi, false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assertOnboardingRelatedDocumentsHonesty(project);
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    noInventedFacts(result.authorizedSearch.onboarding);
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
    assert.equal(JSON.stringify(project.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(project.researchRelationship).includes('PDG01'), false);
    assert.equal(/TargetAmount/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(/downloadUrl|transcript/i.test(JSON.stringify(project.relatedDocuments)), false);
    assert.equal(project.invented, false);
    assert.equal(project.hubMiRow, false);
    assert.equal(project.execute, false);
    assert.equal(project.activate, false);
    assert.equal(result.authorizedSearch.onboarding.policyClass, 'OWNER_ESCALATE');
    assertOwnerEscalate(result.authorizedSearch.onboarding);
    assertOnboardingRelatedDocumentsHonesty(project);
    noInventedFacts(result.authorizedSearch.onboarding);
  });
});
