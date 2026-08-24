/**
 * ATLAS-CLIENT-SUPPORT-AGENT-001
 * + ATLAS-CLIENT-SUPPORT-RELATED-MEETINGS-001
 * Smallest Hub increment: native governed client support / routing agent
 * from already-entitled Atlas/index communications, titled support work,
 * and copied operator queues. Reply, reassign, close, Hub-MI, and send
 * stay OWNER-GATED / draft-only. Authorization before retrieval.
 * Optional relatedMeetings copies already-authorized same-scope
 * HVCG_Meetings refs (same inverse as documents / projects / threads /
 * capital). Fail-closed when ClientCode is missing. No invented
 * ClientCodes. No cross-client leak.
 * + ATLAS-CLIENT-SUPPORT-RESEARCH-RELATIONSHIP-001 entitled same-scope
 * research refs (same RelatedMeetingResearchRef as meetings / onboarding).
 * + ATLAS-CLIENT-SUPPORT-RELATED-DOCUMENTS-001 entitled same-scope
 * document refs (same RelatedMeetingDocumentRef /
 * relatedDocumentsForMeeting path as meetings / research-intel /
 * projects / threads / capital / onboarding). There is no
 * document.clientSupportRelationship field. Fail-closed when ClientCode
 * is missing / non-canonical. Unscoped never receives scoped document
 * refs. Unscoped lender catalog titles never attach scoped documents.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No TargetAmount. No Hub-MI invention. No invented
 * execute/send/autoRespond. relatedMeetings / researchRelationship stay
 * as composed. OWNER_ESCALATE / DRAFT_ONLY unchanged. No new Graph /
 * search / KG / document / support product.
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
  clientSupportPayloadHasInventedFacts,
  emptyClientSupportPayload,
} from '../src/pm/operatorDesk/clientSupportAgent.ts';
import {
  attachRelatedContextToClientSupport,
  attachRelatedContextToClientSupportRecord,
  DOCUMENT_RELATED_CONTEXT_PAGE_SIZE,
} from '../src/pm/operatorDesk/documentRelatedContext.ts';
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
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type AtlasClientContext,
  type ClientSupportAgentRecord,
  type DocumentOperatingRecord,
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
              summary:
                'File metadata index. Binary remains in OneDrive/SharePoint. Source: https://highvaluecapitalgroup.sharepoint.com/sites/HVCG/sow.pdf',
              webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG/sow.pdf',
              sourceItemId: 'file:sow-1',
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
    if (row.relatedMeetings) {
      assert.ok(row.relatedMeetings.length > 0);
      assert.ok(row.relatedMeetings.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assert.equal(/downloadUrl|transcript|attendee/i.test(JSON.stringify(row.relatedMeetings)), false);
    }
    if (row.researchRelationship) {
      assert.ok(row.researchRelationship.length > 0);
      assert.ok(row.researchRelationship.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assertSupportResearchHonesty(row);
    }
    if (row.relatedDocuments) {
      assert.ok(row.relatedDocuments.length > 0);
      assert.ok(row.relatedDocuments.length <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
      assert.equal(
        /downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(row.relatedDocuments)),
        false,
      );
    }
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
    const now = '2026-08-24T18:00:00.000Z';
    const found = await searchSharePointPm(supportService(), staff, 'SYN01');
    assert.equal(found.results.some((row) => row.id === 'mail-syn-1'), true);
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
      now,
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

const MEETING_SOURCE = 'https://outlook.office.com/calendar/item/syn01-standup';
const DOC_SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/intake-memo.pdf';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

describe('ATLAS-CLIENT-SUPPORT-RELATED-MEETINGS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedMeetings on entitled support items and get_client_context', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'communication',
            id: 'mail-syn-1',
            title: 'SYN01 — Can you confirm the next step?',
            href: '/clients/SYN01',
            source: 'HVCG_Communications',
            clientCode: 'SYN01',
            preview: 'Indexed preview only.',
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
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.clientCode, 'SYN01');
    const meeting = mail.relatedMeetings?.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.title, 'SYN01 weekly standup');
    assert.equal(meeting.date, '2026-08-21T15:00:00Z');
    assert.equal(meeting.webUrl, MEETING_SOURCE);
    assert.equal(meeting.sourceEventId, 'AAMk-syn-cal-1');
    assert.ok((mail.relatedMeetings?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(/downloadUrl|transcript|attendee/i.test(JSON.stringify(mail.relatedMeetings)), false);
    assert.equal(JSON.stringify(mail.relatedMeetings).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: [
        {
          kind: 'communication',
          id: 'mail-syn-1',
          title: 'SYN01 — Can you confirm the next step?',
          href: '/clients/SYN01',
          source: 'HVCG_Communications',
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
    const ctxMail = viaIndex.clientContext.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(ctxMail);
    assert.equal(ctxMail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.deepEqual(ctxMail.relatedMeetings, mail.relatedMeetings);
    noInventedFacts(result.authorizedSearch.clientSupport);
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
            kind: 'communication',
            id: 'mail-only',
            title: 'SYN01 — Can you confirm the next step?',
            href: '/clients/SYN01',
            source: 'HVCG_Communications',
            clientCode: 'SYN01',
            preview: 'Indexed preview only.',
          },
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-only');
    assert.ok(mail);
    assert.equal(mail.relatedMeetings, undefined);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
  });

  it('never attaches Client B meetings to a Client A support item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'communication',
            id: 'mail-syn-1',
            title: 'SYN01 — Can you confirm the next step?',
            href: '/clients/SYN01',
            source: 'HVCG_Communications',
            clientCode: 'SYN01',
            preview: 'Indexed preview only.',
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
            kind: 'communication',
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
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal((mail.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(mail).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.clientSupport.items.some((row) => row.id === 'mail-pdg-support'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.clientSupport).includes('PDG01'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.clientSupport).includes('ACCG01'), false);
    assert.equal(JSON.stringify(result.authorizedSearch.clientSupport).includes('CCB01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
  });

  it('omits relatedMeetings when ClientCode is missing rather than guessing', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'follow up support ticket',
      entitledSearch: async (query) => ({
        query,
        results: [
          {
            kind: 'communication',
            id: 'mail-unscoped',
            title: 'Can you confirm the next support step?',
            href: '/inbox',
            source: 'HVCG_Communications',
            preview: 'Indexed preview only.',
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
            title: 'Internal support standup',
            href: '/meetings',
            source: 'HVCG_Meetings',
            webUrl: MEETING_SOURCE,
            provenance: 'PROPOSED',
          },
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-unscoped');
    assert.ok(mail);
    assert.equal(mail.clientCode, undefined);
    assert.equal(mail.relatedMeetings, undefined);
    assert.equal(JSON.stringify(mail).includes('SYN01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
  });

  it('leaves the empty client-support payload unchanged', async () => {
    const empty = emptyClientSupportPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('relatedMeetings' in empty, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    assert.equal(empty.execute, false);
    assert.equal(empty.send, false);
    assert.equal(empty.autoRespond, false);
    assert.equal(empty.draftOnly, true);
    assert.equal(empty.hubMi, false);

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
    assert.deepEqual(result.authorizedSearch.clientSupport, empty);
    assert.equal(result.authorizedSearch.clientSupport.items.length, 0);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
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
            kind: 'communication',
            id: 'mail-syn-1',
            title: 'SYN01 — Can you confirm the next step?',
            href: '/clients/SYN01',
            source: 'HVCG_Communications',
            clientCode: 'SYN01',
            preview: 'Indexed preview only.',
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
    const blob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(/downloadUrl/i.test(blob), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/attendee/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.clientCode, 'SYN01');
    assert.ok(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'));
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
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
    clientSupport: emptyClientSupportPayload(),
    hits: [],
  } as unknown as AtlasAuthorizedSearch;
}

function assertSupportResearchHonesty(row: ClientSupportAgentRecord): void {
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

describe('ATLAS-CLIENT-SUPPORT-RESEARCH-RELATIONSHIP-001 entitled same-scope inverse', () => {
  it('attaches same-scope researchRelationship on entitled support items and get_client_context', async () => {
    const now = '2026-08-24T18:00:00.000Z';
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      now,
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01SupportHit()],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.clientCode, 'SYN01');
    const research = mail.researchRelationship?.find(
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
    assert.ok((mail.researchRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assertSupportResearchHonesty(mail);
    assert.equal(JSON.stringify(mail.researchRelationship).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);

    const viaIndex = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientCode: 'SYN01',
      now,
      entitledIndexHits: [syn01ClientHit(), syn01SupportHit()],
    });
    const ctxMail = viaIndex.clientContext.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(ctxMail);
    assert.equal(
      ctxMail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.deepEqual(ctxMail.researchRelationship, mail.researchRelationship);
    noInventedFacts(result.authorizedSearch.clientSupport);
  });

  it('honestly omits researchRelationship when no entitled research', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01SupportHit()],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.researchRelationship, undefined);
    assert.equal('researchRelationship' in mail, false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
  });

  it('never attaches Client B research to a Client A support item', async () => {
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          syn01ClientHit(),
          syn01SupportHit(),
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
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      (mail.researchRelationship || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(result.authorizedSearch.clientSupport.items.some((row) => row.id === 'mail-pdg-support'), false);
    const blob = JSON.stringify(result.authorizedSearch.clientSupport);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);

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
    const omitted = attachRelatedContextToClientSupportRecord(
      manny,
      {
        ...syn01SupportRecord(),
        id: 'mail-unscoped',
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

  it('does not attach unscoped lender research to a scoped support item', async () => {
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
          syn01SupportHit(),
        ],
      }),
    });
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.clientCode, 'SYN01');
    assert.equal(mail.researchRelationship, undefined);
    const blob = JSON.stringify(mail);
    assert.equal(/live oak/i.test(blob), false);
    assert.equal(blob.includes('HVCG_Lenders'), false);
    assertSupportResearchHonesty(mail);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [syn01ClientHit(), syn01SupportHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.clientSupport.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.clientSupport.items.some((row) => row.researchRelationship),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.clientSupport);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToClientSupportRecord(
      otherStaff,
      syn01SupportRecord(),
      searchWithResearch([syn01ClientResearchRecord()]),
    );
    assert.equal(denied.researchRelationship, undefined);
    assert.equal('researchRelationship' in denied, false);
  });

  it('leaves the empty client-support payload unchanged', () => {
    const empty = emptyClientSupportPayload();
    assert.deepEqual(empty.items, []);
    assert.equal('researchRelationship' in empty, false);
    assert.equal(empty.policyClass, 'OWNER_ESCALATE');
    assert.equal(empty.execute, false);
    assert.equal(empty.send, false);
    assert.equal(empty.autoRespond, false);
    assert.equal(empty.draftOnly, true);
    assert.equal(empty.hubMi, false);
    const attachedEmpty = attachRelatedContextToClientSupport(
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
            ...syn01SupportHit(),
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
    assert.equal(/hubMi[^"]*["']?\s*:\s*true/i.test(blob), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assert.ok(mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'));
    assertSupportResearchHonesty(mail);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
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
          syn01SupportHit(),
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
    const mail = result.authorizedSearch.clientSupport.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(mail);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(JSON.stringify(mail.relatedMeetings).includes('PDG01'), false);
    assert.equal(JSON.stringify(mail.researchRelationship).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
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
    assert.ok(
      related.classification === 'CONFIRMED' ||
        related.classification === 'LIKELY' ||
        related.classification === 'PROPOSED' ||
        related.classification === 'HONEST_EMPTY',
    );
    assert.ok((mail.relatedDocuments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(mail.relatedMeetings?.some((row) => row.id === 'meet-syn-1'), true);
    assert.equal(
      mail.researchRelationship?.some((row) => row.clientCode === 'SYN01'),
      true,
    );
    assert.equal(
      /downloadUrl|transcript|attendee|previewGetUrl|previewPostUrl/i.test(JSON.stringify(mail.relatedDocuments)),
      false,
    );
    assert.equal(JSON.stringify(mail.relatedDocuments).includes('PDG01'), false);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
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
    assertOwnerEscalate(viaIndex.clientContext.clientSupport);
    noInventedFacts(result.authorizedSearch.clientSupport);
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
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
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
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
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
    assert.equal(result.authorizedSearch.clientSupport.hubMi, false);
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
    assert.equal(empty.draftOnly, true);
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
    assert.equal(mail.draftOnly, true);
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
    assert.equal(result.authorizedSearch.clientSupport.draftOnly, true);
    assertSupportRelatedDocumentsHonesty(mail);
    assertOwnerEscalate(result.authorizedSearch.clientSupport);
  });
});
