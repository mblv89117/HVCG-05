/**
 * ATLAS-ONBOARDING-AGENT-001
 * Smallest Hub increment: native governed onboarding agent from
 * already-entitled Atlas/index intake evidence. Activation, completion,
 * Hub-MI, and live GTM stay OWNER-GATED. Authorization before retrieval.
 * No invented ClientCodes. No cross-client leak.
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
import { DOCUMENT_RELATED_CONTEXT_PAGE_SIZE } from '../src/pm/operatorDesk/documentRelatedContext.ts';
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
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
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
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
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
