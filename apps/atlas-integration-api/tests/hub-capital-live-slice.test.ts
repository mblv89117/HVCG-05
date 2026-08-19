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
import { createSharePointCapitalService } from '../src/capital/backend.ts';
import { GraphCapitalStore, isSyntheticCapitalRecord } from '../src/capital/sharepoint/repository.ts';
import type { CapitalGraphTransport, GraphListItem, GraphListPage } from '../src/capital/sharepoint/graph.ts';
import { CapitalHttpError } from '../src/capital/errors.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const OPPORTUNITIES = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const DOCUMENT_REQUESTS = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const LENDER_OUTREACH = '33333333-cccc-4ccc-8ccc-ccccccccccc1';
const LENDERS = '44444444-dddd-4ddd-8ddd-ddddddddddd1';
const CLIENTS = '55555555-eeee-4eee-8eee-eeeeeeeeeee1';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

class MemoryGraph implements CapitalGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  nextId = 1;
  etagN = 1;

  constructor() {
    this.lists.set(OPPORTUNITIES, []);
    this.lists.set(DOCUMENT_REQUESTS, []);
    this.lists.set(LENDER_OUTREACH, []);
    this.lists.set(LENDERS, []);
    this.lists.set(CLIENTS, []);
  }

  seed(listId: string, fields: Record<string, unknown>, id?: string): GraphListItem {
    const item: GraphListItem = {
      id: id || String(this.nextId++),
      etag: `"etag-${this.etagN++}"`,
      fields: { ...fields },
    };
    const arr = this.lists.get(listId) || [];
    arr.push(item);
    this.lists.set(listId, arr);
    return item;
  }

  async listItems(listId: string): Promise<GraphListPage> {
    return { items: this.lists.get(listId) || [] };
  }

  async getItem(listId: string, itemId: string): Promise<GraphListItem | null> {
    return (this.lists.get(listId) || []).find((i) => i.id === itemId) || null;
  }

  async createItem(listId: string, fields: Record<string, unknown>): Promise<GraphListItem> {
    return this.seed(listId, fields);
  }

  async patchItemFields(
    listId: string,
    itemId: string,
    fields: Record<string, unknown>,
    etag: string,
  ): Promise<GraphListItem> {
    const item = (this.lists.get(listId) || []).find((i) => i.id === itemId);
    if (!item) {
      throw new CapitalHttpError(404, 'not_found', 'not_found');
    }
    if (etag !== item.etag) {
      throw new CapitalHttpError(412, 'CAPITAL_ETAG_CONFLICT', 'The SharePoint item was updated by another request.');
    }
    item.fields = { ...item.fields, ...fields };
    item.etag = `"etag-${this.etagN++}"`;
    return item;
  }
}

function envSharePoint(opts?: { allowSynthetic?: boolean }) {
  process.env.INTEGRATION_CAPITAL_BACKEND = 'sharepoint';
  process.env.INTEGRATION_CAPITAL_SHAREPOINT_SITE_ID = SITE;
  process.env.INTEGRATION_CAPITAL_OPPORTUNITIES_LIST_ID = OPPORTUNITIES;
  process.env.INTEGRATION_CAPITAL_DOCUMENT_REQUESTS_LIST_ID = DOCUMENT_REQUESTS;
  process.env.INTEGRATION_CAPITAL_LENDER_OUTREACH_LIST_ID = LENDER_OUTREACH;
  process.env.INTEGRATION_CAPITAL_LENDERS_LIST_ID = LENDERS;
  process.env.INTEGRATION_CAPITAL_CLIENTS_LIST_ID = CLIENTS;
  process.env.AZURE_CLIENT_ID = MI;
  process.env.INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH = opts?.allowSynthetic ? 'true' : 'false';
  process.env.INTEGRATION_CAPITAL_OPTIONAL_COLUMNS = [
    'Stage',
    'StageEnteredAt',
    'NextAction',
    'MannyStrategyApproval',
    'MannyShortlistApproval',
    'ClientApproval',
    'TransactionType',
    'ChecklistItemKey',
    'ChecklistStatus',
    'SubmissionStatus',
    'SubmissionMethod',
    'SubmittedAt',
    'SubmittedBy',
  ].join(',');
}

async function verify(token: string): Promise<Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {
    member: { oid: 'user-a', preferred_username: 'a@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' },
    owner: { oid: 'user-owner', preferred_username: 'manny@example.com', roles: ['HVCG Owner'], scp: 'access_as_user' },
    other: { oid: 'user-other', preferred_username: 'other@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' },
  };
  const row = map[token];
  if (!row) {
    const err = new Error('invalid') as Error & { status: number; code: string };
    err.status = 401;
    err.code = 'invalid_token';
    throw err;
  }
  return row;
}

async function resolveAllowed(oid: string | undefined): Promise<string[]> {
  if (oid === 'user-a' || oid === 'user-owner') return ['ACCG01'];
  if (oid === 'user-other') return ['PDG01'];
  return [];
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

const ACCG_OPP = {
  title: 'ACCG working capital',
  clientCode: 'ACCG01',
  clientId: 'ACCG01',
  transactionType: 'working_capital_loc',
  need: { requestedAmount: 500_000, purpose: 'working capital', useOfFunds: 'payroll' },
  business: { industry: 'manufacturing', annualRevenue: { value: 4_200_000, verification: 'VERIFIED', confidence: 1, sourceRef: { sourceSystem: 'synthetic-fixture', capturedAt: '2026-08-01T00:00:00.000Z' } } },
  idempotencyKey: 'accg-cap-001',
  handoffSource: 'EVA',
};

async function withGraphHub(
  opts: { graph?: MemoryGraph; allowSynthetic?: boolean },
  fn: (ctx: { base: string; graph: MemoryGraph }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-graph-'));
  const graph = opts.graph || new MemoryGraph();
  graph.seed(CLIENTS, { Title: 'Alder & Co.', ClientCode: 'ACCG01' }, '1');
  graph.seed(LENDERS, { Title: 'First National', LenderType: 'Bank' }, '10');
  const prev = { ...process.env };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  envSharePoint({ allowSynthetic: opts.allowSynthetic });
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: verify,
    resolveAllowedClientIds: resolveAllowed,
    capitalGraphTransport: graph,
  };
  const capital = createSharePointCapitalService(cfg);
  assert.ok(capital);
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi, capital }, req, res).catch((err) => {
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

describe('Capital Graph live slice (in-memory)', () => {
  it('creates, reads, transitions, persists checklist, strategy notes, shortlist outreach, and recorded-only submission', async () => {
    await withGraphHub({}, async ({ base, graph }) => {
      const health = await fetch(`${base}/health`);
      const healthBody = (await health.json()) as {
        capitalBackend: { mode: string; classification: string; listsConfigured: boolean };
      };
      assert.equal(healthBody.capitalBackend.mode, 'sharepoint');
      assert.equal(healthBody.capitalBackend.classification, 'sharepoint-graph');
      assert.equal(healthBody.capitalBackend.listsConfigured, true);

      const created = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify(ACCG_OPP),
      });
      assert.equal(created.status, 200);
      const createdBody = (await created.json()) as {
        opportunity: { id: string; stage: string; handoffSource?: string; notes?: string };
      };
      const id = createdBody.opportunity.id;
      assert.ok(id);
      assert.equal(createdBody.opportunity.stage, 'NeedIdentified');

      const oppItem = graph.lists.get(OPPORTUNITIES)?.[0];
      assert.ok(oppItem);
      assert.equal(oppItem.fields.HandoffSource, 'Other');
      assert.equal(oppItem.fields.ClientIdLookupId, 1);
      assert.equal(String(oppItem.fields.Notes || '').includes('ATLAS_CAPITAL_STATE:'), true);
      assert.equal(oppItem.fields.Stage, 'NeedIdentified');

      const again = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify(ACCG_OPP),
      });
      const againBody = (await again.json()) as { opportunity: { id: string } };
      assert.equal(againBody.opportunity.id, id);

      const got = await fetch(`${base}/api/capital/opportunities/${id}`, { headers: auth('member') });
      assert.equal(got.status, 200);

      const otherGet = await fetch(`${base}/api/capital/opportunities/${id}`, { headers: auth('other') });
      assert.equal(otherGet.status, 404);
      const otherCreate = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: auth('other'),
        body: JSON.stringify({ ...ACCG_OPP, idempotencyKey: 'other-blocked' }),
      });
      assert.equal(otherCreate.status, 403);

      const step = await fetch(`${base}/api/capital/opportunities/${id}/transition`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({ toStage: 'InitialQualification' }),
      });
      assert.equal(step.status, 200);

      const nextAction = await fetch(`${base}/api/capital/opportunities/${id}/next-action`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({
          nextAction: 'Collect initial qualification documents',
          nextActionOwner: 'user-a@hvcg.test',
        }),
      });
      assert.equal(nextAction.status, 200);
      assert.equal(graph.lists.get(OPPORTUNITIES)?.[0]?.fields.NextAction, 'Collect initial qualification documents');

      const gen = await fetch(`${base}/api/capital/opportunities/${id}/checklist/generate`, {
        method: 'POST',
        headers: auth('member'),
        body: '{}',
      });
      assert.equal(gen.status, 200);
      const docsAfterGen = graph.lists.get(DOCUMENT_REQUESTS) || [];
      assert.ok(docsAfterGen.length > 0);
      assert.equal(docsAfterGen[0].fields.CapitalOpportunityIdLookupId, Number(id) || id);
      assert.ok(String(docsAfterGen[0].fields.TemplateItemKey || ''));
      const genAgain = await fetch(`${base}/api/capital/opportunities/${id}/checklist/generate`, {
        method: 'POST',
        headers: auth('member'),
        body: '{}',
      });
      assert.equal(genAgain.status, 200);
      assert.equal((graph.lists.get(DOCUMENT_REQUESTS) || []).length, docsAfterGen.length);

      const strat = await fetch(`${base}/api/capital/opportunities/${id}/strategy`, {
        method: 'POST',
        headers: auth('member'),
        body: '{}',
      });
      assert.equal(strat.status, 200);
      const afterStrategy = graph.lists.get(OPPORTUNITIES)?.[0];
      assert.ok(String(afterStrategy?.fields.Notes || '').includes('mannyStrategyApproval'));
      assert.equal(afterStrategy?.fields.MannyStrategyApproval, 'PENDING');

      const approve = await fetch(`${base}/api/capital/opportunities/${id}/strategy/decision`, {
        method: 'POST',
        headers: auth('owner'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(approve.status, 200);

      const catalog = await fetch(`${base}/api/capital/lenders`, { headers: auth('member') });
      assert.equal(catalog.status, 200);
      const catalogBody = (await catalog.json()) as {
        lenders: Array<{ id: string; name: string; products: unknown[]; freshness: string }>;
        inventedCriteria: boolean;
      };
      assert.equal(catalogBody.inventedCriteria, false);
      assert.ok(catalogBody.lenders.some((l) => l.id === '10' && l.name === 'First National' && l.products.length === 0));
      assert.equal((graph.lists.get(LENDERS) || []).length, 1);

      const match = await fetch(`${base}/api/capital/opportunities/${id}/match`, {
        method: 'POST',
        headers: auth('member'),
        body: '{}',
      });
      assert.equal(match.status, 200);
      const matchBody = (await match.json()) as {
        matches: Array<{
          lenderId: string;
          band: string;
          explanations: Array<{ sourceRef?: { sourceSystem?: string; field?: string } }>;
        }>;
        review: { status: string };
      };
      assert.equal(matchBody.review.status, 'PENDING_MANNY');
      const firstNational = matchBody.matches.find((m) => m.lenderId === '10');
      assert.ok(firstNational);
      assert.equal(firstNational.band, 'UNKNOWN');
      assert.ok(firstNational.explanations.every((e) => e.sourceRef?.sourceSystem));
      assert.equal((graph.lists.get(LENDERS) || []).length, 1);

      const shortlist = await fetch(`${base}/api/capital/opportunities/${id}/shortlist/decision`, {
        method: 'POST',
        headers: auth('owner'),
        body: JSON.stringify({ decision: 'APPROVED', lenderIds: ['10'] }),
      });
      assert.equal(shortlist.status, 200);
      assert.ok((graph.lists.get(LENDER_OUTREACH) || []).length >= 1);

      const appRes = await fetch(`${base}/api/capital/opportunities/${id}/application`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({ lenderId: '10' }),
      });
      assert.equal(appRes.status, 200);
      for (const attestation of ['CLIENT_CONFIRMATION_REQUIRED', 'CLIENT_CONFIRMED', 'APPROVED_FOR_SUBMISSION']) {
        const att = await fetch(`${base}/api/capital/opportunities/${id}/application/attest`, {
          method: 'POST',
          headers: auth('owner'),
          body: JSON.stringify({ lenderId: '10', attestation }),
        });
        assert.equal(att.status, 200, attestation);
      }

      const sub = await fetch(`${base}/api/capital/opportunities/${id}/submissions`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({ lenderId: '10', externalSubmit: true }),
      });
      assert.equal(sub.status, 200);
      const subBody = (await sub.json()) as {
        recordedOnly: boolean;
        externalSubmitAttempted: boolean;
        externalSubmit: boolean;
      };
      assert.equal(subBody.recordedOnly, true);
      assert.equal(subBody.externalSubmitAttempted, false);
      assert.equal(subBody.externalSubmit, false);
      const outreachAfterSubmit = graph.lists.get(LENDER_OUTREACH) || [];
      assert.ok(outreachAfterSubmit.some((row) => row.fields.SubmissionStatus === 'submitted'));
      assert.ok(
        outreachAfterSubmit.some((row) => row.fields.LenderIdLookupId === 10 || row.fields.LenderIdLookupId === '10'),
      );
      const replaySub = await fetch(`${base}/api/capital/opportunities/${id}/submissions`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({ lenderId: '10', externalSubmit: true }),
      });
      assert.equal(replaySub.status, 200);
      assert.equal((graph.lists.get(LENDER_OUTREACH) || []).length, outreachAfterSubmit.length);
      assert.equal(
        (graph.lists.get(LENDERS) || []).some((row) => String(row.fields.Title || '').includes('SYNTHETIC')),
        false,
      );
    });
  });

  it('rejects synthetic Graph writes unless ALLOW_SYNTHETIC_GRAPH is set', async () => {
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'SYN01', title: 'Need' }), true);
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'ACCG01', title: 'SYNTHETIC Co' }), true);
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'ACCG01', title: 'Working capital' }), false);

    await withGraphHub({ allowSynthetic: false }, async ({ base }) => {
      const denied = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: auth('member'),
        body: JSON.stringify({
          ...ACCG_OPP,
          title: 'SYNTHETIC Capital Co working capital',
          idempotencyKey: 'syn-blocked',
        }),
      });
      assert.equal(denied.status, 403);
    });

    const graph = new MemoryGraph();
    graph.seed(CLIENTS, { Title: 'Alder', ClientCode: 'ACCG01' }, '1');
    const store = new GraphCapitalStore(
      {
        siteId: SITE,
        opportunitiesListId: OPPORTUNITIES,
        documentRequestsListId: DOCUMENT_REQUESTS,
        lenderOutreachListId: LENDER_OUTREACH,
        clientsListId: CLIENTS,
        managedIdentityClientId: MI,
        allowSyntheticGraph: true,
      },
      graph,
    );
    const created = await store.createOpportunity({
      id: 'cap-temp',
      title: 'SYNTHETIC allowed',
      clientId: 'SYN01',
      clientCode: 'SYN01',
      transactionType: 'working_capital_loc',
      need: { requestedAmount: 1 },
      business: {},
      capitalProfile: {},
      transaction: {},
      stage: 'NeedIdentified',
      stageEnteredAt: new Date().toISOString(),
      ownerEmail: 'qa@example.com',
      submissionReadiness: false,
      closingReadiness: false,
      lastMeaningfulActivityAt: new Date().toISOString(),
      clientApproval: 'NOT_REQUIRED',
      mannyStrategyApproval: 'NOT_REQUIRED',
      mannyShortlistApproval: 'NOT_REQUIRED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.ok(created.id);
  });

  it('ALLOW_SYNTHETIC_GRAPH is captured at Graph store construction — env mutation is not enough', async () => {
    const graph = new MemoryGraph();
    graph.seed(CLIENTS, { Title: 'SYNTHETIC QA Client', ClientCode: 'SYN01' }, '1');
    const store = new GraphCapitalStore(
      {
        siteId: SITE,
        opportunitiesListId: OPPORTUNITIES,
        documentRequestsListId: DOCUMENT_REQUESTS,
        lenderOutreachListId: LENDER_OUTREACH,
        clientsListId: CLIENTS,
        managedIdentityClientId: MI,
        allowSyntheticGraph: false,
      },
      graph,
    );
    process.env.INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH = 'true';
    await assert.rejects(
      () =>
        store.createOpportunity({
          id: 'cap-boot',
          title: 'SYNTHETIC should still be blocked',
          clientId: 'SYN01',
          clientCode: 'SYN01',
          transactionType: 'working_capital_loc',
          need: { requestedAmount: 1 },
          business: {},
          capitalProfile: {},
          transaction: {},
          stage: 'NeedIdentified',
          stageEnteredAt: new Date().toISOString(),
          ownerEmail: 'qa@example.com',
          submissionReadiness: false,
          closingReadiness: false,
          lastMeaningfulActivityAt: new Date().toISOString(),
          clientApproval: 'NOT_REQUIRED',
          mannyStrategyApproval: 'NOT_REQUIRED',
          mannyShortlistApproval: 'NOT_REQUIRED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      /Synthetic capital records cannot be written/,
    );
  });
});
