/**
 * ATLAS-REALTIME-DOCUMENTS-001
 * Entitled file-index rows become a document operating record on the
 * existing /operator/search.json READ_AUTO path. No second search product.
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
import { authoritativeSourceUrl, extractSourceUrl } from '../src/pm/sharepoint/fabric/fileIndex.ts';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { searchAuthorizedKnowledge } from '../src/pm/operatorDesk/toolGateway.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import type { AtlasAuthorizedSearch } from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { buildKnowledgeLedger } from '../src/pm/sharepoint/knowledgeLedger.ts';
import type { SharePointPmService } from '../src/pm/sharepoint/repository.ts';

const SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/intake-memo.pdf';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

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
