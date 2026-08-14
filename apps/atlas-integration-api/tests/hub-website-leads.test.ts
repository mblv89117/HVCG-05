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
import { createSharePointPmService } from '../src/pm/backend.ts';
import type { GraphListItem, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { GRAPH_TOKEN_RESOURCE } from '../src/pm/sharepoint/token.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { resolveWebsiteLeadIdempotencyKey } from '../src/website/leads.ts';
import { verifyWebsiteIntakeKey, websiteIntakeKeyConfigured } from '../src/website/intakeAuth.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const LEADS = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const INTAKE_KEY = 'website-intake-test-key-32chars!!';

class MemoryGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  readonly urls: string[] = [];
  nextId = 1;
  etagN = 1;

  constructor() {
    this.lists.set(PROJECTS, []);
    this.lists.set(TASKS, []);
    this.lists.set(MILESTONES, []);
    this.lists.set(CLIENTS, []);
    this.lists.set(LEADS, []);
  }

  async listItems(listId: string, opts?: { filter?: string }) {
    this.urls.push(`list:${listId}:${opts?.filter || ''}`);
    return { items: [...(this.lists.get(listId) || [])] };
  }

  async getItem(listId: string, itemId: string) {
    return (this.lists.get(listId) || []).find((i) => i.id === itemId) || null;
  }

  async createItem(listId: string, fields: Record<string, unknown>) {
    const item: GraphListItem = {
      id: String(this.nextId++),
      etag: `"etag-${this.etagN++}"`,
      fields: { ...fields },
    };
    const arr = this.lists.get(listId) || [];
    arr.push(item);
    this.lists.set(listId, arr);
    return item;
  }

  async patchItemFields(listId: string, itemId: string, fields: Record<string, unknown>, etag: string) {
    const arr = this.lists.get(listId) || [];
    const item = arr.find((i) => i.id === itemId);
    if (!item) throw new Error('not_found');
    if (etag !== item.etag) throw new Error('etag');
    item.fields = { ...item.fields, ...fields };
    item.etag = `"etag-${this.etagN++}"`;
    return item;
  }
}

async function withHub(
  opts: { key?: string; leads?: boolean; graph?: MemoryGraph },
  fn: (ctx: { base: string; graph: MemoryGraph }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-web-leads-'));
  const graph = opts.graph || new MemoryGraph();
  const prev = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_PM_BACKEND = 'sharepoint';
  process.env.INTEGRATION_PM_SHAREPOINT_SITE_ID = SITE;
  process.env.INTEGRATION_PM_PROJECTS_LIST_ID = PROJECTS;
  process.env.INTEGRATION_PM_TASKS_LIST_ID = TASKS;
  process.env.INTEGRATION_PM_MILESTONES_LIST_ID = MILESTONES;
  process.env.INTEGRATION_PM_CLIENTS_LIST_ID = CLIENTS;
  process.env.AZURE_CLIENT_ID = MI;
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (opts.leads === false) delete process.env.INTEGRATION_PM_LEADS_LIST_ID;
  else process.env.INTEGRATION_PM_LEADS_LIST_ID = LEADS;
  if (opts.key === '') delete process.env.INTEGRATION_WEBSITE_INTAKE_KEY;
  else process.env.INTEGRATION_WEBSITE_INTAKE_KEY = opts.key ?? INTAKE_KEY;

  const cfg: AppConfig = {
    ...loadConfig(),
    pmGraphTransport: graph,
  };
  const sharepoint = createSharePointPmService(cfg);
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm: null, sharepoint, localAi }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn({ base: `http://127.0.0.1:${port}`, graph });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  }
}

const sample = {
  type: 'hvcg_website_lead',
  leadId: 'lead-1',
  correlationId: 'corr-1',
  submissionType: 'Website-Contact',
  source: 'Website-Contact',
  submittedAt: '2026-08-14T20:00:00Z',
  contact: { name: 'Ada Contact', email: 'ada@example.com', phone: '7025550100', company: 'Ada Co' },
  consent: { hvcgProspect: true, disclaimerAccepted: true },
};

describe('website intake key', () => {
  it('rejects empty, short, and mismatched keys without accepting Bearer as a substitute', () => {
    assert.equal(websiteIntakeKeyConfigured(''), false);
    assert.equal(websiteIntakeKeyConfigured('short'), false);
    assert.equal(verifyWebsiteIntakeKey(INTAKE_KEY, INTAKE_KEY), true);
    assert.equal(verifyWebsiteIntakeKey('wrong-key-that-is-long-enough', INTAKE_KEY), false);
    assert.equal(verifyWebsiteIntakeKey(undefined, INTAKE_KEY), false);
  });
});

describe('website lead idempotency', () => {
  it('prefers fullPayload.idempotencyKey then eva|session then website|leadId', () => {
    assert.equal(
      resolveWebsiteLeadIdempotencyKey({
        submissionType: 'Website-EVA',
        leadId: 'x',
        fullPayload: { idempotencyKey: 'eva|sess-1', sessionId: 'sess-1' },
      }),
      'eva|sess-1',
    );
    assert.equal(
      resolveWebsiteLeadIdempotencyKey({
        submissionType: 'Website-EVA',
        correlationId: 'sess-2',
        fullPayload: { sessionId: 'sess-2' },
      }),
      'eva|sess-2',
    );
    assert.equal(resolveWebsiteLeadIdempotencyKey({ leadId: 'abc' }), 'website|abc');
  });
});

describe('POST /api/website/leads', () => {
  it('is 503 when the intake key is not configured (not a fake 200)', async () => {
    await withHub({ key: '' }, async ({ base }) => {
      const res = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sample),
      });
      assert.equal(res.status, 503);
    });
  });

  it('is 401 without the intake key and Bearer does not grant ingest', async () => {
    await withHub({}, async ({ base, graph }) => {
      const missing = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sample),
      });
      assert.equal(missing.status, 401);
      const bearer = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer valid-member' },
        body: JSON.stringify(sample),
      });
      assert.equal(bearer.status, 401);
      const wrong = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-website-intake-key': 'not-the-intake-key-value' },
        body: JSON.stringify(sample),
      });
      assert.equal(wrong.status, 401);
      assert.equal(graph.lists.get(LEADS)?.length || 0, 0);
      const pm = await fetch(`${base}/api/pm/projects`);
      assert.equal(pm.status, 401);
    });
  });

  it('upserts HVCG_Leads by idempotency key and does not duplicate', async () => {
    await withHub({}, async ({ base, graph }) => {
      const headers = {
        'content-type': 'application/json',
        'x-website-intake-key': INTAKE_KEY,
      };
      const created = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sample),
      });
      assert.equal(created.status, 201);
      const createdBody = (await created.json()) as { created: boolean; itemId: string; list: string };
      assert.equal(createdBody.created, true);
      assert.equal(createdBody.list, 'HVCG_Leads');
      const rows = graph.lists.get(LEADS) || [];
      assert.equal(rows.length, 1);
      assert.equal(rows[0].fields.Title, 'Ada Co');
      assert.equal(rows[0].fields.Email, 'ada@example.com');
      assert.equal(rows[0].fields.Source, 'Website-Contact');
      assert.equal(rows[0].fields.LeadStatus, 'New');
      assert.equal(rows[0].fields.HVCG_IdempotencyKey, 'website|lead-1');
      assert.equal(rows[0].fields.ServiceInterest, 'Other');

      const again = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...sample,
          contact: { ...sample.contact, phone: '7025550199' },
        }),
      });
      assert.equal(again.status, 200);
      const againBody = (await again.json()) as { created: boolean; itemId: string };
      assert.equal(againBody.created, false);
      assert.equal(againBody.itemId, createdBody.itemId);
      assert.equal((graph.lists.get(LEADS) || []).length, 1);
      assert.equal(graph.lists.get(LEADS)?.[0].fields.Phone, '7025550199');
      assert.equal(
        graph.urls.some((u) => u.includes('fields/')),
        false,
      );
    });
  });

  it('maps EVA session idempotency and does not mix Graph with BA audience', async () => {
    await withHub({}, async ({ base, graph }) => {
      const res = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-website-intake-key': INTAKE_KEY,
        },
        body: JSON.stringify({
          type: 'hvcg_website_lead',
          leadId: 'eva-1',
          correlationId: 'sess-9',
          submissionType: 'Website-EVA',
          source: 'Website-EVA',
          contact: { name: 'Eva User', email: 'eva@example.com', company: 'Eva Co' },
          fullPayload: {
            sessionId: 'sess-9',
            eva: { band: 'B', composite_score_proxy: 70, recommended_sku: 'SKU-FRA' },
          },
        }),
      });
      assert.equal(res.status, 201);
      const row = (graph.lists.get(LEADS) || [])[0];
      assert.equal(row.fields.HVCG_IdempotencyKey, 'eva|sess-9');
      assert.equal(row.fields.Source, 'Website-EVA');
      assert.equal(row.fields.ServiceInterest, 'Fractional CFO');
      assert.equal(row.fields.LeadScore, 70);
      assert.equal(GRAPH_TOKEN_RESOURCE, 'https://graph.microsoft.com');
      assert.equal(GRAPH_TOKEN_RESOURCE.startsWith('api://'), false);
    });
  });

  it('does not reset a Qualified lead to New on replay', async () => {
    const graph = new MemoryGraph();
    graph.lists.set(LEADS, [
      {
        id: '9',
        etag: '"etag-1"',
        fields: {
          Title: 'Ada Co',
          Email: 'ada@example.com',
          HVCG_IdempotencyKey: 'website|lead-1',
          LeadStatus: 'Qualified',
        },
      },
    ]);
    await withHub({ graph }, async ({ base }) => {
      const res = await fetch(`${base}/api/website/leads`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-website-intake-key': INTAKE_KEY,
        },
        body: JSON.stringify(sample),
      });
      assert.equal(res.status, 200);
      assert.equal(graph.lists.get(LEADS)?.[0].fields.LeadStatus, 'Qualified');
    });
  });
});
