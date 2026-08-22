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
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import {
  createGraphClientDocumentStore,
  createMemoryClientDocumentStore,
  SHAREPOINT_DOCUMENT_PROVENANCE,
} from '../src/clientExperience/sharePointDocuments.ts';
import type { CapitalGraphTransport, GraphListItem } from '../src/capital/sharepoint/graph.ts';

const SYN_A = 'SYNQA01';
const SYN_B = 'SYNQB02';
const CERT_NAME = 'HVCG_CLIENT_DOCUMENT_PERSISTENCE_CERTIFICATION.txt';
const CERT_TEXT = [
  'HVCG_CLIENT_DOCUMENT_PERSISTENCE_CERTIFICATION',
  'Harmless non-sensitive certification artifact.',
  'No secrets. No client data.',
].join('\n');

function fakeGraph(): CapitalGraphTransport & { items: Map<string, GraphListItem> } {
  const items = new Map<string, GraphListItem>();
  let seq = 1;
  return {
    items,
    async listItems() {
      return { items: [...items.values()] };
    },
    async getItem(_listId, itemId) {
      return items.get(itemId) || null;
    },
    async createItem(_listId, fields) {
      const id = String(seq++);
      const item: GraphListItem = { id, etag: `"${id}"`, fields: { ...fields } };
      items.set(id, item);
      return item;
    },
    async patchItemFields(_listId, itemId, fields, _etag) {
      const current = items.get(itemId);
      if (!current) throw new Error('missing');
      current.fields = { ...current.fields, ...fields };
      return current;
    },
  };
}

async function withPersistHub(
  fn: (ctx: { base: string }) => Promise<void>,
  store = createMemoryClientDocumentStore(),
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-doc-persist-'));
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
    clientDocumentStore: store,
    verifyAccessToken: async (token: string) => {
      if (token === 'manny') {
        return {
          oid: MANNY_ENTRA_OID,
          preferred_username: 'manny@hvcg.example',
          roles: ['HVCG Owner'],
          scp: 'access_as_user',
        };
      }
      if (token === 'client-a') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'owner-a@synqa.example',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      if (token === 'client-b') {
        return {
          oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          preferred_username: 'owner-b@synqb.example',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      if (token === 'staff') {
        return {
          oid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          preferred_username: 'staff@hvcg.example',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
    resolveAllowedClientIds: async () => [],
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
    await fn({ base: `http://127.0.0.1:${port}` });
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
}

function auth(token: string) {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function stageAndBind(base: string, clientCode: string, token: string, email: string) {
  const staged = await fetch(`${base}/api/pm/clients/${clientCode}/experience`, {
    method: 'POST',
    headers: auth('manny'),
    body: JSON.stringify({
      displayName: `Synthetic ${clientCode}`,
      invitationEmail: email,
      activationGate: 'authorized',
    }),
  });
  assert.equal(staged.status, 201);
  const issued = (await staged.json()) as { inviteToken: string };
  const redeem = await fetch(`${base}/api/client/invitations/redeem`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ token: issued.inviteToken }),
  });
  assert.equal(redeem.status, 200);
  return token;
}

describe('real SharePoint client document persistence', () => {
  it('writes a harmless certification artifact, retrieves matching content, and deny foreign clients', async () => {
    await withPersistHub(async ({ base }) => {
      await stageAndBind(base, SYN_A, 'client-a', 'owner-a@synqa.example');
      await stageAndBind(base, SYN_B, 'client-b', 'owner-b@synqb.example');

      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      const healthBody = (await health.json()) as {
        clientDocumentPersistence: { mode: string; classification: string; configured: boolean };
      };
      assert.equal(healthBody.clientDocumentPersistence.mode, 'sharepoint-list');
      assert.equal(healthBody.clientDocumentPersistence.classification, SHAREPOINT_DOCUMENT_PROVENANCE);
      assert.equal(healthBody.clientDocumentPersistence.configured, true);

      const uploaded = await fetch(`${base}/api/client/documents`, {
        method: 'POST',
        headers: auth('client-a'),
        body: JSON.stringify({
          title: CERT_NAME,
          fileName: CERT_NAME,
          contentType: 'text/plain',
          contentB64: Buffer.from(CERT_TEXT, 'utf8').toString('base64'),
        }),
      });
      assert.equal(uploaded.status, 201);
      const uploadedBody = (await uploaded.json()) as {
        persistenceClass: string;
        binariesInSharePoint: boolean;
        document: {
          id: string;
          clientCode: string;
          contentB64?: string;
          contentSha256: string;
          sharePointItemId?: string;
          provenance: string;
        };
      };
      assert.equal(uploadedBody.persistenceClass, SHAREPOINT_DOCUMENT_PROVENANCE);
      assert.equal(uploadedBody.binariesInSharePoint, true);
      assert.equal(uploadedBody.document.clientCode, SYN_A);
      assert.equal(uploadedBody.document.contentB64, undefined);
      assert.ok(uploadedBody.document.sharePointItemId);
      assert.equal(uploadedBody.document.provenance, SHAREPOINT_DOCUMENT_PROVENANCE);

      const retrieved = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
        headers: auth('client-a'),
      });
      assert.equal(retrieved.status, 200);
      const retrievedBody = (await retrieved.json()) as {
        persistenceClass: string;
        document: { contentB64: string; contentSha256: string; clientCode: string };
      };
      assert.equal(retrievedBody.persistenceClass, SHAREPOINT_DOCUMENT_PROVENANCE);
      assert.equal(retrievedBody.document.clientCode, SYN_A);
      assert.equal(Buffer.from(retrievedBody.document.contentB64, 'base64').toString('utf8'), CERT_TEXT);
      assert.equal(retrievedBody.document.contentSha256, uploadedBody.document.contentSha256);

      const stolen = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
        headers: auth('client-b'),
      });
      assert.equal(stolen.status, 403);

      const staff = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`, {
        headers: auth('staff'),
      });
      assert.equal(staff.status, 403);

      const unsigned = await fetch(`${base}/api/client/documents/${uploadedBody.document.id}`);
      assert.equal(unsigned.status, 401);
    });
  });

  it('Graph backing store keeps ClientCode ownership and fail-closes foreign reads', async () => {
    const graph = fakeGraph();
    const store = createGraphClientDocumentStore({
      graph,
      listId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    });
    const put = await store.put({
      clientCode: SYN_A,
      documentId: 'doc_cert1',
      fileName: CERT_NAME,
      contentType: 'text/plain',
      bytes: Buffer.from(CERT_TEXT, 'utf8'),
    });
    assert.equal(put.clientCode, SYN_A);
    assert.equal(put.persistenceClass, SHAREPOINT_DOCUMENT_PROVENANCE);
    const got = await store.get({ clientCode: SYN_A, itemId: put.itemId });
    assert.equal(Buffer.from(got.contentB64, 'base64').toString('utf8'), CERT_TEXT);
    await assert.rejects(() => store.get({ clientCode: SYN_B, itemId: put.itemId }), (err: { status?: number }) => {
      assert.equal(err.status, 403);
      return true;
    });
    const created = graph.items.get(put.itemId);
    assert.equal(created?.fields.ClientCode, SYN_A);
    assert.equal(String(created?.fields.TemplateItemKey || '').startsWith('cx-doc|'), true);
  });
});
