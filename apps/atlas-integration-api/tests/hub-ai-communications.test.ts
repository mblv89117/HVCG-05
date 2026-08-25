/**
 * ATLAS-AI-COMMUNICATIONS-001
 * + ATLAS-AI-COMMS-SUGGESTED-ATTACHMENTS-001
 * + ATLAS-AI-COMMS-SUGGESTED-PROJECTS-001
 * Smallest Hub increment: thread context on already-indexed entitled mail
 * so the owner does not need Outlook. Indexed preview only. DRAFT_ONLY.
 * Never AUTO_RESPOND / send. No invented amounts or deadlines.
 * Authorization before retrieval. No cross-client leak.
 * suggestedDraft.suggestedAttachments copies already-indexed same-scope
 * outlook-mail-attachment metadata (same RelatedDocumentAttachmentRef /
 * relatedAttachments path). suggestedDraft.suggestedProjects copies
 * already-entitled same-scope project operating-record refs (same
 * RelatedDocumentProjectRef / relatedProjects path). Missing /
 * non-canonical ClientCode omits them. Client A never receives Client B.
 * No downloadUrl / contentBytes / TargetAmount / Hub-MI invention.
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
import {
  emptyMailThreadPayload,
  mailThreadPayloadHasInventedFacts,
} from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  attachRelatedContextToMailThread,
  attachRelatedContextToMailThreads,
  DOCUMENT_RELATED_CONTEXT_PAGE_SIZE,
} from '../src/pm/operatorDesk/documentRelatedContext.ts';
import {
  ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
  COMMUNICATIONS_POLICY_CLASS,
  COMMUNICATIONS_SEND,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type DocumentOperatingRecord,
  type MailThreadOperatingRecord,
  type OperatorOperatingPicture,
  type ProjectOperatingRecord,
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
    const now = '2026-08-24T18:00:00.000Z';
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
      now,
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

const ATT_PARENT_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-att-parent';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/term-sheet.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

const otherStaff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa02',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Team Member'],
};

function syn01ThreadHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'communication' as const,
    id: 'mail-syn-1',
    title: 'SYN01 intake follow-up',
    href: '/clients/SYN01',
    source: 'HVCG_Communications',
    clientCode: 'SYN01',
    webUrl: SOURCE,
    preview: 'Can you confirm the next entitled document? I will send the existing package after review.',
    conversationId: 'conv-syn-1',
    provenance: 'CONFIRMED' as const,
    ...overrides,
  };
}

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

function searchWithAttachments(
  documents: DocumentOperatingRecord[] = [syn01AttachmentRecord()],
  hits: ReturnType<typeof syn01AttachmentHit>[] = [syn01AttachmentHit()],
): AtlasAuthorizedSearch {
  return {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: false,
    query: 'SYN01',
    hitCount: hits.length,
    hits,
    documents: { kind: 'document_operating_record_v1', policyClass: 'READ_AUTO', binariesInAtlas: false, items: documents },
    projects: { kind: 'project_operating_record_v1', policyClass: 'READ_AUTO', invented: false, currentClientsFirst: true, items: [] },
    threads: {
      kind: 'mail_thread_operating_record_v1',
      policyClass: 'DRAFT_ONLY',
      invented: false,
      autoRespond: false,
      send: false,
      indexedPreviewOnly: true,
      items: [],
    },
    meetings: { kind: 'meeting_operating_record_v1', policyClass: 'READ_AUTO', invented: false, items: [] },
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
      items: [],
    },
    onboarding: {
      kind: 'onboarding_agent_v1',
      policyClass: 'OWNER_ESCALATE',
      invented: false,
      execute: false,
      activate: false,
      send: false,
      liveGtmOutbound: false,
      ownerGated: true,
      hubMi: false,
      items: [],
    },
    clientSupport: {
      kind: 'client_support_agent_v1',
      policyClass: 'OWNER_ESCALATE',
      invented: false,
      execute: false,
      send: false,
      autoRespond: false,
      draftOnly: true,
      ownerGated: true,
      hubMi: false,
      items: [],
    },
    classification: 'CONFIRMED',
    why: 'test',
    basedOn: 'test',
    entitled: true,
    ran: true,
    pictureComposed: false,
    actionabilityApplied: false,
  } as AtlasAuthorizedSearch;
}

function assertSuggestedAttachmentsHonesty(item: MailThreadOperatingRecord): void {
  assert.equal(item.invented, false);
  assert.equal(item.summarySource, 'indexed_preview_only');
  assert.equal(item.suggestedDraft.send, false);
  assert.equal(item.suggestedDraft.autoRespond, false);
  assert.equal(item.suggestedDraft.policyClass, 'DRAFT_ONLY');
  assert.equal(item.suggestedDraft.status, 'draft');
  const attachments = item.suggestedDraft.suggestedAttachments || [];
  const blob = JSON.stringify(attachments);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee|TargetAmount/i.test(blob), false);
  assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
  assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
  for (const row of attachments) {
    assert.equal(row.binariesInAtlas, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('contentBytes' in row, false);
    assert.ok(Boolean(row.attachmentId || row.parentMessageId));
  }
}

describe('ATLAS-AI-COMMS-SUGGESTED-ATTACHMENTS-001 entitled same-scope draft refs', () => {
  it('attaches same-scope suggestedAttachments on entitled draft replies and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit(), syn01AttachmentHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    const attachment = thread.suggestedDraft.suggestedAttachments?.find((row) => row.id === 'mail-att-syn');
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
    assert.ok((thread.suggestedDraft.suggestedAttachments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal((thread.suggestedDraft.suggestedAttachments || []).some((row) => row.id === 'file-sow'), false);
    assert.equal('relatedAttachments' in thread, false);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedAttachmentsHonesty(thread);
    assert.equal(JSON.stringify(thread.suggestedDraft.suggestedAttachments).includes('PDG01'), false);
    noInvent(thread.suggestedDraft);

    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ThreadHit(), syn01AttachmentHit()],
    });
    const ctxThread = viaIndex.clientContext.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(ctxThread);
    assert.equal(ctxThread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.deepEqual(ctxThread.suggestedDraft.suggestedAttachments, thread.suggestedDraft.suggestedAttachments);
    assertDraftOnly(viaIndex.clientContext.threads);
  });

  it('honestly omits suggestedAttachments when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.equal(thread.suggestedDraft.suggestedAttachments, undefined);
    assert.equal('suggestedAttachments' in thread.suggestedDraft, false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedAttachmentsHonesty(thread);
  });

  it('never attaches Client B attachments to a Client A suggested draft', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ThreadHit(),
          syn01AttachmentHit(),
          syn01AttachmentHit({
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            href: '/clients/PDG01',
            clientCode: 'PDG01',
            webUrl: 'https://outlook.office.com/mail/pdg-leak',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
            size: 88,
          }),
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.equal(thread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (thread.suggestedDraft.suggestedAttachments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title),
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('att-pdg-1'), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertDraftOnly(result.authorizedSearch.threads);

    const mixed = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithAttachments(
        [
          syn01AttachmentRecord(),
          syn01AttachmentRecord({
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            webUrl: 'https://outlook.office.com/mail/pdg-leak',
            clientCode: 'PDG01',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
            size: 88,
          }),
        ],
        [
          syn01AttachmentHit(),
          syn01AttachmentHit({
            id: 'mail-att-pdg-hit',
            title: 'PDG01 leak hit',
            href: '/clients/PDG01',
            clientCode: 'PDG01',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
          }),
        ],
      ),
    );
    assert.equal(mixed.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (mixed.suggestedDraft.suggestedAttachments || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title),
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.suggestedDraft.suggestedAttachments).includes('PDG01'), false);
    assert.equal(mixed.suggestedDraft.send, false);
    assert.equal(mixed.suggestedDraft.autoRespond, false);
    assertSuggestedAttachmentsHonesty(mixed);
  });

  it('omits suggestedAttachments when ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithAttachments(),
    );
    assert.equal(omitted.suggestedDraft.suggestedAttachments, undefined);
    assert.equal('suggestedAttachments' in omitted.suggestedDraft, false);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
    assert.equal(omitted.invented, false);
  });

  it('omits suggestedAttachments when ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-noncanonical',
        clientCode: 'syn01',
      }),
      searchWithAttachments(),
    );
    assert.equal(omitted.suggestedDraft.suggestedAttachments, undefined);
    assert.equal('suggestedAttachments' in omitted.suggestedDraft, false);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped attachment refs', () => {
    const unscoped = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithAttachments(),
    );
    assert.equal(unscoped.suggestedDraft.suggestedAttachments, undefined);
    assert.equal('suggestedAttachments' in unscoped.suggestedDraft, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.suggestedDraft.send, false);
    assert.equal(unscoped.suggestedDraft.autoRespond, false);
  });

  it('omits suggestedAttachments for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit(), syn01AttachmentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.threads.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.threads.items.some((row) => row.suggestedDraft.suggestedAttachments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.threads);
    assert.equal(unknownBlob.includes('mail-att-syn'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknown.authorizedSearch.threads.send, false);
    assert.equal(unknown.authorizedSearch.threads.autoRespond, false);

    const denied = attachRelatedContextToMailThread(
      otherStaff,
      syn01ThreadRecord(),
      searchWithAttachments(),
    );
    assert.equal(denied.suggestedDraft.suggestedAttachments, undefined);
    assert.equal('suggestedAttachments' in denied.suggestedDraft, false);
    assert.equal(denied.suggestedDraft.send, false);
    assert.equal(denied.suggestedDraft.autoRespond, false);
  });

  it('leaves the empty threads payload unchanged and drops SAS or anonymous attachment webUrl', async () => {
    const empty = emptyMailThreadPayload();
    assert.deepEqual(empty.items, []);
    const attachedEmpty = attachRelatedContextToMailThreads(staff, empty, searchWithAttachments());
    assert.equal(attachedEmpty, empty);
    assert.deepEqual(attachedEmpty, empty);
    assert.equal(attachedEmpty.items.length, 0);
    assert.equal(attachedEmpty.send, false);
    assert.equal(attachedEmpty.autoRespond, false);
    assert.equal(attachedEmpty.indexedPreviewOnly, true);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ThreadHit(),
          syn01AttachmentHit({
            id: 'mail-att-sas',
            title: 'SYN01 SAS term-sheet.pdf',
            webUrl: SAS,
            attachmentId: 'att-sas-1',
          }),
          syn01AttachmentHit({
            id: 'mail-att-anon',
            title: 'SYN01 anonymous term-sheet.pdf',
            webUrl: ANON,
            attachmentId: 'att-anon-1',
          }),
          syn01AttachmentHit(),
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    const sasAtt = thread.suggestedDraft.suggestedAttachments?.find((row) => row.id === 'mail-att-sas');
    const anonAtt = thread.suggestedDraft.suggestedAttachments?.find((row) => row.id === 'mail-att-anon');
    const okAtt = thread.suggestedDraft.suggestedAttachments?.find((row) => row.id === 'mail-att-syn');
    if (sasAtt) assert.equal(sasAtt.webUrl, undefined);
    if (anonAtt) assert.equal(anonAtt.webUrl, undefined);
    assert.ok(okAtt);
    assert.equal(okAtt.webUrl, ATT_PARENT_SOURCE);
    const blob = JSON.stringify(thread.suggestedDraft.suggestedAttachments || []);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl|contentBytes/i.test(blob), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedAttachmentsHonesty(thread);
  });

  it('never invents downloadUrl, contentBytes, or send on suggestedAttachments', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            contentBytes: 'InventedBytes',
            TargetAmount: 5000000,
          },
          {
            ...syn01AttachmentHit(),
            downloadUrl: 'https://evil.example/download',
            contentBytes: 'InventedBytes',
            transcript: 'Invented transcript text',
            TargetAmount: 5000000,
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/contentBytes/i.test(blob), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal(thread.suggestedDraft.suggestedAttachments?.every((row) => row.binariesInAtlas === false), true);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedAttachmentsHonesty(thread);
  });
});

function syn01ProjectHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'project' as const,
    id: 'proj-syn-1',
    title: 'SYN01 entitled operating project',
    href: '/clients/SYN01',
    source: 'HVCG_Projects',
    clientCode: 'SYN01',
    provenance: 'CONFIRMED' as const,
    classification: 'CONFIRMED' as const,
    ...overrides,
  };
}

function syn01ProjectRecord(overrides: Partial<ProjectOperatingRecord> = {}): ProjectOperatingRecord {
  return {
    id: 'proj-syn-1',
    title: 'SYN01 entitled operating project',
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

function searchWithProjects(
  projects: ProjectOperatingRecord[] = [syn01ProjectRecord()],
  documents: DocumentOperatingRecord[] = [syn01AttachmentRecord()],
  hits: ReturnType<typeof syn01AttachmentHit>[] = [syn01AttachmentHit()],
): AtlasAuthorizedSearch {
  return {
    ...searchWithAttachments(documents, hits),
    projects: {
      kind: 'project_operating_record_v1',
      policyClass: 'READ_AUTO',
      invented: false,
      currentClientsFirst: true,
      items: projects,
    },
  };
}

function assertSuggestedProjectsHonesty(item: MailThreadOperatingRecord): void {
  assert.equal(item.invented, false);
  assert.equal(item.summarySource, 'indexed_preview_only');
  assert.equal(item.suggestedDraft.send, false);
  assert.equal(item.suggestedDraft.autoRespond, false);
  assert.equal(item.suggestedDraft.policyClass, 'DRAFT_ONLY');
  assert.equal(item.suggestedDraft.status, 'draft');
  const projects = item.suggestedDraft.suggestedProjects || [];
  const blob = JSON.stringify(projects);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee|TargetAmount/i.test(blob), false);
  assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
  assert.equal(blob.includes('Hub-MI'), false);
  assert.equal('relatedProjects' in item, false);
  for (const row of projects) {
    assert.equal(row.invented, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('downloadUrl' in row, false);
    assert.ok(
      row.classification === 'CONFIRMED' ||
        row.classification === 'LIKELY' ||
        row.classification === 'PROPOSED' ||
        row.classification === 'STALE_OR_UNCERTAIN' ||
        row.classification === 'COMPLETE',
    );
  }
}

describe('ATLAS-AI-COMMS-SUGGESTED-PROJECTS-001 entitled same-scope draft refs', () => {
  it('attaches same-scope suggestedProjects on entitled draft replies and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit(), syn01AttachmentHit(), syn01ProjectHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    const operating = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(thread);
    assert.ok(operating);
    const project = thread.suggestedDraft.suggestedProjects?.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.title, 'SYN01 entitled operating project');
    assert.equal(project.clientCode, 'SYN01');
    assert.equal(project.source, 'HVCG_Projects');
    assert.equal(project.invented, false);
    assert.equal(project.historicalHvs, operating.historicalHvs);
    assert.equal(project.hubMiRow, operating.hubMiRow);
    assert.ok((thread.suggestedDraft.suggestedProjects?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal('relatedProjects' in thread, false);
    assert.equal(thread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedProjectsHonesty(thread);
    assertSuggestedAttachmentsHonesty(thread);
    assert.equal(JSON.stringify(thread.suggestedDraft.suggestedProjects).includes('PDG01'), false);
    noInvent(thread.suggestedDraft);

    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledIndexHits: [syn01ThreadHit(), syn01AttachmentHit(), syn01ProjectHit()],
    });
    const ctxThread = viaIndex.clientContext.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(ctxThread);
    assert.equal(ctxThread.suggestedDraft.suggestedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.deepEqual(ctxThread.suggestedDraft.suggestedProjects, thread.suggestedDraft.suggestedProjects);
    assert.equal(ctxThread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.deepEqual(ctxThread.suggestedDraft.suggestedAttachments, thread.suggestedDraft.suggestedAttachments);
    assertDraftOnly(viaIndex.clientContext.threads);
  });

  it('still attaches entitled suggestedAttachments beside suggestedProjects', async () => {
    const attached = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithProjects(),
    );
    assert.equal(attached.suggestedDraft.suggestedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(attached.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal('relatedProjects' in attached, false);
    assert.equal(attached.suggestedDraft.send, false);
    assert.equal(attached.suggestedDraft.autoRespond, false);
    assertSuggestedProjectsHonesty(attached);
    assertSuggestedAttachmentsHonesty(attached);
  });

  it('honestly omits suggestedProjects when none are entitled', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit(), syn01AttachmentHit()],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.equal(thread.suggestedDraft.suggestedProjects, undefined);
    assert.equal('suggestedProjects' in thread.suggestedDraft, false);
    assert.equal(thread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedProjectsHonesty(thread);
    assertSuggestedAttachmentsHonesty(thread);
  });

  it('never attaches Client B projects to a Client A suggested draft', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ThreadHit(),
          syn01AttachmentHit(),
          syn01ProjectHit(),
          syn01ProjectHit({
            id: 'proj-pdg-1',
            title: 'PDG01 leak project',
            href: '/clients/PDG01',
            clientCode: 'PDG01',
          }),
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.equal(thread.suggestedDraft.suggestedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(
      (thread.suggestedDraft.suggestedProjects || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('proj-pdg-1'), false);
    assert.equal(thread.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assertDraftOnly(result.authorizedSearch.threads);

    const mixed = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithProjects(
        [
          syn01ProjectRecord(),
          syn01ProjectRecord({
            id: 'proj-pdg-1',
            title: 'PDG01 leak project',
            clientCode: 'PDG01',
            source: 'HVCG_Projects',
          }),
        ],
      ),
    );
    assert.equal(mixed.suggestedDraft.suggestedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(
      (mixed.suggestedDraft.suggestedProjects || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.suggestedDraft.suggestedProjects).includes('PDG01'), false);
    assert.equal(mixed.suggestedDraft.suggestedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(mixed.suggestedDraft.send, false);
    assert.equal(mixed.suggestedDraft.autoRespond, false);
    assertSuggestedProjectsHonesty(mixed);
    assertSuggestedAttachmentsHonesty(mixed);
  });

  it('omits suggestedProjects when ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithProjects(),
    );
    assert.equal(omitted.suggestedDraft.suggestedProjects, undefined);
    assert.equal('suggestedProjects' in omitted.suggestedDraft, false);
    assert.equal(omitted.suggestedDraft.suggestedAttachments, undefined);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
    assert.equal(omitted.invented, false);
  });

  it('omits suggestedProjects when ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-noncanonical',
        clientCode: 'syn01',
      }),
      searchWithProjects(),
    );
    assert.equal(omitted.suggestedDraft.suggestedProjects, undefined);
    assert.equal('suggestedProjects' in omitted.suggestedDraft, false);
    assert.equal(omitted.suggestedDraft.suggestedAttachments, undefined);
    assert.equal(omitted.suggestedDraft.send, false);
    assert.equal(omitted.suggestedDraft.autoRespond, false);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped project refs', () => {
    const unscoped = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord({
        id: 'mail-unscoped',
        clientCode: undefined,
      }),
      searchWithProjects(),
    );
    assert.equal(unscoped.suggestedDraft.suggestedProjects, undefined);
    assert.equal('suggestedProjects' in unscoped.suggestedDraft, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.suggestedDraft.send, false);
    assert.equal(unscoped.suggestedDraft.autoRespond, false);
  });

  it('omits suggestedProjects for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ThreadHit(), syn01AttachmentHit(), syn01ProjectHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.threads.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.threads.items.some((row) => row.suggestedDraft.suggestedProjects),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.threads);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknown.authorizedSearch.threads.send, false);
    assert.equal(unknown.authorizedSearch.threads.autoRespond, false);

    const denied = attachRelatedContextToMailThread(
      otherStaff,
      syn01ThreadRecord(),
      searchWithProjects(),
    );
    assert.equal(denied.suggestedDraft.suggestedProjects, undefined);
    assert.equal('suggestedProjects' in denied.suggestedDraft, false);
    assert.equal(denied.suggestedDraft.suggestedAttachments, undefined);
    assert.equal(denied.suggestedDraft.send, false);
    assert.equal(denied.suggestedDraft.autoRespond, false);
  });

  it('copies historicalHvs / hubMiRow from the entitled project record only', () => {
    const current = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithProjects([syn01ProjectRecord()]),
    );
    const currentRef = current.suggestedDraft.suggestedProjects?.find((row) => row.id === 'proj-syn-1');
    assert.ok(currentRef);
    assert.equal(currentRef.historicalHvs, false);
    assert.equal(currentRef.hubMiRow, true);
    assert.equal(currentRef.invented, false);

    const recovered = attachRelatedContextToMailThread(
      staff,
      syn01ThreadRecord(),
      searchWithProjects([
        syn01ProjectRecord({
          id: 'proj-recovered-1',
          title: 'SYN01 recovered operating project',
          source: 'operator_operating_picture',
          historicalHvs: true,
          hubMiRow: false,
          operationalized: false,
          classification: 'LIKELY',
        }),
      ]),
    );
    const recoveredRef = recovered.suggestedDraft.suggestedProjects?.find((row) => row.id === 'proj-recovered-1');
    assert.ok(recoveredRef);
    assert.equal(recoveredRef.historicalHvs, true);
    assert.equal(recoveredRef.hubMiRow, false);
    assert.equal(recoveredRef.invented, false);
    assert.equal(JSON.stringify(recovered.suggestedDraft.suggestedProjects).includes('Hub-MI'), false);
    assert.equal(recovered.suggestedDraft.send, false);
    assert.equal(recovered.suggestedDraft.autoRespond, false);
    assertSuggestedProjectsHonesty(recovered);
  });

  it('never invents TargetAmount, downloadUrl, Hub-MI, or send on suggestedProjects', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            ...syn01ThreadHit(),
            downloadUrl: 'https://evil.example/download',
            TargetAmount: 5000000,
          },
          {
            ...syn01AttachmentHit(),
            downloadUrl: 'https://evil.example/download',
            contentBytes: 'InventedBytes',
            TargetAmount: 5000000,
          },
          {
            ...syn01ProjectHit(),
            downloadUrl: 'https://evil.example/download',
            TargetAmount: 5000000,
            'Hub-MI': true,
            transcript: 'Invented transcript text',
          },
        ],
      }),
    });
    const thread = result.authorizedSearch.threads.items.find((row) => row.conversationId === 'conv-syn-1');
    assert.ok(thread);
    assert.ok(thread.suggestedDraft.suggestedProjects?.some((row) => row.id === 'proj-syn-1'));
    const blob = JSON.stringify(result.authorizedSearch.threads);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/TargetAmount/i.test(blob), false);
    assert.equal(blob.includes('Hub-MI'), false);
    assert.equal(thread.suggestedDraft.send, false);
    assert.equal(thread.suggestedDraft.autoRespond, false);
    assert.equal('relatedProjects' in thread, false);
    assertDraftOnly(result.authorizedSearch.threads);
    assertSuggestedProjectsHonesty(thread);
    assertSuggestedAttachmentsHonesty(thread);
    noInvent(thread.suggestedDraft);
  });
});
