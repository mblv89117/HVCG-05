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
import { CLIENT_OPERATING_BRIEF_MISSION_KEY } from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';

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

const CYCLE_NEXT_LINK = `https://graph.microsoft.com/v1.0/sites/${SITE}/lists/${COMMS}/items?$skiptoken=repeat`;
const PARTIAL_FILE_TITLE = 'cycled partial file.pdf';

class MemoryGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  nextId = 1;
  etagN = 1;
  commsCalls = 0;
  commsMode: 'ok' | 'deny' | 'hang' | 'cycle' | 'page_cap' = 'ok';

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
    if (listId === COMMS) this.commsCalls += 1;
    if (listId === COMMS && this.commsMode === 'deny') {
      throw new PmHttpError(403, 'forbidden', 'file-index rejected');
    }
    if (listId === COMMS && this.commsMode === 'hang') {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    if (listId === COMMS && (this.commsMode === 'cycle' || this.commsMode === 'page_cap')) {
      const nextLink =
        this.commsMode === 'cycle'
          ? CYCLE_NEXT_LINK
          : `https://graph.microsoft.com/v1.0/sites/${SITE}/lists/${COMMS}/items?$skiptoken=page-${this.commsCalls}`;
      return {
        items: [
          {
            id: `partial-${this.commsCalls}`,
            etag: `"etag-partial-${this.commsCalls}"`,
            fields: {
              Title: PARTIAL_FILE_TITLE,
              ClientCode: 'ACCG01',
              Summary: FILE_INDEX_MARKER,
              SourceItemId: `file:partial-${this.commsCalls}`,
            },
          },
        ],
        nextLink,
      };
    }
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
  fn: (ctx: { base: string; graph: MemoryGraph }) => Promise<void>,
  opts?: {
    includeAccgClient?: boolean;
    authorizeClientError?: number;
    commsMode?: 'ok' | 'deny' | 'hang' | 'cycle' | 'page_cap';
    deadlineMs?: number;
    seedApprovalTask?: boolean;
    seedBlankForeignApproval?: boolean;
  },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-w2c-route-'));
  const graph = new MemoryGraph();
  if (opts?.commsMode) graph.commsMode = opts.commsMode;
  seedAccgWorkspace(graph, { includeAccgClient: opts?.includeAccgClient });
  if (opts?.seedApprovalTask) {
    graph.seed(
      TASKS,
      {
        Title: 'ACCG capital credit path',
        ProjectIdLookupId: 10,
        ClientCode: 'ACCG01',
        TaskStatus: 'In Review',
        Priority: 'High',
        DueDate: '2026-10-01',
        OwnerEmail: 'staff@hvcg.example',
      },
      '21',
    );
  }
  if (opts?.seedBlankForeignApproval) {
    graph.seed(
      TASKS,
      {
        Title: 'Uncoded lender decision packet',
        ProjectIdLookupId: 11,
        ClientCode: '',
        TaskStatus: 'In Review',
        Priority: 'High',
        DueDate: '2026-10-02',
        OwnerEmail: 'staff@hvcg.example',
      },
      '22',
    );
  }
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
  process.env.INTEGRATION_ALLOWED_ORIGINS = [
    'https://zealous-rock-0090c7e1e.7.azurestaticapps.net',
    'http://127.0.0.1:5180',
    'http://localhost:5180',
  ].join(',');
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (opts?.deadlineMs) process.env.ATLAS_OPERATOR_BRIEF_DEADLINE_MS = String(opts.deadlineMs);
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

async function askAtlas(base: string, question: string, token = 'staff', client?: string) {
  const url = new URL(`${base}/operator/runtime.json`);
  url.searchParams.set('question', question);
  if (client) url.searchParams.set('client', client);
  const res = await fetch(url, { headers: auth(token) });
  const body = (await res.json()) as {
    workflowAnswer?: string;
    operatorDesk?: {
      askAtlas?: {
        items?: Array<{ state?: string; classification?: string }>;
      };
    };
    runtime?: {
      policyClass?: string;
      autoSend?: boolean;
      missionKey?: string;
      workspaceTruth?: string;
      portfolioFallback?: boolean;
      toolsInvoked?: string[];
      pending?: boolean;
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

        const finance = await askAtlas(base, 'What is the finance picture for ACCG?');
        assert.equal(finance.status, 200);
        assert.match(finance.body.workflowAnswer || '', /SOURCE_UNAVAILABLE/);
        assert.equal(finance.body.runtime?.portfolioFallback, false);
        assert.equal(finance.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
      },
      { includeAccgClient: false },
    );
  });

  it('answers one natural-language concierge question per domain for ACCG01', async () => {
    await withW2cHub((oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']), async ({ base }) => {
      const business = await askAtlas(base, 'What is the My Business picture for ACCG?');
      assert.equal(business.status, 200);
      assert.equal(business.body.runtime?.policyClass, 'READ_AUTO');
      assert.equal(business.body.runtime?.autoSend, false);
      assert.equal(business.body.runtime?.missionKey, CLIENT_OPERATING_BRIEF_MISSION_KEY);
      assert.match(business.body.workflowAnswer || '', new RegExp(ACCG_PROJECT));
      assert.match(business.body.workflowAnswer || '', /writePolicy=read_only/);
      assert.match(business.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.match(business.body.workflowAnswer || '', /canExecute=false/);
      assert.equal(/PDG secret|Hart Family secret|PDG01|HFD01/.test(business.body.workflowAnswer || ''), false);

      const finance = await askAtlas(base, 'What is the finance picture for ACCG?');
      assert.equal(finance.status, 200);
      assert.match(finance.body.workflowAnswer || '', /NOT_CERTIFIED/);
      assert.match(finance.body.workflowAnswer || '', /financialContext=NOT_CERTIFIED/);
      assert.equal(finance.body.runtime?.policyClass, 'READ_AUTO');
      assert.equal(finance.body.runtime?.autoSend, false);
      assert.equal(/\$[0-9]{4,}|GCC organization is mapped|PDG01|HFD01/.test(finance.body.workflowAnswer || ''), false);
      const financeItem = finance.body.operatorDesk?.askAtlas?.items?.[0];
      assert.notEqual(financeItem?.classification, 'CONFIRMED');
      assert.notEqual(financeItem?.state, 'Decision Required');

      const growth = await askAtlas(base, 'What is the growth picture for ACCG?');
      assert.equal(growth.status, 200);
      assert.match(growth.body.workflowAnswer || '', /NOT_CERTIFIED/);
      assert.match(growth.body.workflowAnswer || '', /growthContext=NOT_CERTIFIED/);
      assert.equal(/Growth360 organization is mapped|PDG01|HFD01/.test(growth.body.workflowAnswer || ''), false);
      const growthItem = growth.body.operatorDesk?.askAtlas?.items?.[0];
      assert.notEqual(growthItem?.classification, 'CONFIRMED');
      assert.notEqual(growthItem?.state, 'Decision Required');

      const capital = await askAtlas(base, 'What is the capital context for ACCG?');
      assert.equal(capital.status, 200);
      assert.match(capital.body.workflowAnswer || '', /capitalContext=/);
      assert.match(capital.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.equal(/capital submission|prepare capital|submit to lender|\$[0-9]{4,}|PDG01|HFD01/.test(capital.body.workflowAnswer || ''), false);
      assert.equal(capital.body.runtime?.toolsInvoked?.includes('client_operating_brief_honesty'), true);

      const projects = await askAtlas(base, 'What projects are active for ACCG?');
      assert.equal(projects.status, 200);
      assert.match(projects.body.workflowAnswer || '', new RegExp(ACCG_PROJECT));
      assert.equal(/PDG secret|Hart Family secret|PDG01|HFD01/.test(projects.body.workflowAnswer || ''), false);

      const documents = await askAtlas(base, 'What documents exist for ACCG?');
      assert.equal(documents.status, 200);
      assert.match(documents.body.workflowAnswer || '', /document/i);
      assert.equal(/PDG secret|Hart Family secret|PDG01|HFD01|closing binder/.test(documents.body.workflowAnswer || ''), false);

      const approvals = await askAtlas(base, 'What is the approvals brief for ACCG?');
      assert.equal(approvals.status, 200);
      assert.match(approvals.body.workflowAnswer || '', /did not apply an approval action/);
      assert.match(approvals.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
      assert.equal(approvals.body.runtime?.toolsInvoked?.includes('approval_center_honesty'), false);
      assert.equal(approvals.body.runtime?.toolsInvoked?.includes('client_operating_brief_honesty'), true);
      assert.equal(approvals.body.runtime?.policyClass, 'READ_AUTO');
      assert.equal(approvals.body.runtime?.autoSend, false);
      assert.equal(GLOBAL_AUTO_RESPOND, false);

      const unscoped = await askAtlas(base, 'What is the My Business picture?');
      assert.equal(unscoped.status, 200);
      assert.notEqual(unscoped.body.runtime?.missionKey, CLIENT_OPERATING_BRIEF_MISSION_KEY);
      assert.equal(/writePolicy=|WHAT IS HAPPENING|ACCG weekly operating file/.test(unscoped.body.workflowAnswer || ''), false);

      const portfolioCapital = await askAtlas(base, 'Summarize Capital');
      assert.equal(portfolioCapital.status, 200);
      assert.notEqual(portfolioCapital.body.runtime?.missionKey, CLIENT_OPERATING_BRIEF_MISSION_KEY);

      const prepare = await askAtlas(base, 'Prepare capital submission for ACCG');
      assert.equal(prepare.status, 200);
      assert.notEqual(prepare.body.runtime?.missionKey, CLIENT_OPERATING_BRIEF_MISSION_KEY);
      assert.equal(prepare.body.runtime?.toolsInvoked?.includes('capital_submission_honesty'), true);

      const both = await askAtlas(base, 'What is the finance picture for ACCG and PDG?');
      assert.equal(both.status, 200);
      assert.match(both.body.workflowAnswer || '', /ambiguous|will not fall back/i);
      assert.equal(/PDG secret|Hart Family secret|weekly operating file/.test(both.body.workflowAnswer || ''), false);

      const domainProjects = await askAtlas(base, 'Projects', 'staff', 'ACCG01');
      assert.equal(domainProjects.status, 200);
      assert.equal(domainProjects.body.runtime?.pending, false);
      assert.match(domainProjects.body.workflowAnswer || '', new RegExp(ACCG_PROJECT));
      assert.equal(/No entitled attention items/.test(domainProjects.body.workflowAnswer || ''), false);

      const haveDocs = await askAtlas(base, 'What documents do we have for ACCG?');
      assert.equal(haveDocs.status, 200);
      assert.equal(haveDocs.body.runtime?.missionKey, CLIENT_OPERATING_BRIEF_MISSION_KEY);
      assert.equal(haveDocs.body.runtime?.pending, false);
      assert.match(haveDocs.body.workflowAnswer || '', /document/i);
      assert.match(haveDocs.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.match(haveDocs.body.workflowAnswer || '', /canExecute=false/);
      assert.equal(haveDocs.body.runtime?.toolsInvoked?.includes('applyApprovalAction'), false);
    });
  });

  it('document and approvals questions finish when file-index returns 403 or stalls', async () => {
    const origin = 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net';
    await withW2cHub(
      (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
      async ({ base }) => {
        const started = Date.now();
        const documents = await askAtlas(base, 'Documents', 'staff', 'ACCG01');
        assert.ok(Date.now() - started < 2000, 'document question must not stay pending');
        assert.equal(documents.status, 200);
        assert.equal(documents.body.runtime?.pending, false);
        assert.match(documents.body.workflowAnswer || '', /SOURCE_UNAVAILABLE/);
        assert.match(documents.body.workflowAnswer || '', /will not invent files/i);
        assert.match(documents.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
        assert.match(documents.body.workflowAnswer || '', /capitalSubmit=false/);
        assert.match(documents.body.workflowAnswer || '', /canExecute=false/);
        assert.equal(/closing binder|PDG01|HFD01/.test(documents.body.workflowAnswer || ''), false);

        const approvals = await askAtlas(base, 'What is the approvals brief for ACCG?');
        assert.equal(approvals.status, 200);
        assert.equal(approvals.body.runtime?.pending, false);
        assert.match(approvals.body.workflowAnswer || '', /did not apply an approval action/);
        assert.match(approvals.body.workflowAnswer || '', /ACCG capital credit path/);
        assert.match(approvals.body.workflowAnswer || '', /capitalSubmit=false/);
        assert.match(approvals.body.workflowAnswer || '', /canExecute=false/);
        assert.equal(approvals.body.runtime?.toolsInvoked?.includes('applyApprovalAction'), false);
        assert.equal(GLOBAL_AUTO_RESPOND, false);

        const signed = await fetch(
          `${base}/operator/runtime.json?question=${encodeURIComponent('Documents')}&client=ACCG01`,
          { headers: { ...auth('staff'), origin } },
        );
        assert.equal(signed.status, 200);
        assert.equal(signed.headers.get('access-control-allow-origin'), origin);

        const unsigned = await fetch(
          `${base}/operator/runtime.json?question=${encodeURIComponent('Documents')}`,
          { headers: { origin } },
        );
        assert.equal(unsigned.status, 401);
        assert.equal(unsigned.headers.get('access-control-allow-origin'), origin);

        const forbidden = await fetch(
          `${base}/operator/runtime.json?question=${encodeURIComponent('Approvals')}&client=ACCG01`,
          { headers: { ...auth('client'), origin } },
        );
        assert.equal(forbidden.status, 403);
        assert.equal(forbidden.headers.get('access-control-allow-origin'), origin);

        const preflight = await fetch(`${base}/operator/runtime.json`, {
          method: 'OPTIONS',
          headers: {
            origin,
            'access-control-request-method': 'GET',
            'access-control-request-headers': 'authorization,content-type',
          },
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
      },
      { commsMode: 'deny', seedApprovalTask: true },
    );

    await withW2cHub(
      (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
      async ({ base }) => {
        const started = Date.now();
        const documents = await askAtlas(base, 'What documents exist for ACCG?');
        const elapsed = Date.now() - started;
        assert.ok(elapsed < 2000, `stalled file-index must still finish (${elapsed}ms)`);
        assert.equal(documents.status, 200);
        assert.equal(documents.body.runtime?.pending, false);
        assert.match(documents.body.workflowAnswer || '', /SOURCE_UNAVAILABLE|will not invent files/i);

        const approvals = await askAtlas(base, 'Approvals', 'staff', 'ACCG01');
        assert.equal(approvals.status, 200);
        assert.equal(approvals.body.runtime?.pending, false);
        assert.match(approvals.body.workflowAnswer || '', /did not apply an approval action/);
        assert.match(approvals.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
      },
      { commsMode: 'hang', deadlineMs: 400, seedApprovalTask: true },
    );
  });

  it('repeated nextLink or page-cap file-index walks are SOURCE_UNAVAILABLE and are not cached complete', async () => {
    for (const commsMode of ['cycle', 'page_cap'] as const) {
      await withW2cHub(
        (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
        async ({ base, graph }) => {
          const first = await askAtlas(base, 'Documents', 'staff', 'ACCG01');
          assert.equal(first.status, 200);
          assert.equal(first.body.runtime?.pending, false);
          assert.equal(first.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
          assert.match(first.body.workflowAnswer || '', /SOURCE_UNAVAILABLE/);
          assert.match(first.body.workflowAnswer || '', /will not invent files/i);
          assert.match(first.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
          assert.match(first.body.workflowAnswer || '', /capitalSubmit=false/);
          assert.match(first.body.workflowAnswer || '', /canExecute=false/);
          assert.equal(/documents=INDEXED|documents=CONFIRMED|entitled document index row/i.test(first.body.workflowAnswer || ''), false);
          assert.equal(first.body.workflowAnswer?.includes(PARTIAL_FILE_TITLE), false);
          assert.equal(first.body.runtime?.toolsInvoked?.includes('applyApprovalAction'), false);
          const afterFirst = graph.commsCalls;
          assert.ok(afterFirst > 1, `${commsMode} walk must page the file-index`);

          const second = await askAtlas(base, 'What documents exist for ACCG?');
          assert.equal(second.status, 200);
          assert.equal(second.body.runtime?.pending, false);
          assert.equal(second.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
          assert.match(second.body.workflowAnswer || '', /SOURCE_UNAVAILABLE/);
          assert.equal(/documents=INDEXED|documents=CONFIRMED|entitled document index row/i.test(second.body.workflowAnswer || ''), false);
          assert.ok(
            graph.commsCalls > afterFirst,
            `${commsMode} truncation must not be served as a complete list cache hit`,
          );
        },
        { commsMode },
      );
    }
  });

  it('blank ClientCode task on another entitled client is excluded from the ACCG01 approvals answer', async () => {
    await withW2cHub(
      (oid) => (oid === USER_STAFF ? STAFF_CODES : ['ACCG01']),
      async ({ base }) => {
        const approvals = await askAtlas(base, 'What is the approvals brief for ACCG?');
        assert.equal(approvals.status, 200);
        assert.equal(approvals.body.runtime?.pending, false);
        assert.match(approvals.body.workflowAnswer || '', /ACCG capital credit path/);
        assert.equal((approvals.body.workflowAnswer || '').includes('Uncoded lender decision packet'), false);
        assert.match(approvals.body.workflowAnswer || '', /did not apply an approval action/);
        assert.match(approvals.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
        assert.match(approvals.body.workflowAnswer || '', /capitalSubmit=false/);
        assert.match(approvals.body.workflowAnswer || '', /canExecute=false/);
        assert.equal(approvals.body.runtime?.toolsInvoked?.includes('applyApprovalAction'), false);
        assert.equal(GLOBAL_AUTO_RESPOND, false);
      },
      { seedApprovalTask: true, seedBlankForeignApproval: true },
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
