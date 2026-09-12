import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository, createSharePointPmService } from '../src/pm/backend.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import { FILE_INDEX_MARKER } from '../src/pm/sharepoint/fabric/fileIndex.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const CONTACTS = 'ffffffff-ffff-4fff-8fff-fffffffffff1';

const USER_STAFF = '11111111-1111-4111-8111-111111111003';
const USER_CLIENT = '11111111-1111-4111-8111-111111111006';

const ACCG_PROJECT = 'ACCG weekly operating file';
const ACCG_TASK = 'ACCG overdue blocked follow-up';
const ACCG_TIMELINE = 'ACCG ops check-in';
const ACCG_FILE = 'ACCG indexed correspondence.pdf';
const ACCG_CANDIDATE_EMAIL = 'ops@accg-inc.example';

class MemoryGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  nextId = 1;
  etagN = 1;

  constructor() {
    this.lists.set(PROJECTS, []);
    this.lists.set(TASKS, []);
    this.lists.set(MILESTONES, []);
    this.lists.set(CLIENTS, []);
    this.lists.set(COMMS, []);
    this.lists.set(CONTACTS, []);
  }

  seed(listId: string, fields: Record<string, unknown>, id?: string): GraphListItem {
    const item: GraphListItem = {
      id: id || String(this.nextId++),
      etag: `"etag-${this.etagN++}"`,
      fields: { ...fields, id: Number(id || this.nextId - 1) },
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

  async createItem(): Promise<GraphListItem> {
    throw new PmHttpError(403, 'forbidden', 'W2C route tests are read-only.');
  }

  async patchItemFields(): Promise<GraphListItem> {
    throw new PmHttpError(403, 'forbidden', 'W2C route tests are read-only.');
  }
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: {
    id: oid,
    mail: `${oid.slice(0, 8)}@hvcg.example`,
    userPrincipalName: `${oid.slice(0, 8)}@hvcg.example`,
  },
});

async function verify(token: string): Promise<Record<string, unknown>> {
  if (token === 'staff') {
    return { oid: USER_STAFF, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'client') {
    return { oid: USER_CLIENT, roles: ['Client Executive'], scp: 'access_as_user' };
  }
  const err = new Error('invalid') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

function seedAccgWorkspace(graph: MemoryGraph, opts?: { includeAccgClient?: boolean }) {
  if (opts?.includeAccgClient !== false) {
    graph.seed(CLIENTS, { Title: 'ACCG Inc.', ClientCode: 'ACCG01' }, '1');
  }
  graph.seed(CLIENTS, { Title: 'PDG', ClientCode: 'PDG01' }, '2');
  graph.seed(CLIENTS, { Title: 'Hart Family', ClientCode: 'HFD01' }, '3');
  graph.seed(
    PROJECTS,
    {
      Title: ACCG_PROJECT,
      ClientCode: 'ACCG01',
      IsInternalProject: false,
      ProjectStatus: 'In Progress',
      ProjectHealth: 'Green',
      Priority: 'Medium',
    },
    '10',
  );
  graph.seed(
    PROJECTS,
    {
      Title: 'PDG secret work',
      ClientCode: 'PDG01',
      IsInternalProject: false,
      ProjectStatus: 'In Progress',
      ProjectHealth: 'Green',
      Priority: 'Medium',
    },
    '11',
  );
  graph.seed(
    PROJECTS,
    {
      Title: 'Hart Family secret work',
      ClientCode: 'HFD01',
      IsInternalProject: false,
      ProjectStatus: 'In Progress',
      ProjectHealth: 'Green',
      Priority: 'Medium',
    },
    '12',
  );
  graph.seed(
    TASKS,
    {
      Title: ACCG_TASK,
      ProjectIdLookupId: 10,
      ClientCode: 'ACCG01',
      TaskStatus: 'Blocked',
      Priority: 'High',
      DueDate: '2020-01-01',
      OwnerEmail: 'staff@hvcg.example',
    },
    '20',
  );
  graph.seed(
    COMMS,
    {
      Title: ACCG_TIMELINE,
      ClientCode: 'ACCG01',
      CommunicationDate: '2026-09-10',
      Summary: 'Entitled ACCG operating check-in.',
    },
    '30',
  );
  graph.seed(
    COMMS,
    {
      Title: ACCG_FILE,
      ClientCode: 'ACCG01',
      CommunicationDate: '2026-09-09',
      Summary: FILE_INDEX_MARKER,
      SourceItemId: 'file:accg-indexed-correspondence',
    },
    '31',
  );
  graph.seed(
    COMMS,
    {
      Title: `Thread with ${ACCG_CANDIDATE_EMAIL}`,
      ClientCode: 'ACCG01',
      CommunicationDate: '2026-09-08',
      Summary: 'Entitled communication containing a contact candidate.',
    },
    '32',
  );
}

async function withW2cHub(
  entitlements: (oid: string | undefined) => string[],
  fn: (ctx: { base: string }) => Promise<void>,
  opts?: { includeAccgClient?: boolean; authorizeClientError?: number },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-w2c-route-'));
  const graph = new MemoryGraph();
  seedAccgWorkspace(graph, { includeAccgClient: opts?.includeAccgClient });
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
  process.env.INTEGRATION_PM_COMMUNICATIONS_LIST_ID = COMMS;
  process.env.INTEGRATION_PM_CONTACTS_LIST_ID = CONTACTS;
  process.env.AZURE_CLIENT_ID = MI;
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: verify,
    resolveAllowedClientIds: async (oid) => entitlements(oid),
    lookupUserBasic: lookupOk,
    pmGraphTransport: graph,
  };
  const sharepoint = createSharePointPmService(cfg);
  assert.ok(sharepoint);
  if (opts?.authorizeClientError) {
    const status = opts.authorizeClientError;
    sharepoint.authorizeClient = async () => {
      throw new PmHttpError(
        status,
        status >= 500 ? 'PM_BACKEND_UNAVAILABLE' : 'not_found',
        'SharePoint workspace retrieval failed.',
      );
    };
  }
  assert.equal(createAuthorizedPmRepository(cfg), null);
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
    await fn({ base: `http://127.0.0.1:${port}` });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  }
}

async function askAtlas(base: string, question: string, token = 'staff', client?: string) {
  const url = new URL(`${base}/operator/runtime.json`);
  url.searchParams.set('question', question);
  if (client) url.searchParams.set('client', client);
  const res = await fetch(url, { headers: auth(token) });
  const body = (await res.json()) as {
    workflowAnswer?: string;
    runtime?: {
      policyClass?: string;
      autoSend?: boolean;
      missionKey?: string;
      workspaceTruth?: string;
      portfolioFallback?: boolean;
    };
    error?: string;
    code?: string;
  };
  return { status: res.status, body };
}

const STAFF_CODES = ['ACCG01', 'PDG01', 'HFD01'];

describe('W2C ACCG01 route-level honest workspace truth', () => {
  it('Ask Atlas and Live Client workspace share the same entitled ACCG facts', async () => {
    await withW2cHub((oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']), async ({ base }) => {
      const workspaceRes = await fetch(`${base}/api/pm/clients/ACCG01/workspace`, { headers: auth('staff') });
      assert.equal(workspaceRes.status, 200);
      const wsBody = (await workspaceRes.json()) as {
        workspace: {
          client: { clientCode: string; displayName: string };
          writePolicy?: string;
          liveClientPilot?: {
            clientCode: string;
            financialContext?: string;
            growthContext?: string;
            contactsCompleteness?: string;
            writePolicy?: string;
            whatIsHappening?: string[];
            whatChanged?: string[];
            known?: string[];
            contactCandidates?: Array<{ email?: string; writeStatus?: string }>;
            queues?: { blocked: Array<{ title: string }> };
          };
          projects: Array<{ name: string; clientCode?: string }>;
          timeline: Array<{ title: string }>;
          documents: { items: Array<{ title: string }> };
          contacts: { queried: boolean; items: unknown[] };
        };
      };
      const ws = wsBody.workspace;
      assert.equal(ws.client.clientCode, 'ACCG01');
      assert.equal(ws.writePolicy, 'read_only');
      assert.ok(ws.projects.some((p) => p.name === ACCG_PROJECT));
      assert.equal(ws.projects.some((p) => /PDG|Hart Family/.test(p.name)), false);
      assert.ok(ws.timeline.some((ev) => ev.title === ACCG_TIMELINE));
      assert.ok(ws.documents.items.some((d) => d.title === ACCG_FILE));
      assert.equal(ws.contacts.queried, true);
      assert.equal(ws.contacts.items.length, 0);
      const pilot = ws.liveClientPilot;
      assert.ok(pilot);
      assert.equal(pilot.clientCode, 'ACCG01');
      assert.equal(pilot.financialContext, 'NOT_CERTIFIED');
      assert.equal(pilot.growthContext, 'NOT_CERTIFIED');
      assert.equal(pilot.contactsCompleteness, 'MISSING');
      assert.equal(pilot.writePolicy, 'read_only');
      assert.match(pilot.whatIsHappening?.join(' ') || '', new RegExp(ACCG_PROJECT));
      assert.match(pilot.whatChanged?.join(' ') || '', new RegExp(ACCG_TIMELINE));
      assert.equal(pilot.contactCandidates?.every((c) => c.writeStatus === 'CANDIDATE_NOT_CREATED'), true);
      assert.ok(pilot.contactCandidates?.some((c) => c.email === ACCG_CANDIDATE_EMAIL));
      assert.ok(pilot.queues?.blocked.some((q) => q.title === ACCG_TASK));

      const working = await askAtlas(base, 'What are we working on for ACCG?');
      assert.equal(working.status, 200);
      assert.equal(working.body.runtime?.policyClass, 'READ_AUTO');
      assert.equal(working.body.runtime?.autoSend, false);
      assert.match(working.body.workflowAnswer || '', new RegExp(ACCG_PROJECT));
      assert.equal(/PDG01|HFD01|PDG secret|Hart Family secret/.test(working.body.workflowAnswer || ''), false);

      const changed = await askAtlas(base, 'What changed recently for ACCG?');
      assert.equal(changed.status, 200);
      assert.match(changed.body.workflowAnswer || '', new RegExp(ACCG_TIMELINE));

      const missing = await askAtlas(base, 'What documents are missing for ACCG?');
      assert.equal(missing.status, 200);
      assert.match(
        missing.body.workflowAnswer || '',
        /inventoried files|does not invent a closing checklist|MISSING/i,
      );
      assert.equal(/closing binder|invented checklist|PDG01|HFD01/.test(missing.body.workflowAnswer || ''), false);

      const knownFin = await askAtlas(base, 'What does Atlas know about ACCG financials?');
      assert.equal(knownFin.status, 200);
      assert.match(knownFin.body.workflowAnswer || '', /NOT_CERTIFIED/);
      assert.equal(/\$[0-9]{4,}|runway|borrow/.test(knownFin.body.workflowAnswer || ''), false);

      const unknownFin = await askAtlas(base, 'What does Atlas NOT know about ACCG financials?');
      assert.equal(unknownFin.status, 200);
      assert.match(unknownFin.body.workflowAnswer || '', /NOT_CERTIFIED/);

      const blocked = await askAtlas(base, 'What is blocked for ACCG?');
      assert.equal(blocked.status, 200);
      assert.match(blocked.body.workflowAnswer || '', new RegExp(ACCG_TASK));
      assert.equal(/PDG secret|Hart Family secret/.test(blocked.body.workflowAnswer || ''), false);

      const brief = await askAtlas(base, 'Give me the current ACCG operating brief.');
      assert.equal(brief.status, 200);
      const briefText = brief.body.workflowAnswer || '';
      assert.match(briefText, new RegExp(ACCG_PROJECT));
      assert.match(briefText, /NOT_CERTIFIED/);
      assert.match(briefText, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(briefText, /capitalSubmit=false/);
      assert.match(briefText, /canExecute=false/);
      assert.equal(GLOBAL_AUTO_RESPOND, false);
    });
  });

  it('fail-closes unknown, unentitled, unsigned, and client-principal operator routes', async () => {
    await withW2cHub((oid) => (oid === USER_STAFF ? ['ACCG01'] : ['ACCG01']), async ({ base }) => {
      const unknownWs = await fetch(`${base}/api/pm/clients/NOPE99/workspace`, { headers: auth('staff') });
      assert.equal(unknownWs.status, 404);

      const unentitledWs = await fetch(`${base}/api/pm/clients/PDG01/workspace`, { headers: auth('staff') });
      assert.equal(unentitledWs.status, 404);

      const unknownAsk = await askAtlas(base, 'What are we working on?', 'staff', 'NOPE99');
      assert.equal(unknownAsk.status, 200);
      assert.match(unknownAsk.body.workflowAnswer || '', /will not fall back to portfolio|Fail closed|Client scope is required/i);
      assert.equal(/PDG secret|Hart Family secret/.test(unknownAsk.body.workflowAnswer || ''), false);

      const unentitledAsk = await askAtlas(base, 'What are we working on for PDG?');
      assert.equal(unentitledAsk.status, 200);
      assert.match(unentitledAsk.body.workflowAnswer || '', /will not fall back to portfolio|Fail closed|Client scope is required|unentitled/i);
      assert.equal(/PDG secret/.test(unentitledAsk.body.workflowAnswer || ''), false);

      const unsigned = await fetch(`${base}/operator/runtime.json?question=${encodeURIComponent('What are we working on for ACCG?')}`);
      assert.equal(unsigned.status, 401);

      const client = await askAtlas(base, 'What are we working on for ACCG?', 'client');
      assert.equal(client.status, 403);
    });
  });

  it('entitled ACCG01 with missing SharePoint workspace is SOURCE_UNAVAILABLE, not recovered-as-current', async () => {
    await withW2cHub(
      (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
      async ({ base }) => {
        const working = await askAtlas(base, 'What are we working on for ACCG?');
        assert.equal(working.status, 200);
        const text = working.body.workflowAnswer || '';
        assert.match(text, /SOURCE_UNAVAILABLE/);
        assert.match(text, /will not substitute recovered or portfolio data/i);
        assert.equal(working.body.runtime?.policyClass, 'READ_AUTO');
        assert.equal(working.body.runtime?.autoSend, false);
        assert.equal(working.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
        assert.equal(working.body.runtime?.portfolioFallback, false);
        assert.equal(/weekly operating file|PDG secret|Hart Family secret|PDG01|HFD01|01_Intake Docs/.test(text), false);
        assert.equal(/\$[0-9]{4,}|TargetAmount|lender approval/.test(text), false);
      },
      { includeAccgClient: false },
    );
  });

  it('Graph/server workspace errors are SOURCE_UNAVAILABLE without silent workspace-less composition', async () => {
    await withW2cHub(
      (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
      async ({ base }) => {
        const brief = await askAtlas(base, 'Give me the current ACCG operating brief.');
        assert.equal(brief.status, 200);
        const text = brief.body.workflowAnswer || '';
        assert.match(text, /SOURCE_UNAVAILABLE/);
        assert.match(text, /will not substitute recovered or portfolio data/i);
        assert.match(text, /NOT_CERTIFIED/);
        assert.match(text, /GLOBAL_AUTO_RESPOND=false/);
        assert.equal(brief.body.runtime?.policyClass, 'READ_AUTO');
        assert.equal(brief.body.runtime?.autoSend, false);
        assert.equal(brief.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
        assert.equal(brief.body.runtime?.portfolioFallback, false);
        assert.equal(/weekly operating file|PDG secret|Hart Family secret|Graph 503|stack|token|secret/.test(text), false);
        assert.equal(/\$[0-9]{4,}|TargetAmount|lender approval/.test(text), false);
      },
      { authorizeClientError: 503 },
    );
  });
});
