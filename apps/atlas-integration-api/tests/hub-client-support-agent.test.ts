/**
 * ATLAS-CLIENT-SUPPORT-AGENT-001
 * Smallest Hub increment: native governed client support / routing agent
 * from already-entitled Atlas/index communications, titled support work,
 * and copied operator queues. Reply, reassign, close, Hub-MI, and send
 * stay OWNER-GATED / draft-only. Authorization before retrieval.
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
import { clientSupportPayloadHasInventedFacts } from '../src/pm/operatorDesk/clientSupportAgent.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_CLIENT_SUPPORT_AGENT_MISSION_KEY,
  CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
  CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
  CLIENT_SUPPORT_AGENT_EXECUTE,
  CLIENT_SUPPORT_AGENT_HUB_MI,
  CLIENT_SUPPORT_AGENT_OWNER_GATED,
  CLIENT_SUPPORT_AGENT_POLICY_CLASS,
  CLIENT_SUPPORT_AGENT_SEND,
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

function supportService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
          clientStage: 'Active Client',
        },
      ];
    },
    async listAuthorizedProjects() {
      return [
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
          id: 'task-followup-1',
          title: 'Follow up on client request',
          clientCode: 'SYN01',
          description: 'Existing entitled support task.',
        },
        {
          id: 'task-other-1',
          title: 'Prepare lender memo',
          clientCode: 'SYN01',
        },
      ] as never;
    },
    async listWorkspaceCollections() {
      return {
        ...emptyCollection,
        communications: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'mail-syn-1',
              title: 'SYN01 — Can you confirm the next step?',
              summary: 'Indexed preview only. Can you confirm the next step for SYN01?',
              conversationId: 'conv-syn-1',
              direction: 'Inbound',
            },
            {
              id: 'file-sow',
              title: 'SYN01 SOW.pdf',
              summary: 'Source: https://highvaluecapitalgroup.sharepoint.com/sites/HVCG/sow.pdf',
              webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG/sow.pdf',
            },
          ],
        },
        meetings: {
          queried: true,
          status: 'COMPLETE',
          items: [
            { id: 'meet-checkin-1', title: 'SYN01 weekly client check-in' },
            { id: 'meet-other-1', title: 'SYN01 internal capital standup' },
          ],
        },
      };
    },
    async listOpportunities() {
      return [];
    },
    async listLeads() {
      return [
        {
          id: 'lead-pdg-leak',
          title: 'PDG01 support ticket must not leak',
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
        documentClasses: ['support'],
        nextAction: 'Review recovered support filename.',
      },
    ],
    queues: {
      ...emptyHonestOperatingPicture().queues,
      needsAction: [
        {
          id: 'queue-syn-1',
          clientCode: 'SYN01',
          title: 'Needs action on entitled support follow-up',
          queue: 'Needs Action',
          kind: 'attention_item',
          provenance: 'PROPOSED',
          evidence: 'Entitled operator picture queue item.',
        },
      ],
    },
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
  payload: AtlasClientContext['clientSupport'] | AtlasAuthorizedSearch['clientSupport'],
): void {
  assert.equal(payload.kind, 'client_support_agent_v1');
  assert.equal(payload.policyClass, CLIENT_SUPPORT_AGENT_POLICY_CLASS);
  assert.equal(payload.execute, CLIENT_SUPPORT_AGENT_EXECUTE);
  assert.equal(payload.send, CLIENT_SUPPORT_AGENT_SEND);
  assert.equal(payload.autoRespond, CLIENT_SUPPORT_AGENT_AUTO_RESPOND);
  assert.equal(payload.draftOnly, CLIENT_SUPPORT_AGENT_DRAFT_ONLY);
  assert.equal(payload.ownerGated, CLIENT_SUPPORT_AGENT_OWNER_GATED);
  assert.equal(payload.hubMi, CLIENT_SUPPORT_AGENT_HUB_MI);
  assert.equal(payload.invented, false);
  assert.equal(clientSupportPayloadHasInventedFacts(payload), false);
  for (const row of payload.items) {
    assert.equal(row.invented, false);
    assert.equal(row.hubMiRow, false);
    assert.equal(row.execute, false);
    assert.equal(row.send, false);
    assert.equal(row.autoRespond, false);
    assert.equal(row.draftOnly, true);
    assert.match(row.nextAction, /owner-gated/i);
    assert.ok(row.ownerDecisions.length > 0);
    assert.ok(row.ownerDecisions.every((decision) => decision.status === 'escalated' && decision.execute === false));
  }
}

describe('ATLAS-CLIENT-SUPPORT-AGENT-001 governed client support / routing agent', () => {
  it('keeps support policy OWNER_ESCALATE with execute/send/autoRespond off', () => {
    assert.equal(ASK_ATLAS_CLIENT_SUPPORT_AGENT_MISSION_KEY, 'ATLAS-CLIENT-SUPPORT-AGENT-001');
    assert.equal(CLIENT_SUPPORT_AGENT_POLICY_CLASS, 'OWNER_ESCALATE');
    assert.equal(CLIENT_SUPPORT_AGENT_EXECUTE, false);
    assert.equal(CLIENT_SUPPORT_AGENT_SEND, false);
    assert.equal(CLIENT_SUPPORT_AGENT_AUTO_RESPOND, false);
    assert.equal(CLIENT_SUPPORT_AGENT_DRAFT_ONLY, true);
    assert.equal(CLIENT_SUPPORT_AGENT_OWNER_GATED, true);
    assert.equal(CLIENT_SUPPORT_AGENT_HUB_MI, false);
  });

  it('attaches the same support records on search and client-context from entitled evidence', async () => {
    const found = await searchSharePointPm(supportService(), staff, 'SYN01');
    assert.equal(found.results.some((row) => row.id === 'mail-syn-1'), true);
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
    assert.deepEqual(viaIndex.clientContext.clientSupport, search.authorizedSearch.clientSupport);
    assertOwnerEscalate(search.authorizedSearch.clientSupport);

    const mail = search.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.evidenceKind, 'communication');
    assert.equal(mail.clientCode, 'SYN01');
    assert.ok(mail.suggestedRoute === 'Owner review' || mail.suggestedRoute === 'Needs Action');
    assert.equal(mail.send, false);
    assert.equal(mail.draftOnly, true);
    assert.equal(mail.evidence[0]?.source, 'HVCG_Communications');

    const task = search.authorizedSearch.clientSupport.items.find((row) => row.id === 'task-followup-1');
    assert.ok(task);
    assert.equal(task.evidenceKind, 'task');

    const meeting = search.authorizedSearch.clientSupport.items.find((row) => row.id === 'meet-checkin-1');
    assert.ok(meeting);
    assert.equal(meeting.evidenceKind, 'meeting');

    const queued = search.authorizedSearch.clientSupport.items.find((row) => row.id === 'queue-syn-1');
    assert.ok(queued);
    assert.equal(queued.evidenceKind, 'queue_item');
    assert.equal(queued.suggestedRoute, 'Needs Action');

    assert.equal(search.authorizedSearch.clientSupport.items.some((row) => row.id === 'task-other-1'), false);
    assert.equal(search.authorizedSearch.clientSupport.items.some((row) => row.id === 'meet-other-1'), false);
    assert.equal(search.authorizedSearch.clientSupport.items.some((row) => row.id === 'proj-capital-1'), false);
    assert.equal(search.authorizedSearch.clientSupport.items.some((row) => row.id === 'file-sow'), false);

    const recovered = search.authorizedSearch.clientSupport.items.find((row) => row.evidenceKind === 'recovered_client');
    assert.ok(recovered);
    assert.match(recovered.missingRequirements.join(' '), /Recovered folder\/filename only/);

    noInventedFacts(search.authorizedSearch.clientSupport);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.clientSupport, search.authorizedSearch.clientSupport);
  });

  it('fails closed for unknown clients and does not leak foreign support rows', async () => {
    const found = await searchSharePointPm(supportService(), staff, 'SYN01');
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: found.results,
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.clientSupport.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('mail-syn-1'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);

    const reserved = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Capital',
      entitledIndexHits: found.results,
    });
    assert.equal(reserved.clientContext.clientSupport.items.length, 0);

    const leak = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async () => ({
        query: 'SYN01',
        results: [
          ...found.results,
          {
            kind: 'communication' as const,
            id: 'mail-pdg-support',
            title: 'PDG01 support ticket',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            preview: 'Please advise on PDG01.',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.clientSupport).includes('PDG01'), false);
    assert.equal(leak.authorizedSearch.clientSupport.items.some((row) => row.id === 'mail-pdg-support'), false);
    assertOwnerEscalate(leak.authorizedSearch.clientSupport);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-client-support-agent-'));
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
      assert.equal(/clientSupport|OWNER_ESCALATE|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/clientSupport|OWNER_ESCALATE|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Support SYN01')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/clientSupport|OWNER_ESCALATE|operatorDesk/i.test(runtimeText), false);
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
