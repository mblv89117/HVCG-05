/**
 * ATLAS-REALTIME-DOCUMENTS-001 + ATLAS-REALTIME-DOCUMENTS-SECURE-PREVIEW-001
 * + ATLAS-REALTIME-DOCUMENTS-RELATED-CONTEXT-001
 * + ATLAS-REALTIME-DOCUMENTS-ATTACHMENT-LINK-001
 * + ATLAS-REALTIME-DOCUMENTS-VERSION-001
 * + ATLAS-REALTIME-DOCUMENTS-RELATED-MEETINGS-001
 * Entitled file-index rows become a document operating record on the
 * existing /operator/search.json READ_AUTO path. Short-lived Graph driveItem
 * preview is attached after authorization. Related email / project / contract
 * / capital / already-indexed outlook-mail-attachment / HVCG_Meetings metadata
 * is copied from already-authorized search payloads only. Graph driveItem
 * versions are metadata-only and never include downloadUrl.
 * No second search, preview, versioning, calendar query, or knowledge-graph product.
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
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import {
  authoritativeSourceUrl,
  extractProvenDriveItemRef,
  extractSourceUrl,
  attachmentIndexSummary,
  extractMailAttachmentRef,
  fileIndexSummary,
  isMailAttachmentIndexRow,
} from '../src/pm/sharepoint/fabric/fileIndex.ts';
import {
  DOCUMENT_PREVIEW_BASED_ON,
  isGraphPreviewEmbedUrl,
  mapGraphPreviewResponse,
  requestIndexedDocumentPreview,
} from '../src/pm/sharepoint/fabric/documentPreview.ts';
import {
  DOCUMENT_VERSION_BASED_ON,
  indexedDocumentVersionsPath,
  mapGraphVersionResponse,
  requestIndexedDocumentVersions,
} from '../src/pm/sharepoint/fabric/documentVersion.ts';
import { isAllowedFabricGraphPath } from '../src/pm/sharepoint/fabric/graph.ts';
import { GRAPH_NOTIFICATION_PATH } from '../src/pm/sharepoint/fabric/notifications.ts';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { searchAuthorizedKnowledge } from '../src/pm/operatorDesk/toolGateway.ts';
import { DOCUMENT_RELATED_CONTEXT_PAGE_SIZE } from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type DocumentOperatingRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { buildKnowledgeLedger } from '../src/pm/sharepoint/knowledgeLedger.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { FabricGraphClient } from '../src/pm/sharepoint/fabric/graph.ts';

const SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/intake-memo.pdf';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';
const PROVEN_DRIVE = 'b!YxKEg0R0mkSWM7uE9NymGd3I5nWqakb4';
const PROVEN_ITEM = '01SYN01INTAKEMEMOITEMID0001';
const PREVIEW_GET = 'https://highvaluecapitalgroup.sharepoint.com/_layouts/15/embed.aspx?uniqueId=abc&auth_key=short';
const PREVIEW_POST = 'https://onedrive.live.com/embed';
const CLIENT_STATE = 'atlas-graph-client-state-ok';
const MAIL_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-thread';
const MEETING_SOURCE = 'https://outlook.office.com/calendar/item/syn01-standup';
const SOW_SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/engagement-sow.pdf';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Team Member'],
};

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function fileIndexService(): SearchPmService {
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
              id: 'file-1',
              title: 'SYN01 intake memo',
              summary: `File metadata index. Binary remains in OneDrive/SharePoint. Source: ${SOURCE}`,
              webUrl: SOURCE,
              date: '2026-08-20T18:04:00Z',
              sourceItemId: 'file:item-1',
            },
            {
              id: 'file-sas',
              title: 'SYN01 leaked SAS',
              summary: `File metadata index. Source: ${SAS}`,
              webUrl: SAS,
              date: '2026-08-20T18:05:00Z',
              sourceItemId: 'file:item-sas',
            },
            {
              id: 'mail-1',
              title: 'SYN01 intake thread',
              summary: 'Outlook mail thread',
              date: '2026-08-19T12:00:00Z',
            },
          ],
        },
      };
    },
    async listVendors() {
      return [];
    },
    async listOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
  };
}

describe('authoritative source URL fail-closed', () => {
  it('keeps Graph/SharePoint webUrl and drops SAS / anonymous share', () => {
    assert.equal(authoritativeSourceUrl(SOURCE), SOURCE);
    assert.equal(authoritativeSourceUrl(extractSourceUrl(`File metadata index. Source: ${SOURCE}`)), SOURCE);
    assert.equal(authoritativeSourceUrl(SAS), undefined);
    assert.equal(authoritativeSourceUrl(ANON), undefined);
    assert.equal(authoritativeSourceUrl('http://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/x'), undefined);
    assert.equal(authoritativeSourceUrl('https://evil.example/file.pdf'), undefined);
    assert.equal(authoritativeSourceUrl(''), undefined);
  });
});

describe('entitled file-index document operating record', () => {
  it('searchSharePointPm copies source webUrl + modified time and never invents ClientCodes', async () => {
    const found = await searchSharePointPm(fileIndexService(), staff, 'intake');
    const doc = found.results.find((hit) => hit.id === 'file-1');
    assert.ok(doc);
    assert.equal(doc.kind, 'document');
    assert.equal(doc.clientCode, 'SYN01');
    assert.equal(doc.webUrl, SOURCE);
    assert.equal(doc.modifiedAt, '2026-08-20T18:04:00Z');
    assert.equal(doc.provenance, 'CONFIRMED');
    assert.equal(doc.source, 'HVCG_Communications/file-index');
    const sas = found.results.find((hit) => hit.id === 'file-sas');
    assert.ok(sas);
    assert.equal(sas.webUrl, undefined);
    assert.equal(found.results.some((hit) => hit.clientCode === 'HFD01' || hit.clientCode === 'PDG01'), false);
  });

  it('search_authorized_knowledge READ_AUTO returns documents payload after auth', async () => {
    const found = await searchSharePointPm(fileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const docs = result.authorizedSearch.documents;
    assert.equal(docs.kind, 'document_operating_record_v1');
    assert.equal(docs.policyClass, 'READ_AUTO');
    assert.equal(docs.binariesInAtlas, false);
    assert.equal(docs.items.length, 1);
    assert.equal(docs.items[0]?.id, 'file-1');
    assert.equal(docs.items[0]?.webUrl, SOURCE);
    assert.equal(docs.items[0]?.modifiedAt, '2026-08-20T18:04:00Z');
    assert.equal(docs.items[0]?.clientCode, 'SYN01');
    assert.equal(docs.items[0]?.provenance, 'CONFIRMED');
    assert.equal(
      docs.items.some((row) => /blob\.core\.windows\.net|[?&](?:sv|sig|share)=/i.test(row.webUrl)),
      false,
    );
    const serialized = JSON.stringify(result.authorizedSearch);
    assert.equal(serialized.includes('HFD01'), false);
    assert.equal(serialized.includes('PDG01'), false);
  });

  it('knowledge ledger surfaces bound file-index modifiedAt and drops SAS', async () => {
    const ledger = await buildKnowledgeLedger(
      {
        listAuthorizedClients: async () => [
          {
            id: 'SYN01',
            itemId: '1',
            clientCode: 'SYN01',
            displayName: 'SYNTHETIC Alpha Co',
            source: 'sharepoint',
          },
        ],
        listWorkspaceCollections: async () => ({
          communications: {
            queried: true,
            items: [
              {
                id: 'file-1',
                title: 'SYN01 intake memo',
                webUrl: SOURCE,
                date: '2026-08-20T18:04:00Z',
                summary: 'File metadata index. Binary remains in OneDrive/SharePoint.',
                sourceItemId: 'file:item-1',
              },
              {
                id: 'file-sas',
                title: 'SYN01 leaked SAS',
                webUrl: SAS,
                date: '2026-08-20T18:05:00Z',
                summary: 'File metadata index.',
                sourceItemId: 'file:item-sas',
              },
            ],
          },
        }),
      } as unknown as SharePointPmService,
      staff,
    );
    const live = ledger.items.find((row) => row.id === 'file-1');
    assert.equal(live?.webUrl, SOURCE);
    assert.equal(live?.modifiedAt, '2026-08-20T18:04:00Z');
    assert.equal(live?.provenanceLabel, 'CONFIRMED');
    const dropped = ledger.items.find((row) => row.id === 'file-sas');
    assert.equal(dropped?.webUrl, undefined);
  });

  it('TAP unsigned /operator/search.json is 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-realtime-docs-'));
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
      const unsigned = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=intake`);
      const text = await unsigned.text();
      const tap = unsigned.status === 401 && !/PDG01|HFD01|CCB01|authorizedSearch|operatorDesk/i.test(text);
      assert.equal(unsigned.status, 401, 'not ok 1 - unsigned /operator/search.json 401');
      const body = JSON.parse(text) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(body.error, 'unauthorized');
      assert.equal(body.authorizedSearch, undefined);
      assert.equal(tap, true, 'not ok 2 - unsigned search leaks operating payload');
      console.log('ok 1 - unsigned /operator/search.json 401');
      console.log('ok 2 - unsigned search does not leak documents payload');
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

function previewFabric(
  post: (path: string, body: unknown) => Promise<{ status: number; json: Record<string, unknown> }>,
): FabricGraphClient {
  return {
    async getJson() {
      return { status: 404, json: {} };
    },
    postJson: post,
    async patchJson() {
      return { status: 404, json: {} };
    },
    async deleteJson() {
      return { status: 404, json: {} };
    },
  };
}

function provenFileIndexService(): SearchPmService {
  const summary = fileIndexSummary({
    restricted: false,
    webUrl: SOURCE,
    idempotencyKey: `file:${PROVEN_ITEM}`,
    driveId: PROVEN_DRIVE,
    itemId: PROVEN_ITEM,
  });
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
              id: 'file-proven',
              title: 'SYN01 intake memo',
              summary,
              webUrl: SOURCE,
              date: '2026-08-20T18:04:00Z',
              sourceItemId: `file:${PROVEN_ITEM}`,
            },
          ],
        },
      };
    },
    async listVendors() {
      return [];
    },
    async listOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
  };
}

function assertNoPreviewUrls(item: DocumentOperatingRecord | undefined) {
  assert.equal(item?.previewGetUrl, undefined);
  assert.equal(item?.previewPostUrl, undefined);
  assert.equal(item?.previewExpiresAt, undefined);
}

describe('secure Graph driveItem preview for indexed documents', () => {
  it('allowlists preview POST only for proven drive/item shape and rejects share links', () => {
    assert.equal(
      isAllowedFabricGraphPath(`/v1.0/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/preview`, 'POST'),
      true,
    );
    assert.equal(
      isAllowedFabricGraphPath(`/v1.0/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/createLink`, 'POST'),
      false,
    );
    assert.equal(isAllowedFabricGraphPath(`/v1.0/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/preview`), false);
    assert.equal(isGraphPreviewEmbedUrl(PREVIEW_GET), true);
    assert.equal(isGraphPreviewEmbedUrl(ANON), false);
    assert.equal(isGraphPreviewEmbedUrl(SAS), false);
  });

  it('copies proven drive/item ids from the file index and does not invent them from webUrl', async () => {
    const summary = fileIndexSummary({
      restricted: false,
      webUrl: SOURCE,
      idempotencyKey: `file:${PROVEN_ITEM}`,
      driveId: PROVEN_DRIVE,
      itemId: PROVEN_ITEM,
    });
    assert.match(summary, new RegExp(`Drive:${PROVEN_DRIVE}`));
    assert.match(summary, new RegExp(`Item:${PROVEN_ITEM}`));
    const proven = extractProvenDriveItemRef(summary);
    assert.deepEqual(proven, { driveId: PROVEN_DRIVE, itemId: PROVEN_ITEM });
    assert.equal(extractProvenDriveItemRef(`File metadata index. Source: ${SOURCE} Key:file:item-1`), undefined);
    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake');
    const doc = found.results.find((hit) => hit.id === 'file-proven');
    assert.equal(doc?.driveId, PROVEN_DRIVE);
    assert.equal(doc?.itemId, PROVEN_ITEM);
  });

  it('marks preview ready on Graph 200/201 JSON and never stores binaries', async () => {
    const ready201 = mapGraphPreviewResponse(201, { getUrl: PREVIEW_GET, postUrl: PREVIEW_POST });
    assert.equal(ready201.previewStatus, 'ready');
    assert.equal(ready201.previewGetUrl, PREVIEW_GET);
    assert.equal(ready201.previewPostUrl, PREVIEW_POST);
    assert.ok(ready201.previewExpiresAt);
    assert.equal(ready201.basedOn, DOCUMENT_PREVIEW_BASED_ON);

    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentPreview: (ref) =>
        requestIndexedDocumentPreview(
          previewFabric(async (path) => {
            assert.match(path, new RegExp(`/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/preview$`));
            return { status: 200, json: { getUrl: PREVIEW_GET, postUrl: PREVIEW_POST } };
          }),
          ref,
        ),
    });
    const docs = result.authorizedSearch.documents;
    assert.equal(docs.binariesInAtlas, false);
    assert.equal(docs.items.length, 1);
    assert.equal(docs.items[0]?.previewStatus, 'ready');
    assert.equal(docs.items[0]?.previewGetUrl, PREVIEW_GET);
    assert.equal(docs.items[0]?.previewPostUrl, PREVIEW_POST);
    assert.ok(docs.items[0]?.previewExpiresAt);
    assert.equal(docs.items[0]?.basedOn, DOCUMENT_PREVIEW_BASED_ON);
    assert.equal(docs.items[0]?.previewSkipReason, undefined);
    assert.equal(/\blive\s*[:=]\s*true\b/i.test(JSON.stringify(docs)), false);
  });

  it('honest-skips unsupported Graph preview and does not leak a preview URL', async () => {
    const skipped = mapGraphPreviewResponse(403, {
      error: { code: 'accessDenied', message: 'Application preview is not supported for this item.' },
    });
    assert.equal(skipped.previewStatus, 'skipped');
    assertNoPreviewUrls(skipped);
    assert.match(skipped.previewSkipReason || '', /HTTP 403/);
    assert.equal(/\bLIVE\b/.test(JSON.stringify(skipped)), false);

    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentPreview: (ref) =>
        requestIndexedDocumentPreview(
          previewFabric(async () => ({
            status: 405,
            json: { error: { code: 'notSupported', message: 'Preview is not supported.' } },
          })),
          ref,
        ),
    });
    const item = result.authorizedSearch.documents.items[0];
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal(item?.previewStatus, 'skipped');
    assertNoPreviewUrls(item);
    assert.match(item?.previewSkipReason || '', /HTTP 405/);
    assert.equal(/\bLIVE\b/.test(JSON.stringify(result.authorizedSearch.documents)), false);
    assert.equal(item?.basedOn, DOCUMENT_PREVIEW_BASED_ON);
  });

  it('drops anonymous permanent Graph URLs and skips rows without proven ids', async () => {
    const leaked = mapGraphPreviewResponse(200, { getUrl: ANON, postUrl: SAS });
    assert.equal(leaked.previewStatus, 'skipped');
    assertNoPreviewUrls(leaked);

    const found = await searchSharePointPm(fileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentPreview: async () => {
        throw new Error('must not preview without a proven drive/item id');
      },
    });
    const item = result.authorizedSearch.documents.items[0];
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal(item?.id, 'file-1');
    assert.equal(item?.previewStatus, 'skipped');
    assert.match(item?.previewSkipReason || '', /no proven drive\/item id/);
    assertNoPreviewUrls(item);
  });

  it('never previews Client B documents for a Client A operator', async () => {
    const pdgSource =
      'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/hidden.pdf';
    const called: string[] = [];
    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          {
            kind: 'document',
            id: 'file-pdg',
            title: 'PDG01 hidden packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: pdgSource,
            provenance: 'CONFIRMED',
            driveId: 'b!pdgdriveid000000000000000000001',
            itemId: '01PDG01HIDDENITEMID00000001',
          },
          {
            kind: 'document',
            id: 'file-pdg-sow',
            title: 'PDG01 Secret SOW.pdf',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: pdgSource,
            provenance: 'CONFIRMED',
          },
          {
            kind: 'communication',
            id: 'mail-pdg',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'conv-pdg-1',
            provenance: 'PROPOSED',
          },
          {
            kind: 'project',
            id: 'proj-pdg',
            title: 'PDG01 leak project',
            href: '/clients/PDG01',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
          },
          {
            kind: 'capital_opportunity',
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            href: '/clients/PDG01',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
          },
        ],
      }),
      requestDocumentPreview: async (ref) => {
        called.push(`${ref.driveId}/${ref.itemId}`);
        return mapGraphPreviewResponse(200, { getUrl: PREVIEW_GET });
      },
    });
    assert.equal(called.some((id) => /pdg/i.test(id)), false);
    const foreign = result.authorizedSearch.documents.items.find((row) => row.id === 'file-pdg');
    if (foreign) {
      assert.notEqual(foreign.previewStatus, 'ready');
      assertNoPreviewUrls(foreign);
    }
    const own = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.equal(own?.previewStatus, 'ready');
    assert.equal(own?.previewGetUrl, PREVIEW_GET);
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal((own?.relatedEmail || []).some((row) => row.id === 'mail-pdg'), false);
    assert.equal((own?.relatedProject || []).some((row) => row.id === 'proj-pdg'), false);
    assert.equal((own?.relatedContract || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((own?.capitalRelationship || []).some((row) => row.id === 'cap-pdg'), false);
    assert.equal((own?.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((own?.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(own).includes('PDG01'), false);
    if (foreign) {
      assert.equal(foreign.relatedEmail, undefined);
      assert.equal(foreign.relatedProject, undefined);
      assert.equal(foreign.relatedContract, undefined);
      assert.equal(foreign.capitalRelationship, undefined);
      assert.equal(foreign.relatedMeetings, undefined);
      assert.equal(foreign.relatedAttachments, undefined);
    }
  });

  it('forged POST /api/graph/change-notifications remains 401 clientState mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-docs-preview-notify-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      HOST: process.env.INTEGRATION_HOST,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      TENANT: process.env.MICROSOFT_TENANT_ID,
      PM: process.env.INTEGRATION_PM_BACKEND,
      STATE: process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE,
    };
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_PM_BACKEND = 'development-json';
    process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE = CLIENT_STATE;
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      dataDir: dir,
      verifyAccessToken: async () => {
        const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
        err.status = 401;
        err.code = 'invalid_token';
        throw err;
      },
    };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const syncs: string[] = [];
    const server = createServer((req, res) => {
      handleRequest(
        {
          cfg,
          repo,
          app,
          pm,
          localAi,
          requestFabricSync: async (trigger) => {
            syncs.push(trigger);
            return { accepted: true, queued: false };
          },
        },
        req,
        res,
      ).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
      const forged = await fetch(`http://127.0.0.1:${port}${GRAPH_NOTIFICATION_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          value: [
            {
              subscriptionId: '11111111-1111-4111-8111-111111111111',
              changeType: 'created',
              clientState: 'forged',
            },
          ],
        }),
      });
      assert.equal(forged.status, 401);
      const body = (await forged.json()) as { reason?: string };
      assert.equal(body.reason, 'clientState mismatch');
      assert.equal(syncs.length, 0);
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
      if (prev.STATE === undefined) delete process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE;
      else process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE = prev.STATE;
    }
  });
});

function relatedContextService(): SearchPmService {
  const summary = fileIndexSummary({
    restricted: false,
    webUrl: SOURCE,
    idempotencyKey: `file:${PROVEN_ITEM}`,
    driveId: PROVEN_DRIVE,
    itemId: PROVEN_ITEM,
  });
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
      return [
        {
          id: 'proj-syn-1',
          name: 'SYN01 entitled intake project',
          clientCode: 'SYN01',
          objective: 'Copy existing entitled SYN01 intake work.',
          nextAction: 'Review entitled SYN01 evidence already on the desk.',
          status: 'active',
          updatedAt: '2026-08-20T18:04:00Z',
        },
      ] as never;
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
              id: 'file-proven',
              title: 'SYN01 intake memo',
              summary,
              webUrl: SOURCE,
              date: '2026-08-20T18:04:00Z',
              sourceItemId: `file:${PROVEN_ITEM}`,
            },
            {
              id: 'file-sow',
              title: 'SYN01 Engagement SOW.pdf',
              summary: `File metadata index. Binary remains in OneDrive/SharePoint. Source: ${SOW_SOURCE}`,
              webUrl: SOW_SOURCE,
              date: '2026-08-18T16:00:00Z',
              sourceItemId: 'file:sow-1',
            },
            {
              id: 'mail-syn-1',
              title: 'SYN01 intake follow-up',
              summary:
                'Can you confirm the next entitled document? I will send the existing package after review. Source: ' +
                `${MAIL_SOURCE} Key:mail:conv-syn-1`,
              webUrl: MAIL_SOURCE,
              date: '2026-08-19T12:00:00Z',
              channel: 'Email',
              direction: 'Inbound',
              sourceItemId: 'AAMk-syn-1',
            },
          ],
        },
        meetings: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'meet-syn-1',
              title: 'SYN01 weekly standup',
              summary: `Indexed outlook-calendar meeting. Source: ${MEETING_SOURCE}`,
              webUrl: MEETING_SOURCE,
              date: '2026-08-21T15:00:00Z',
              sourceEventId: 'AAMk-syn-cal-1',
              sourceItemId: 'AAMk-syn-cal-1',
              classification: 'CONFIRMED',
            },
          ],
        },
      };
    },
    async listVendors() {
      return [];
    },
    async listOpportunities() {
      return [];
    },
    async listCapitalOpportunities() {
      return [
        {
          id: 'cap-syn-1',
          title: 'SYN01 entitled capital opportunity',
          clientCode: 'SYN01',
          notes: 'Existing entitled row. Do not invent criteria.',
          projectId: 'proj-syn-1',
        },
        {
          id: 'cap-pdg-leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          notes: 'Invented Live Oak credit box',
        },
      ];
    },
    async listIndexedFiles() {
      return [];
    },
  };
}

function noFabricatedRelatedFacts(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes('HFD01'), false);
  assert.equal(serialized.includes('Hub-MI'), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/credit box/i.test(serialized), false);
  assert.equal(/best[_ ]?fit/i.test(serialized), false);
  assert.equal(/FundingStatus["']?\s*:\s*["'](?:Committed|Closed|Funded)/i.test(serialized), false);
  assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(serialized), false);
}

describe('related operating context on entitled documents', () => {
  it('copies same-ClientCode entitled email, project, contract, and PREPARE capital', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'SYN01');
    assert.equal(found.results.some((row) => row.clientCode === 'PDG01'), false);
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const docs = result.authorizedSearch.documents;
    assert.equal(docs.binariesInAtlas, false);
    const memo = docs.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal(memo.clientCode, 'SYN01');
    assert.equal(memo.modifiedAt, '2026-08-20T18:04:00Z');
    assert.equal(memo.webUrl, SOURCE);

    const email = memo.relatedEmail?.find((row) => row.id === 'mail-syn-1');
    assert.ok(email);
    assert.equal(email.title, 'SYN01 intake follow-up');
    assert.equal(email.conversationId, 'conv-syn-1');
    assert.equal(email.webUrl, MAIL_SOURCE);
    assert.ok(email.classification === 'CONFIRMED' || email.classification === 'LIKELY' || email.classification === 'PROPOSED' || email.classification === 'HONEST_EMPTY');
    assert.ok((memo.relatedEmail?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);

    const project = memo.relatedProject?.find((row) => row.id === 'proj-syn-1');
    assert.ok(project);
    assert.equal(project.clientCode, 'SYN01');
    assert.equal(project.invented, false);
    assert.equal(project.historicalHvs, false);
    assert.ok((memo.relatedProject?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);

    const contract = memo.relatedContract?.find((row) => row.id === 'file-sow');
    assert.ok(contract);
    assert.equal(contract.classification, 'CONFIRMED');
    assert.equal(contract.webUrl, SOW_SOURCE);
    assert.match(contract.title, /SOW/i);
    assert.ok((memo.relatedContract?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);

    const capital = memo.capitalRelationship?.find((row) => row.id === 'cap-syn-1');
    assert.ok(capital);
    assert.equal(capital.clientCode, 'SYN01');
    assert.equal(capital.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(capital.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(capital.financingStatus, 'UNKNOWN');
    assert.equal(capital.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(capital.lenderCriteriaInvented, false);
    assert.equal(capital.invented, false);
    assert.ok((memo.capitalRelationship?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);

    const meeting = memo.relatedMeetings?.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.title, 'SYN01 weekly standup');
    assert.equal(meeting.date, '2026-08-21T15:00:00Z');
    assert.equal(meeting.webUrl, MEETING_SOURCE);
    assert.equal(meeting.sourceEventId, 'AAMk-syn-cal-1');
    assert.ok(
      meeting.classification === 'CONFIRMED' ||
        meeting.classification === 'LIKELY' ||
        meeting.classification === 'PROPOSED' ||
        meeting.classification === 'HONEST_EMPTY',
    );
    assert.ok((memo.relatedMeetings?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(/downloadUrl/i.test(JSON.stringify(memo.relatedMeetings)), false);

    assert.equal(memo.relatedAttachments, undefined);

    noFabricatedRelatedFacts(docs);
    assert.equal(JSON.stringify(docs).includes('PDG01'), false);
    assert.equal(JSON.stringify(docs).includes('HFD01'), false);
  });

  it('never attaches Client B relations to a Client A document', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          {
            kind: 'communication',
            id: 'mail-pdg',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'conv-pdg-1',
            provenance: 'PROPOSED',
          },
          {
            kind: 'project',
            id: 'proj-pdg',
            title: 'PDG01 leak project',
            href: '/clients/PDG01',
            source: 'HVCG_Projects',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
          },
          {
            kind: 'capital_opportunity',
            id: 'cap-pdg',
            title: 'PDG01 leak capital LTV 80 credit box',
            href: '/clients/PDG01',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED',
          },
          {
            kind: 'document',
            id: 'file-pdg-sow',
            title: 'PDG01 Secret SOW.pdf',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_PDG01/sow.pdf',
            provenance: 'CONFIRMED',
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
        ],
      }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal((memo.relatedEmail || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((memo.relatedProject || []).some((row) => /pdg/i.test(row.id)), false);
    assert.equal((memo.relatedContract || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((memo.capitalRelationship || []).some((row) => /pdg/i.test(row.id)), false);
    assert.equal((memo.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((memo.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(memo).includes('PDG01'), false);
    noFabricatedRelatedFacts(memo);
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
  });
});

const ATT_PARENT_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-att-parent';
const ATT_SUMMARY = attachmentIndexSummary({
  webUrl: ATT_PARENT_SOURCE,
  parentMessageId: 'AAMk-syn-parent',
  attachmentId: 'att-syn-1',
  contentType: 'application/pdf',
  size: 1200,
  idempotencyKey: 'mail-att:AAMk-syn-parent:att-syn-1',
});

function attachmentLinkService(): SearchPmService {
  const summary = fileIndexSummary({
    restricted: false,
    webUrl: SOURCE,
    idempotencyKey: `file:${PROVEN_ITEM}`,
    driveId: PROVEN_DRIVE,
    itemId: PROVEN_ITEM,
  });
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
              id: 'file-proven',
              title: 'SYN01 intake memo',
              summary,
              webUrl: SOURCE,
              date: '2026-08-20T18:04:00Z',
              sourceItemId: `file:${PROVEN_ITEM}`,
            },
            {
              id: 'mail-syn-parent',
              title: 'SYN01 intake follow-up',
              summary:
                'Can you confirm the next entitled document? I will send the existing package after review. Source: ' +
                `${ATT_PARENT_SOURCE} Key:mail:AAMk-syn-parent`,
              webUrl: ATT_PARENT_SOURCE,
              date: '2026-08-19T12:00:00Z',
              channel: 'Email',
              direction: 'Inbound',
              sourceItemId: 'AAMk-syn-parent',
              conversationId: 'AAMk-syn-parent',
            },
            {
              id: 'mail-att-syn',
              title: 'SYN01 term-sheet.pdf',
              summary: ATT_SUMMARY,
              webUrl: ATT_PARENT_SOURCE,
              date: '2026-08-19T12:05:00Z',
              channel: 'Other',
              sourceItemId: 'att-syn-1',
            },
          ],
        },
      };
    },
    async listVendors() {
      return [];
    },
    async listOpportunities() {
      return [];
    },
    async listCapitalOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
  };
}

describe('indexed mail-attachment metadata on entitled documents', () => {
  it('extracts parent / attachment refs and never stores binaries', () => {
    assert.equal(isMailAttachmentIndexRow({ summary: ATT_SUMMARY }), true);
    const ref = extractMailAttachmentRef(ATT_SUMMARY);
    assert.deepEqual(ref, {
      parentMessageId: 'AAMk-syn-parent',
      attachmentId: 'att-syn-1',
      contentType: 'application/pdf',
      size: 1200,
      idempotencyKey: 'mail-att:AAMk-syn-parent:att-syn-1',
    });
    assert.match(ATT_SUMMARY, /Binary not stored/);
    assert.equal(/guestaccess|[?&](?:sv|sig|share)=/i.test(ATT_SUMMARY), false);
  });

  it('copies same-ClientCode parent email and attachment metadata after authorization', async () => {
    const found = await searchSharePointPm(attachmentLinkService(), staff, 'SYN01');
    const attHit = found.results.find((row) => row.id === 'mail-att-syn');
    assert.ok(attHit);
    assert.equal(attHit.kind, 'document');
    assert.equal(attHit.parentMessageId, 'AAMk-syn-parent');
    assert.equal(attHit.attachmentId, 'att-syn-1');
    assert.equal(attHit.contentType, 'application/pdf');
    assert.equal(attHit.size, 1200);
    assert.equal(attHit.webUrl, ATT_PARENT_SOURCE);
    assert.equal(attHit.driveId, undefined);
    assert.equal(attHit.itemId, undefined);

    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const docs = result.authorizedSearch.documents;
    assert.equal(docs.binariesInAtlas, false);
    const memo = docs.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal(memo.clientCode, 'SYN01');
    const attachment = memo.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(attachment);
    assert.equal(attachment.parentMessageId, 'AAMk-syn-parent');
    assert.equal(attachment.attachmentId, 'att-syn-1');
    assert.equal(attachment.contentType, 'application/pdf');
    assert.equal(attachment.size, 1200);
    assert.equal(attachment.binariesInAtlas, false);
    assert.equal(attachment.webUrl, ATT_PARENT_SOURCE);
    assert.ok((memo.relatedAttachments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);

    const email = memo.relatedEmail?.find((row) => row.id === 'mail-syn-parent' || row.conversationId === 'AAMk-syn-parent');
    assert.ok(email);
    assert.equal(email.webUrl, ATT_PARENT_SOURCE);

    const attDoc = docs.items.find((row) => row.id === 'mail-att-syn');
    assert.ok(attDoc);
    assert.equal(attDoc.parentMessageId, 'AAMk-syn-parent');
    assert.equal(attDoc.attachmentId, 'att-syn-1');
    assert.equal(attDoc.previewGetUrl, undefined);
    assert.equal(attDoc.previewPostUrl, undefined);
    const parentEmail = attDoc.relatedEmail?.find(
      (row) => row.parentMessageId === 'AAMk-syn-parent' || row.conversationId === 'AAMk-syn-parent' || row.id === 'mail-syn-parent',
    );
    assert.ok(parentEmail);
    noFabricatedRelatedFacts(docs);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(JSON.stringify(docs)), false);
    assert.equal(/LIVE/i.test(JSON.stringify(docs)), false);
  });

  it('never attaches Client B attachment metadata to a Client A document', async () => {
    const found = await searchSharePointPm(attachmentLinkService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          {
            kind: 'document',
            id: 'mail-att-pdg',
            title: 'PDG01 leak.pdf',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: 'https://outlook.office.com/mail/pdg-leak',
            provenance: 'CONFIRMED',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
            contentType: 'application/pdf',
            size: 88,
          },
          {
            kind: 'communication',
            id: 'mail-pdg-parent',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'AAMk-pdg-parent',
            provenance: 'PROPOSED',
          },
        ],
      }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal((memo.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((memo.relatedEmail || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal((memo.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(memo).includes('PDG01'), false);
    assert.equal(JSON.stringify(memo).includes('att-pdg-1'), false);
    noFabricatedRelatedFacts(memo);
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
  });
});

describe('related meetings on entitled documents', () => {
  it('copies same-ClientCode entitled meeting hit / index row', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'SYN01');
    const meetingHit = found.results.find((row) => row.id === 'meet-syn-1');
    assert.ok(meetingHit);
    assert.equal(meetingHit.kind, 'meeting');
    assert.equal(meetingHit.clientCode, 'SYN01');
    assert.equal(meetingHit.source, 'HVCG_Meetings');
    assert.equal(meetingHit.webUrl, MEETING_SOURCE);
    assert.equal(meetingHit.sourceEventId, 'AAMk-syn-cal-1');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    const meeting = memo.relatedMeetings?.find((row) => row.id === 'meet-syn-1');
    assert.ok(meeting);
    assert.equal(meeting.clientCode, 'SYN01');
    assert.equal(meeting.webUrl, MEETING_SOURCE);
    assert.equal(meeting.date, '2026-08-21T15:00:00Z');
    assert.equal(meeting.sourceEventId, 'AAMk-syn-cal-1');
    assert.ok((memo.relatedMeetings?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(/downloadUrl/i.test(JSON.stringify(memo.relatedMeetings)), false);
    assert.equal(memo.relatedEmail?.some((row) => row.id === 'mail-syn-1'), true);
    noFabricatedRelatedFacts(memo);
  });

  it('never attaches a Client B meeting to a Client A document', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
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
        ],
      }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal(memo.relatedMeetings, undefined);
    assert.equal((memo.relatedMeetings || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)), false);
    assert.equal(JSON.stringify(memo).includes('PDG01'), false);
    assert.equal(JSON.stringify(memo).includes('AAMk-pdg-cal-1'), false);
    noFabricatedRelatedFacts(memo);
  });

  it('drops SAS and anonymous meeting URLs', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          {
            kind: 'meeting',
            id: 'meet-sas',
            title: 'SYN01 SAS meeting',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: SAS,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-sas',
          },
          {
            kind: 'meeting',
            id: 'meet-anon',
            title: 'SYN01 anonymous meeting',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: ANON,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-anon',
          },
          {
            kind: 'meeting',
            id: 'meet-ok',
            title: 'SYN01 office meeting',
            href: '/clients/SYN01',
            source: 'HVCG_Meetings',
            clientCode: 'SYN01',
            webUrl: MEETING_SOURCE,
            provenance: 'CONFIRMED',
            sourceEventId: 'AAMk-syn-ok',
          },
        ],
      }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    const sasMeeting = memo.relatedMeetings?.find((row) => row.id === 'meet-sas');
    const anonMeeting = memo.relatedMeetings?.find((row) => row.id === 'meet-anon');
    const okMeeting = memo.relatedMeetings?.find((row) => row.id === 'meet-ok');
    assert.ok(sasMeeting);
    assert.ok(anonMeeting);
    assert.ok(okMeeting);
    assert.equal(sasMeeting.webUrl, undefined);
    assert.equal(anonMeeting.webUrl, undefined);
    assert.equal(okMeeting.webUrl, MEETING_SOURCE);
    const blob = JSON.stringify(memo.relatedMeetings);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
    assert.equal(/downloadUrl/i.test(blob), false);
    noFabricatedRelatedFacts(memo);
  });

  it('attaches no meeting when none are entitled', async () => {
    const found = await searchSharePointPm(relatedContextService(), staff, 'intake memo');
    assert.equal(found.results.some((row) => row.kind === 'meeting'), false);
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const memo = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.ok(memo);
    assert.equal(memo.relatedMeetings, undefined);
    assert.equal(memo.relatedEmail?.some((row) => row.id === 'mail-syn-1'), true);
    noFabricatedRelatedFacts(memo);
  });
});

function versionFabric(
  get: (path: string) => Promise<{ status: number; json: Record<string, unknown> }>,
): FabricGraphClient {
  return {
    getJson: get,
    async postJson() {
      return { status: 404, json: {} };
    },
    async patchJson() {
      return { status: 404, json: {} };
    },
    async deleteJson() {
      return { status: 404, json: {} };
    },
  };
}

function assertNoVersionDownloads(item: DocumentOperatingRecord | undefined) {
  const blob = JSON.stringify(item || {});
  assert.equal(/downloadUrl|contentBytes|\$value/i.test(blob), false);
  assert.equal(item?.versionStatus === 'ready' ? Boolean(item.currentVersionId) : true, true);
}

describe('Graph driveItem version context for indexed documents', () => {
  it('allowlists versions GET only for proven drive/item shape and rejects content', () => {
    const path = `/v1.0/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/versions`;
    assert.equal(isAllowedFabricGraphPath(path), true);
    assert.equal(isAllowedFabricGraphPath(`${path}?$select=id,lastModifiedDateTime,size&$top=5`), true);
    assert.equal(isAllowedFabricGraphPath(`${path}/1.0/content`), false);
    assert.equal(isAllowedFabricGraphPath(`${path}/$value`), false);
    const built = indexedDocumentVersionsPath({ driveId: PROVEN_DRIVE, itemId: PROVEN_ITEM });
    assert.match(built || '', /\/versions\?/);
    assert.equal(indexedDocumentVersionsPath({ driveId: 'not a id', itemId: PROVEN_ITEM }), undefined);
  });

  it('marks versions ready on Graph 200 metadata and never stores binaries', async () => {
    const mapped = mapGraphVersionResponse(200, {
      value: [
        {
          id: '2.0',
          lastModifiedDateTime: '2026-08-20T18:04:00Z',
          size: 2048,
          '@microsoft.graph.downloadUrl': 'https://evil.example/v2',
        },
        { id: '1.0', lastModifiedDateTime: '2026-08-01T12:00:00Z', size: 1024 },
      ],
    });
    assert.equal(mapped.versionStatus, 'ready');
    assert.equal(mapped.currentVersionId, '2.0');
    assert.equal(mapped.versionCount, 2);
    assert.equal(mapped.versions?.[0]?.id, '2.0');
    assert.equal(mapped.versions?.[0]?.size, 2048);
    assert.equal(mapped.versionBasedOn, DOCUMENT_VERSION_BASED_ON);
    assert.equal(/downloadUrl/i.test(JSON.stringify(mapped)), false);

    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentVersions: (ref) =>
        requestIndexedDocumentVersions(
          versionFabric(async (path) => {
            assert.match(path, new RegExp(`/drives/${PROVEN_DRIVE}/items/${PROVEN_ITEM}/versions`));
            return {
              status: 200,
              json: {
                value: [
                  { id: '2.0', lastModifiedDateTime: '2026-08-20T18:04:00Z', size: 2048 },
                  { id: '1.0', lastModifiedDateTime: '2026-08-01T12:00:00Z', size: 1024 },
                ],
              },
            };
          }),
          ref,
        ),
    });
    const item = result.authorizedSearch.documents.items[0];
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal(item?.versionStatus, 'ready');
    assert.equal(item?.currentVersionId, '2.0');
    assert.equal(item?.versionCount, 2);
    assert.equal(item?.versions?.[0]?.id, '2.0');
    assert.equal(item?.versionBasedOn, DOCUMENT_VERSION_BASED_ON);
    assertNoVersionDownloads(item);
    assert.equal(/\blive\s*[:=]\s*true\b/i.test(JSON.stringify(result.authorizedSearch.documents)), false);
  });

  it('honest-skips unsupported Graph versions and does not invent a version id', async () => {
    const skipped = mapGraphVersionResponse(403, {
      error: { code: 'accessDenied', message: 'Versions are not supported for this item.' },
    });
    assert.equal(skipped.versionStatus, 'skipped');
    assert.equal(skipped.currentVersionId, undefined);
    assert.match(skipped.versionSkipReason || '', /HTTP 403/);
    assert.equal(/\bLIVE\b/.test(JSON.stringify(skipped)), false);

    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentVersions: (ref) =>
        requestIndexedDocumentVersions(
          versionFabric(async () => ({
            status: 405,
            json: { error: { code: 'notSupported', message: 'Versions are not supported.' } },
          })),
          ref,
        ),
    });
    const item = result.authorizedSearch.documents.items[0];
    assert.equal(item?.versionStatus, 'skipped');
    assert.equal(item?.currentVersionId, undefined);
    assert.equal(item?.versions, undefined);
    assert.match(item?.versionSkipReason || '', /HTTP 405/);
    assert.equal(item?.versionBasedOn, DOCUMENT_VERSION_BASED_ON);
    assertNoVersionDownloads(item);
  });

  it('skips mail attachments and rows without proven drive/item ids', async () => {
    const found = await searchSharePointPm(fileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({ query, results: found.results }),
      requestDocumentVersions: async () => {
        throw new Error('must not request versions without a proven drive/item id');
      },
    });
    const item = result.authorizedSearch.documents.items[0];
    assert.equal(item?.versionStatus, 'skipped');
    assert.match(item?.versionSkipReason || '', /no proven drive\/item id/);
    assert.equal(item?.currentVersionId, undefined);
    assertNoVersionDownloads(item);
  });

  it('never versions Client B documents for a Client A operator', async () => {
    const called: string[] = [];
    const found = await searchSharePointPm(provenFileIndexService(), staff, 'intake memo');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'intake memo',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          {
            kind: 'document',
            id: 'file-pdg-ver',
            title: 'PDG01 hidden packet',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: SOURCE,
            provenance: 'CONFIRMED',
            driveId: 'b!pdgdriveid000000000000000000001',
            itemId: '01PDG01HIDDENITEMID00000001',
          },
        ],
      }),
      requestDocumentVersions: async (ref) => {
        called.push(`${ref.driveId}/${ref.itemId}`);
        return mapGraphVersionResponse(200, {
          value: [{ id: '9.0', lastModifiedDateTime: '2026-08-20T18:04:00Z' }],
        });
      },
    });
    assert.equal(called.some((id) => /pdg/i.test(id)), false);
    const foreign = result.authorizedSearch.documents.items.find((row) => row.id === 'file-pdg-ver');
    if (foreign) {
      assert.notEqual(foreign.versionStatus, 'ready');
      assert.equal(foreign.currentVersionId, undefined);
    }
    const own = result.authorizedSearch.documents.items.find((row) => row.id === 'file-proven');
    assert.equal(own?.versionStatus, 'ready');
    assert.equal(own?.currentVersionId, '9.0');
    assertNoVersionDownloads(own);
  });
});
