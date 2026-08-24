/**
 * ATLAS-AI-COMMUNICATIONS-001
 * Smallest Hub increment: thread context on already-indexed entitled mail
 * so the owner does not need Outlook. Indexed preview only. DRAFT_ONLY.
 * Never AUTO_RESPOND / send. No invented amounts or deadlines.
 * Authorization before retrieval. No cross-client leak.
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
import { mailThreadPayloadHasInventedFacts } from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
  COMMUNICATIONS_POLICY_CLASS,
  COMMUNICATIONS_SEND,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-thread';
const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;

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

function mailService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
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
      return {
        ...emptyCollection,
        communications: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'mail-syn-1',
              title: 'SYN01 intake follow-up',
              summary:
                'Can you confirm the next entitled document? I will send the existing package after review. Source: ' +
                `${SOURCE} Key:mail:conv-syn-1`,
              webUrl: SOURCE,
              date: '2026-08-19T12:00:00Z',
              channel: 'Email',
              direction: 'Inbound',
              sourceItemId: 'AAMk-syn-1',
            },
            {
              id: 'file-sow',
              title: 'SYN01 Engagement SOW.pdf',
              summary: `File metadata index. Binary remains in OneDrive/SharePoint. Source: ${SOURCE}`,
              webUrl: SOURCE,
              date: '2026-08-18T16:00:00Z',
              sourceItemId: 'file:sow-1',
            },
          ],
        },
      };
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
        documentClasses: ['engagement'],
        nextAction: 'Review entitled SYN01 evidence already on the desk.',
      },
    ],
  };
}

function noInvent(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes('$'), false);
  assert.equal(AMOUNT.test(serialized), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
  assert.equal(serialized.includes('Hub-MI'), false);
}

function assertDraftOnly(threads: AtlasClientContext['threads'] | AtlasAuthorizedSearch['threads']): void {
  assert.equal(threads.kind, 'mail_thread_operating_record_v1');
  assert.equal(threads.policyClass, COMMUNICATIONS_POLICY_CLASS);
  assert.equal(threads.autoRespond, COMMUNICATIONS_AUTO_RESPOND);
  assert.equal(threads.send, COMMUNICATIONS_SEND);
  assert.equal(threads.invented, false);
  assert.equal(threads.indexedPreviewOnly, true);
  assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
  assert.equal(COMMUNICATIONS_SEND, false);
  assert.equal(mailThreadPayloadHasInventedFacts(threads), false);
  for (const row of threads.items) {
    assert.equal(row.invented, false);
    assert.equal(row.summarySource, 'indexed_preview_only');
    assert.equal(row.channel, 'Email');
    assert.equal(row.suggestedDraft.policyClass, 'DRAFT_ONLY');
    assert.equal(row.suggestedDraft.status, 'draft');
    assert.equal(row.suggestedDraft.send, false);
    assert.equal(row.suggestedDraft.autoRespond, false);
    assert.match(row.suggestedDraft.body, /draft only/i);
    assert.equal(/has been sent/i.test(row.suggestedDraft.body), false);
  }
}

describe('ATLAS-AI-COMMUNICATIONS-001 indexed mail thread context', () => {
  it('keeps communications policy DRAFT_ONLY and never AUTO_RESPOND', () => {
    assert.equal(ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY, 'ATLAS-AI-COMMUNICATIONS-001');
    assert.equal(COMMUNICATIONS_POLICY_CLASS, 'DRAFT_ONLY');
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(COMMUNICATIONS_SEND, false);
  });

  it('attaches the same thread records on search and client-context from indexed preview only', async () => {
    const found = await searchSharePointPm(mailService(), staff, 'SYN01');
    const mailHit = found.results.find((row) => row.id === 'mail-syn-1');
    assert.ok(mailHit);
    assert.equal(mailHit.kind, 'communication');
    assert.equal(mailHit.conversationId, 'conv-syn-1');
    assert.match(mailHit.preview || '', /Can you confirm the next entitled document/);
    assert.equal(/Key:mail/.test(mailHit.preview || ''), false);

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
    assert.deepEqual(viaIndex.clientContext.threads, search.authorizedSearch.threads);
    assertDraftOnly(search.authorizedSearch.threads);

    const thread = search.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.equal(thread.clientCode, 'SYN01');
    assert.equal(thread.direction, 'Inbound');
    assert.equal(thread.summarySource, 'indexed_preview_only');
    assert.match(thread.summary, /Indexed preview only/);
    assert.match(thread.preview, /Can you confirm the next entitled document/);
    const question = thread.unansweredQuestions.find((row) => /confirm the next entitled document/i.test(row.text));
    assert.ok(question);
    assert.equal(question.classification === 'CONFIRMED' || question.classification === 'LIKELY', true);
    const commitment = thread.commitments.find((row) => /I will send the existing package/i.test(row.text));
    assert.ok(commitment);
    assert.equal(commitment.classification, 'CONFIRMED');
    assert.equal(
      thread.classification === 'CONFIRMED' || thread.classification === 'LIKELY' || thread.classification === 'PROPOSED',
      true,
    );
    assert.equal(search.authorizedSearch.threads.items.some((row) => row.id === 'file-sow'), false);
    noInvent(thread.summary);
    noInvent(thread.suggestedDraft);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.threads, search.authorizedSearch.threads);
  });

  it('does not invent amounts/deadlines, leak foreign mail, or attach threads for unknown clients', async () => {
    const found = await searchSharePointPm(mailService(), staff, 'SYN01');
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: found.results,
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.threads.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('conv-syn-1'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);

    const reserved = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Capital',
      entitledIndexHits: found.results,
    });
    assert.equal(reserved.clientContext.threads.items.length, 0);

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
            id: 'mail-pdg-leak',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            preview: 'Can you send the Prodigy package?',
            conversationId: 'conv-pdg-1',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.threads).includes('PDG01'), false);
    assert.equal(JSON.stringify(leak.authorizedSearch.threads).includes('Prodigy'), false);
    assert.equal(leak.authorizedSearch.threads.items.some((row) => row.id === 'mail-pdg-leak'), false);
    assertDraftOnly(leak.authorizedSearch.threads);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-ai-communications-'));
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
      assert.equal(/threads|conv-syn-1|suggestedDraft|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/threads|conv-syn-1|suggestedDraft|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Summarize SYN01')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/threads|conv-syn-1|suggestedDraft|operatorDesk/i.test(runtimeText), false);
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
