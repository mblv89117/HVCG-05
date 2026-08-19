import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository, createSharePointPmService } from '../src/pm/backend.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { createGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { fieldsEq, fieldsEqTrue, itemMatchesFieldsFilter } from '../src/pm/sharepoint/odata.ts';
import { classifyProjectFields, canAccessClassification, isInternalStaff } from '../src/pm/sharepoint/authz.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

const USER_A = '11111111-1111-4111-8111-111111111001';
const USER_B = '11111111-1111-4111-8111-111111111002';
const USER_STAFF = '11111111-1111-4111-8111-111111111003';
const USER_ADMIN = '11111111-1111-4111-8111-111111111004';
const USER_ADVISOR = '11111111-1111-4111-8111-111111111005';
const USER_CLIENT = '11111111-1111-4111-8111-111111111006';

class MemoryGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  nextId = 1;
  pageSize = 100;
  etagN = 1;
  failCreateFor = new Map<string, number>();
  failPatchFor = new Map<string, number>();

  constructor() {
    this.lists.set(PROJECTS, []);
    this.lists.set(TASKS, []);
    this.lists.set(MILESTONES, []);
    this.lists.set(CLIENTS, []);
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

  private matchFilter(item: GraphListItem, filter?: string): boolean {
    if (!filter) return true;
    const eq = /^fields\/(\w+) eq (.+)$/.exec(filter);
    if (!eq) return false;
    const field = eq[1];
    let expected = eq[2];
    if (expected === '1') return item.fields[field] === true || item.fields[field] === 1;
    if (expected.startsWith("'") && expected.endsWith("'")) {
      expected = expected.slice(1, -1).replace(/''/g, "'");
      return String(item.fields[field] ?? '') === expected;
    }
    if (field.endsWith('LookupId') || field === 'ProjectIdLookupId') {
      return String(item.fields[field] ?? '') === expected;
    }
    return String(item.fields[field] ?? '') === expected;
  }

  async listItems(
    listId: string,
    opts?: { filter?: string; top?: number; nextLink?: string },
  ): Promise<GraphListPage> {
    const all = (this.lists.get(listId) || []).filter((i) => this.matchFilter(i, opts?.filter));
    const top = opts?.top && opts.top > 0 ? opts.top : this.pageSize;
    let start = 0;
    if (opts?.nextLink) {
      const url = new URL(opts.nextLink);
      start = Number(url.searchParams.get('$skiptoken') || '0');
    }
    const slice = all.slice(start, start + top);
    const nextStart = start + top;
    const nextLink =
      nextStart < all.length
        ? `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${listId}/items?$skiptoken=${nextStart}`
        : undefined;
    return { items: slice, nextLink };
  }

  async getItem(listId: string, itemId: string): Promise<GraphListItem | null> {
    return (this.lists.get(listId) || []).find((i) => i.id === itemId) || null;
  }

  async createItem(listId: string, fields: Record<string, unknown>): Promise<GraphListItem> {
    const fail = this.failCreateFor.get(listId);
    if (fail) {
      throw new PmHttpError(fail, fail === 403 ? 'forbidden' : 'PM_BACKEND_UNAVAILABLE', `Graph ${fail}`);
    }
    return this.seed(listId, fields);
  }

  async patchItemFields(
    listId: string,
    itemId: string,
    fields: Record<string, unknown>,
    etag: string,
  ): Promise<GraphListItem> {
    const fail = this.failPatchFor.get(listId);
    if (fail) {
      throw new PmHttpError(fail, fail === 403 ? 'forbidden' : 'PM_BACKEND_UNAVAILABLE', `Graph ${fail}`);
    }
    const arr = this.lists.get(listId) || [];
    const item = arr.find((i) => i.id === itemId);
    if (!item) {
      const err = new Error('not_found') as Error & { status: number; code: string };
      err.status = 404;
      err.code = 'not_found';
      throw err;
    }
    if (etag !== item.etag) {
      throw new PmHttpError(412, 'PM_ETAG_CONFLICT', 'The SharePoint item was updated by another request.');
    }
    item.fields = { ...item.fields, ...fields };
    item.etag = `"etag-${this.etagN++}"`;
    return item;
  }
}

function envSharePoint() {
  process.env.INTEGRATION_PM_BACKEND = 'sharepoint';
  process.env.INTEGRATION_PM_SHAREPOINT_SITE_ID = SITE;
  process.env.INTEGRATION_PM_PROJECTS_LIST_ID = PROJECTS;
  process.env.INTEGRATION_PM_TASKS_LIST_ID = TASKS;
  process.env.INTEGRATION_PM_MILESTONES_LIST_ID = MILESTONES;
  process.env.INTEGRATION_PM_CLIENTS_LIST_ID = CLIENTS;
  process.env.AZURE_CLIENT_ID = MI;
}

async function verify(token: string): Promise<Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {
    a: { oid: USER_A, roles: ['HVCG Team Member'], scp: 'access_as_user' },
    b: { oid: USER_B, roles: ['HVCG Team Member'], scp: 'access_as_user' },
    staff: { oid: USER_STAFF, roles: ['HVCG Owner'], scp: 'access_as_user' },
    admin: { oid: USER_ADMIN, roles: ['Administrator'], scp: 'access_as_user' },
    advisor: { oid: USER_ADVISOR, roles: ['Read-Only Advisor'], scp: 'access_as_user' },
    client: { oid: USER_CLIENT, roles: ['Client Executive'], scp: 'access_as_user' },
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

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: {
    id: oid,
    mail: `${oid.slice(0, 8)}@hvcg.example`,
    userPrincipalName: `${oid.slice(0, 8)}@hvcg.example`,
  },
});

async function withSpHub(
  opts: {
    entitlements: (oid: string | undefined) => string[];
    lookup?: UserBasicLookup;
    graph?: MemoryGraph;
    nodeEnv?: 'development' | 'production';
  },
  fn: (ctx: { base: string; graph: MemoryGraph; dataDir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-sp-'));
  const graph = opts.graph || new MemoryGraph();
  graph.seed(CLIENTS, { Title: 'Alder & Co.', ClientCode: 'ACCG01' }, '1');
  graph.seed(CLIENTS, { Title: 'PDG', ClientCode: 'PDG01' }, '2');
  const prev = { ...process.env };
  process.env.NODE_ENV = opts.nodeEnv || 'production';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  envSharePoint();
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: verify,
    resolveAllowedClientIds: async (oid) => opts.entitlements(oid),
    lookupUserBasic: opts.lookup || lookupOk,
    pmGraphTransport: graph,
  };
  const sharepoint = createSharePointPmService(cfg);
  assert.ok(sharepoint);
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
    await fn({ base: `http://127.0.0.1:${port}`, graph, dataDir: dir });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  }
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

describe('SharePoint PM unit: authz / odata / mapping safety', () => {
  it('missing ClientCode is not internal', () => {
    assert.equal(classifyProjectFields({ clientCode: '', isInternal: false }).kind, 'invalid');
    assert.equal(classifyProjectFields({ isInternal: true }).kind, 'internal');
    assert.equal(classifyProjectFields({ clientCode: 'ACCG01', isInternal: true }).kind, 'invalid');
    assert.equal(classifyProjectFields({ clientCode: 'ACCG01' }).kind, 'client');
  });

  it('Administrator and client roles are not internal staff', () => {
    const admin: AtlasPrincipal = {
      userId: USER_ADMIN,
      organizationId: 'org-hvcg',
      allowedClientIds: [],
      roles: ['Administrator'],
    };
    const advisor: AtlasPrincipal = {
      userId: USER_ADVISOR,
      organizationId: 'org-hvcg',
      allowedClientIds: ['ACCG01'],
      roles: ['Read-Only Advisor'],
    };
    const owner: AtlasPrincipal = {
      userId: USER_STAFF,
      organizationId: 'org-hvcg',
      allowedClientIds: [],
      roles: ['HVCG Owner'],
    };
    assert.equal(isInternalStaff(admin), false);
    assert.equal(isInternalStaff(advisor), false);
    assert.equal(isInternalStaff(owner), true);
    assert.equal(canAccessClassification(admin, { kind: 'internal' }), false);
    assert.equal(canAccessClassification(owner, { kind: 'internal' }), true);
    assert.equal(canAccessClassification(owner, { kind: 'client', clientCode: 'ACCG01' }), false);
  });

  it('wildcard is not a client scope', () => {
    const p: AtlasPrincipal = {
      userId: USER_A,
      organizationId: 'org-hvcg',
      allowedClientIds: ['*'],
      roles: ['HVCG Team Member'],
    };
    assert.equal(canAccessClassification(p, { kind: 'client', clientCode: 'ACCG01' }), false);
  });

  it('OData escaping doubles quotes', () => {
    assert.equal(fieldsEq('OwnerEmail', "o'brien@hvcg.example"), "fields/OwnerEmail eq 'o''brien@hvcg.example'");
  });

  it('Hub matches field filters in memory without sending them to Graph', () => {
    assert.equal(
      itemMatchesFieldsFilter({ fields: { ClientCode: 'ACCG01' } }, fieldsEq('ClientCode', 'ACCG01')),
      true,
    );
    assert.equal(
      itemMatchesFieldsFilter({ fields: { ClientCode: 'PDG01' } }, fieldsEq('ClientCode', 'ACCG01')),
      false,
    );
    assert.equal(
      itemMatchesFieldsFilter({ fields: { IsInternalProject: true } }, fieldsEqTrue('IsInternalProject')),
      true,
    );
    assert.equal(
      itemMatchesFieldsFilter({ fields: { ProjectIdLookupId: 70 } }, 'fields/ProjectIdLookupId eq 70'),
      true,
    );
  });

  it('pagination nextLink off graph.microsoft.com is rejected', async () => {
    let tokenCalls = 0;
    const transport = createGraphTransport(
      {
        siteId: SITE,
        projectsListId: PROJECTS,
        tasksListId: TASKS,
        milestonesListId: MILESTONES,
        clientsListId: CLIENTS,
      },
      {
        getToken: async () => {
          tokenCalls += 1;
          return 'tok';
        },
      },
    );
    await assert.rejects(
      () => transport.listItems(PROJECTS, { nextLink: 'https://evil.example/v1.0/sites/x/lists/y/items' }),
      /pagination link was rejected/,
    );
    assert.equal(tokenCalls, 0);
  });
});

describe('SharePoint PM HTTP', () => {
  it('health reports sharepoint without raw IDs or tokens and does not write JSON', async () => {
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base, dataDir }) => {
      const res = await fetch(`${base}/health`);
      const body = (await res.json()) as {
        pmBackend: Record<string, unknown>;
      };
      assert.equal(body.pmBackend.mode, 'sharepoint');
      assert.equal(body.pmBackend.credentialMode, 'managed_identity');
      assert.equal(body.pmBackend.configComplete, true);
      assert.equal(JSON.stringify(body).includes(PROJECTS), false);
      assert.equal(existsSync(join(dataDir, 'pm-store.json')), false);
    });
  });

  it('lists only entitled client projects and excludes others', async () => {
    await withSpHub({ entitlements: (oid) => (oid === USER_A ? ['ACCG01'] : ['PDG01']) }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder work',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
        AtlasClientRefLookupId: 1,
      }, '10');
      graph.seed(PROJECTS, {
        Title: 'PDG work',
        ClientCode: 'PDG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
        AtlasClientRefLookupId: 2,
      }, '11');
      const a = await fetch(`${base}/api/pm/projects`, { headers: auth('a') });
      const aBody = (await a.json()) as { projects: Array<{ id: string; name: string }> };
      assert.equal(a.status, 200);
      assert.deepEqual(aBody.projects.map((p) => p.id), ['10']);
      const hidden = await fetch(`${base}/api/pm/projects/11`, { headers: auth('a') });
      assert.equal(hidden.status, 404);
      const missing = await fetch(`${base}/api/pm/projects/99`, { headers: auth('a') });
      assert.equal(missing.status, 404);
    });
  });

  it('internal projects require staff; missing ClientCode is not internal; admin denied', async () => {
    await withSpHub({ entitlements: () => [] }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Ops',
        ClientCode: '',
        IsInternalProject: true,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '20');
      graph.seed(PROJECTS, {
        Title: 'Orphan',
        ClientCode: '',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '21');
      const staff = await fetch(`${base}/api/pm/projects`, { headers: auth('staff') });
      const staffBody = (await staff.json()) as { projects: Array<{ id: string }> };
      assert.deepEqual(staffBody.projects.map((p) => p.id), ['20']);
      const admin = await fetch(`${base}/api/pm/projects`, { headers: auth('admin') });
      const adminBody = (await admin.json()) as { projects: Array<{ id: string }> };
      assert.deepEqual(adminBody.projects, []);
      const advisor = await fetch(`${base}/api/pm/projects/20`, { headers: auth('advisor') });
      assert.equal(advisor.status, 404);
      const orphan = await fetch(`${base}/api/pm/projects/21`, { headers: auth('staff') });
      assert.equal(orphan.status, 404);
    });
  });

  it('creates client project with lookup; rejects UUID/display/unauthorized/duplicate/missing ClientCode', async () => {
    await withSpHub({ entitlements: () => ['ACCG01', 'KAVA01'] }, async ({ base, graph }) => {
      graph.seed(CLIENTS, { Title: 'Dup', ClientCode: 'ACCG01' }, '9');
      const dup = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'X', ClientCode: 'ACCG01' }),
      });
      assert.equal(dup.status, 409);
      graph.lists.set(CLIENTS, [graph.lists.get(CLIENTS)![0], graph.lists.get(CLIENTS)![1]]);
      const missing = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'X', ClientCode: 'KAVA01' }),
      });
      assert.equal(missing.status, 400);
      const uuid = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'X', clientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9' }),
      });
      assert.equal(uuid.status, 400);
      const name = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'X', clientName: 'Alder & Co.' }),
      });
      assert.equal(name.status, 400);
      const other = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'X', ClientCode: 'PDG01' }),
      });
      assert.equal(other.status, 403);
    });
  });

  it('creates client and internal projects; patch keeps classification immutable', async () => {
    await withSpHub({ entitlements: (oid) => (oid === USER_A ? ['ACCG01'] : []) }, async ({ base, graph }) => {
      const created = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'Alder PM', ClientCode: 'ACCG01' }),
      });
      assert.equal(created.status, 200);
      const project = (await created.json()) as { project: { id: string; etag: string; clientCode: string } };
      assert.equal(project.project.clientCode, 'ACCG01');
      const item = await graph.getItem(PROJECTS, project.project.id);
      assert.equal(item?.fields.ClientCode, 'ACCG01');
      assert.equal(item?.fields.AtlasClientRefLookupId, 1);
      const locked = await fetch(`${base}/api/pm/projects/${project.project.id}`, {
        method: 'PATCH',
        headers: { ...auth('a'), 'if-match': project.project.etag },
        body: JSON.stringify({ ClientCode: 'PDG01' }),
      });
      assert.equal(locked.status, 400);
      const internal = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('staff'),
        body: JSON.stringify({ name: 'Internal', isInternalProject: true }),
      });
      assert.equal(internal.status, 200);
      const deniedInternal = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('admin'),
        body: JSON.stringify({ name: 'Internal', isInternalProject: true }),
      });
      assert.equal(deniedInternal.status, 403);
    });
  });

  it('ETag conflict is 412; archive is not implemented', async () => {
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base }) => {
      const created = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ name: 'ETag', ClientCode: 'ACCG01' }),
      });
      const project = (await created.json()) as { project: { id: string; etag: string } };
      const stale = await fetch(`${base}/api/pm/projects/${project.project.id}`, {
        method: 'PATCH',
        headers: { ...auth('a'), 'if-match': '"nope"' },
        body: JSON.stringify({ name: 'Nope' }),
      });
      assert.equal(stale.status, 412);
      const archive = await fetch(`${base}/api/pm/projects/${project.project.id}/archive`, {
        method: 'POST',
        headers: auth('a'),
        body: '{}',
      });
      assert.equal(archive.status, 501);
      const archBody = (await archive.json()) as { code: string };
      assert.equal(archBody.code, 'PM_OPERATION_NOT_IMPLEMENTED');
    });
  });

  it('tasks require authorized parent and inherit ClientCode; ProjectId immutable', async () => {
    await withSpHub({ entitlements: (oid) => (oid === USER_A ? ['ACCG01'] : ['PDG01']) }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '30');
      graph.seed(PROJECTS, {
        Title: 'PDG',
        ClientCode: 'PDG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '31');
      const orphan = await fetch(`${base}/api/pm/tasks`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ title: 'Nope' }),
      });
      assert.equal(orphan.status, 400);
      const cross = await fetch(`${base}/api/pm/tasks`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ title: 'Nope', projectId: '31' }),
      });
      assert.equal(cross.status, 404);
      const ok = await fetch(`${base}/api/pm/tasks`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ title: 'Do work', projectId: '30' }),
      });
      assert.equal(ok.status, 200);
      const task = (await ok.json()) as { task: { id: string; etag: string; clientId?: string } };
      assert.equal(task.task.clientId, 'ACCG01');
      const move = await fetch(`${base}/api/pm/tasks/${task.task.id}`, {
        method: 'PATCH',
        headers: { ...auth('a'), 'if-match': task.task.etag },
        body: JSON.stringify({ projectId: '31' }),
      });
      assert.equal(move.status, 400);
    });
  });

  it('inconsistent task/project ClientCode fails closed', async () => {
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '40');
      graph.seed(TASKS, {
        Title: 'Bad',
        ProjectIdLookupId: 40,
        ClientCode: 'PDG01',
        TaskStatus: 'In Progress',
        Priority: 'High',
        OwnerEmail: 'x@hvcg.example',
      }, '41');
      const res = await fetch(`${base}/api/pm/tasks/41`, { headers: auth('a') });
      assert.equal(res.status, 409);
    });
  });

  it('milestones require project authorization', async () => {
    await withSpHub({ entitlements: (oid) => (oid === USER_A ? ['ACCG01'] : ['PDG01']) }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '50');
      const denied = await fetch(`${base}/api/pm/milestones`, {
        method: 'POST',
        headers: auth('b'),
        body: JSON.stringify({ title: 'M', projectId: '50' }),
      });
      assert.equal(denied.status, 404);
      const ok = await fetch(`${base}/api/pm/milestones`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({ title: 'Kickoff', projectId: '50' }),
      });
      assert.equal(ok.status, 200);
    });
  });

  it('My Work uses oid directory mail, ignores owner query, fails closed on directory errors', async () => {
    const mail = `${USER_A.slice(0, 8)}@hvcg.example`;
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }, '60');
      graph.seed(TASKS, {
        Title: 'Mine',
        ProjectIdLookupId: 60,
        ClientCode: 'ACCG01',
        TaskStatus: 'In Progress',
        Priority: 'High',
        OwnerEmail: mail,
        DueDate: '2020-01-01',
      }, '61');
      graph.seed(TASKS, {
        Title: 'Other person',
        ProjectIdLookupId: 60,
        ClientCode: 'ACCG01',
        TaskStatus: 'In Progress',
        Priority: 'High',
        OwnerEmail: 'other@hvcg.example',
      }, '62');
      const mine = await fetch(`${base}/api/pm/my-work?ownerId=person-manny`, { headers: auth('a') });
      assert.equal(mine.status, 200);
      const body = (await mine.json()) as { myWork: { overdue: Array<{ id: string }> } };
      assert.deepEqual(body.myWork.overdue.map((t) => t.id), ['61']);
    });

    const failLookup: UserBasicLookup = async () => ({ ok: false, reason: 'failed' });
    await withSpHub({ entitlements: () => ['ACCG01'], lookup: failLookup }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/my-work`, { headers: auth('a') });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { code: string };
      assert.equal(body.code, 'PM_DIRECTORY_UNAVAILABLE');
    });

    const emptyLookup: UserBasicLookup = async (oid) => ({
      ok: false,
      reason: 'empty',
    });
    await withSpHub({ entitlements: () => ['ACCG01'], lookup: emptyLookup }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/my-work`, { headers: auth('a') });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { code: string };
      assert.equal(body.code, 'PM_IDENTITY_UNMAPPED');
    });
  });

  it('My Work UPN fallback and command center / portfolio stay in scope', async () => {
    const upnLookup: UserBasicLookup = async (oid) => ({
      ok: true,
      profile: { id: oid, mail: null, userPrincipalName: 'upn-user@hvcg.example' },
    });
    await withSpHub({ entitlements: () => ['ACCG01'], lookup: upnLookup }, async ({ base, graph }) => {
      graph.seed(PROJECTS, {
        Title: 'Alder',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Red',
        Priority: 'High',
      }, '70');
      graph.seed(PROJECTS, {
        Title: 'Secret',
        ClientCode: 'PDG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Red',
        Priority: 'High',
      }, '71');
      graph.seed(TASKS, {
        Title: 'UPN task',
        ProjectIdLookupId: 70,
        ClientCode: 'ACCG01',
        TaskStatus: 'In Progress',
        Priority: 'High',
        OwnerEmail: 'upn-user@hvcg.example',
      }, '72');
      const mine = await fetch(`${base}/api/pm/my-work`, { headers: auth('a') });
      const myBody = (await mine.json()) as { myWork: { today: unknown[]; overdue: unknown[] } };
      assert.equal(mine.status, 200);
      const cc = await fetch(`${base}/api/pm/command-center`, { headers: auth('a') });
      const ccBody = (await cc.json()) as {
        commandCenter: {
          businessHealth: { activeProjects: number };
          deferred: Record<string, string>;
          myDay: { overdue: unknown[] };
          criticalAlerts: unknown[];
        };
      };
      assert.equal(ccBody.commandCenter.businessHealth.activeProjects, 1);
      assert.equal(ccBody.commandCenter.deferred.decisions, 'PM_COLLECTION_NOT_IN_MVP');
      assert.ok(Array.isArray(ccBody.commandCenter.myDay.overdue));
      assert.ok(Array.isArray(ccBody.commandCenter.criticalAlerts));
      const port = await fetch(`${base}/api/pm/portfolio`, { headers: auth('a') });
      const portBody = (await port.json()) as { portfolio: Array<{ id: string }> };
      assert.deepEqual(portBody.portfolio.map((p) => p.id), ['70']);
    });
  });

  it('Command Center Graph 403 is a permission rejection, not an empty success', async () => {
    class ForbiddenGraph extends MemoryGraph {
      async listItems(): Promise<GraphListPage> {
        throw new PmHttpError(
          503,
          'PM_BACKEND_UNAVAILABLE',
          'SharePoint PM permission or token was rejected.',
          'unavailable',
        );
      }
    }
    await withSpHub({ entitlements: () => ['ACCG01'], graph: new ForbiddenGraph() }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/command-center`, { headers: auth('a') });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { message?: string; code?: string };
      assert.equal(body.code, 'PM_BACKEND_UNAVAILABLE');
      assert.match(String(body.message), /permission or token was rejected/);
    });
  });

  it('clients directory is SharePoint HVCG_Clients by ClientCode, not Client 360', async () => {
    await withSpHub({ entitlements: (oid) => (oid === USER_A ? ['ACCG01'] : []) }, async ({ base }) => {
      const listed = await fetch(`${base}/api/pm/clients`, { headers: auth('a') });
      assert.equal(listed.status, 200);
      const body = (await listed.json()) as {
        source: string;
        clients: Array<{ id: string; clientCode: string; displayName: string }>;
      };
      assert.equal(body.source, 'sharepoint');
      assert.deepEqual(
        body.clients.map((c) => c.clientCode),
        ['ACCG01'],
      );
      assert.equal(body.clients[0].id, 'ACCG01');
      assert.equal(body.clients[0].displayName, 'Alder & Co.');
      const other = await fetch(`${base}/api/pm/clients/PDG01`, { headers: auth('a') });
      assert.equal(other.status, 404);
      const mine = await fetch(`${base}/api/pm/clients/ACCG01`, { headers: auth('a') });
      assert.equal(mine.status, 200);
      const mineBody = (await mine.json()) as { client: { clientCode: string } };
      assert.equal(mineBody.client.clientCode, 'ACCG01');
      const workspace = await fetch(`${base}/api/pm/clients/ACCG01/workspace`, { headers: auth('a') });
      assert.equal(workspace.status, 200);
      const wsBody = (await workspace.json()) as {
        workspace: {
          kind: string;
          client: { clientCode: string };
          completeness: Record<string, { status: string; queried: boolean }>;
          communications: { queried: boolean; status: string };
        };
      };
      assert.equal(wsBody.workspace.kind, 'client_workspace_v1');
      assert.equal(wsBody.workspace.client.clientCode, 'ACCG01');
      assert.equal(wsBody.workspace.completeness.identity.status, 'COMPLETE');
      assert.equal(wsBody.workspace.communications.queried, false);
      assert.equal(wsBody.workspace.communications.status, 'PARTIAL_SOURCE_DATA_NOT_FOUND');
      const leaked = await fetch(`${base}/api/pm/clients/PDG01/workspace`, { headers: auth('a') });
      assert.equal(leaked.status, 404);
      const searchMine = await fetch(`${base}/api/pm/search?q=Alder`, { headers: auth('a') });
      assert.equal(searchMine.status, 200);
      const searchBody = (await searchMine.json()) as { results: Array<{ clientCode?: string; kind: string }> };
      assert.ok(searchBody.results.every((r) => !r.clientCode || r.clientCode === 'ACCG01'));
      assert.ok(searchBody.results.some((r) => r.kind === 'client' && r.clientCode === 'ACCG01'));
      const searchOther = await fetch(`${base}/api/pm/search?q=PDG`, { headers: auth('a') });
      const otherBody = (await searchOther.json()) as { results: Array<{ clientCode?: string }> };
      assert.equal(otherBody.results.some((r) => r.clientCode === 'PDG01'), false);
      const c360 = await fetch(`${base}/api/client360`, { headers: auth('a') });
      assert.equal(c360.status, 403);
    });
  });

  it('deferred routes are not implemented and do not fall back to JSON', async () => {
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base, dataDir }) => {
      for (const path of ['/api/pm/inbox', '/api/pm/notes', '/api/pm/populate', '/api/pm/quick-capture']) {
        const res = await fetch(`${base}${path}`, { headers: auth('a') });
        assert.equal(res.status, 501, path);
        const body = (await res.json()) as { code: string; projects?: unknown };
        assert.equal(body.code, 'PM_OPERATION_NOT_IMPLEMENTED');
        assert.equal(body.projects, undefined);
      }
      assert.equal(existsSync(join(dataDir, 'pm-store.json')), false);
    });
  });

  it('pagination follows in-origin nextLink', async () => {
    const graph = new MemoryGraph();
    graph.pageSize = 2;
    await withSpHub({ entitlements: () => ['ACCG01'], graph }, async ({ base }) => {
      for (let i = 0; i < 5; i++) {
        graph.seed(PROJECTS, {
          Title: `P${i}`,
          ClientCode: 'ACCG01',
          IsInternalProject: false,
          ProjectStatus: 'In Progress',
          ProjectHealth: 'Green',
          Priority: 'Medium',
        });
      }
      const res = await fetch(`${base}/api/pm/projects`, { headers: auth('a') });
      const body = (await res.json()) as { projects: Array<{ name: string }> };
      assert.equal(body.projects.length, 5);
    });
  });
});

const LEADS = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
const CONTACTS = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
const OPPORTUNITIES = 'ffffffff-ffff-4fff-8fff-fffffffffff2';

describe('SharePoint HVCG_Leads operator queue', () => {
  async function withLeads(
    fn: (ctx: { base: string; graph: MemoryGraph }) => Promise<void>,
    entitlements: (oid: string | undefined) => string[] = () => ['ACCG01'],
  ) {
    const prevLeads = process.env.INTEGRATION_PM_LEADS_LIST_ID;
    process.env.INTEGRATION_PM_LEADS_LIST_ID = LEADS;
    const graph = new MemoryGraph();
    try {
      await withSpHub({ entitlements, graph }, fn);
    } finally {
      if (prevLeads === undefined) delete process.env.INTEGRATION_PM_LEADS_LIST_ID;
      else process.env.INTEGRATION_PM_LEADS_LIST_ID = prevLeads;
    }
  }

  async function withCrmLeads(
    fn: (ctx: { base: string; graph: MemoryGraph; dataDir: string }) => Promise<void>,
    entitlements: (oid: string | undefined) => string[] = () => ['ACCG01'],
  ) {
    const prev = {
      leads: process.env.INTEGRATION_PM_LEADS_LIST_ID,
      contacts: process.env.INTEGRATION_PM_CONTACTS_LIST_ID,
      opps: process.env.INTEGRATION_PM_OPPORTUNITIES_LIST_ID,
    };
    process.env.INTEGRATION_PM_LEADS_LIST_ID = LEADS;
    process.env.INTEGRATION_PM_CONTACTS_LIST_ID = CONTACTS;
    process.env.INTEGRATION_PM_OPPORTUNITIES_LIST_ID = OPPORTUNITIES;
    const graph = new MemoryGraph();
    try {
      await withSpHub({ entitlements, graph }, fn);
    } finally {
      if (prev.leads === undefined) delete process.env.INTEGRATION_PM_LEADS_LIST_ID;
      else process.env.INTEGRATION_PM_LEADS_LIST_ID = prev.leads;
      if (prev.contacts === undefined) delete process.env.INTEGRATION_PM_CONTACTS_LIST_ID;
      else process.env.INTEGRATION_PM_CONTACTS_LIST_ID = prev.contacts;
      if (prev.opps === undefined) delete process.env.INTEGRATION_PM_OPPORTUNITIES_LIST_ID;
      else process.env.INTEGRATION_PM_OPPORTUNITIES_LIST_ID = prev.opps;
    }
  }

  it('lists unclassified leads for internal staff and surfaces them on Command Center', async () => {
    await withLeads(async ({ base, graph }) => {
      graph.seed(
        LEADS,
        {
          Title: 'Website-EVA inbound',
          ContactName: 'Pat Lead',
          Email: 'pat@example.com',
          Source: 'Website-EVA',
          LeadStatus: 'New',
          OwnerEmail: 'manny@highvaluecapitalgroup.com',
          Notes: JSON.stringify({ nextAction: 'Call Pat about assessment' }),
        },
        '80',
      );
      const listed = await fetch(`${base}/api/pm/leads`, { headers: auth('a') });
      assert.equal(listed.status, 200);
      const body = (await listed.json()) as { leads: Array<{ id: string; status: string; nextAction?: string }> };
      assert.equal(body.leads.length, 1);
      assert.equal(body.leads[0].id, '80');
      assert.equal(body.leads[0].nextAction, 'Call Pat about assessment');
      const cc = await fetch(`${base}/api/pm/command-center`, { headers: auth('a') });
      const ccBody = (await cc.json()) as {
        commandCenter: { myDay: { waitingFollowUps: Array<{ href?: string; id: string }> } };
      };
      assert.equal(ccBody.commandCenter.myDay.waitingFollowUps.some((row) => row.href === '/leads/80'), true);
    });
  });

  it('Administrator and Advisor cannot read unclassified HVCG_Leads', async () => {
    await withLeads(async ({ base, graph }) => {
      graph.seed(LEADS, { Title: 'Internal inbound', LeadStatus: 'New', Email: 'x@example.com' }, '81');
      const admin = await fetch(`${base}/api/pm/leads`, { headers: auth('admin') });
      const adminBody = (await admin.json()) as { leads: unknown[] };
      assert.equal(admin.status, 200);
      assert.equal(adminBody.leads.length, 0);
      const advisor = await fetch(`${base}/api/pm/leads`, { headers: auth('advisor') });
      const advisorBody = (await advisor.json()) as { leads: unknown[] };
      assert.equal(advisorBody.leads.length, 0);
      const one = await fetch(`${base}/api/pm/leads/81`, { headers: auth('admin') });
      assert.equal(one.status, 404);
    });
  });

  it('does not leak a foreign converted lead and rejects Converted PATCH', async () => {
    await withLeads(async ({ base, graph }) => {
      graph.seed(
        LEADS,
        { Title: 'ACCG inbound', LeadStatus: 'New', ClientCode: 'ACCG01', Email: 'a@example.com' },
        '82',
      );
      graph.seed(
        LEADS,
        { Title: 'PDG inbound', LeadStatus: 'Contacted', ClientCode: 'PDG01', Email: 'p@example.com' },
        '83',
      );
      const listed = await fetch(`${base}/api/pm/leads`, { headers: auth('a') });
      const body = (await listed.json()) as { leads: Array<{ id: string; clientCode?: string }> };
      assert.deepEqual(body.leads.map((l) => l.id), ['82']);
      const foreign = await fetch(`${base}/api/pm/leads/83`, { headers: auth('a') });
      assert.equal(foreign.status, 404);
      const mine = await fetch(`${base}/api/pm/leads/82`, { headers: auth('a') });
      const mineBody = (await mine.json()) as { lead: { etag: string } };
      const converted = await fetch(`${base}/api/pm/leads/82`, {
        method: 'PATCH',
        headers: { ...auth('a'), 'if-match': mineBody.lead.etag },
        body: JSON.stringify({ status: 'Converted' }),
      });
      assert.equal(converted.status, 400);
    });
  });

  it('converts a New website lead into Company, Contact, and Discovery Opportunity', async () => {
    await withCrmLeads(async ({ base, graph, dataDir }) => {
      graph.seed(
        LEADS,
        {
          Title: 'Northwind Capital',
          ContactName: 'Pat Lead',
          Email: 'pat@northwind.example',
          Phone: '555-0100',
          Source: 'Website-EVA',
          LeadSourceDetail: 'website-intake',
          LeadStatus: 'New',
          ServiceInterest: 'Assessment',
          EstimatedValue: 15000,
          OwnerEmail: 'manny@highvaluecapitalgroup.com',
          Notes: JSON.stringify({ nextAction: 'Call Pat about assessment' }),
        },
        '84',
      );
      const got = await fetch(`${base}/api/pm/leads/84`, { headers: auth('a') });
      const gotBody = (await got.json()) as { lead: { etag: string } };
      const res = await fetch(`${base}/api/pm/leads/84/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        lead: { status: string; convertedClientId?: string; convertedOpportunityId?: string; source?: string };
        company: { clientCode: string; reused: boolean; displayName: string };
        contact: { email?: string; reused: boolean };
        opportunity: { id: string; stage: string; opportunityType?: string };
        href: string;
        replay: boolean;
        created: { company: boolean; contact: boolean; opportunity: boolean };
      };
      assert.equal(body.lead.status, 'Converted');
      assert.equal(body.lead.clientCode, undefined);
      assert.equal(body.company.reused, false);
      assert.equal(body.company.displayName, 'Northwind Capital');
      assert.equal(body.company.clientStage, 'Prospect');
      assert.equal(body.company.entitlementProvisioned, false);
      assert.equal(body.entitlementProvisioned, false);
      assert.match(body.company.clientCode, /^[A-Z][A-Z0-9]{2,15}$/);
      assert.notEqual(body.company.clientCode, 'ACCG01');
      assert.equal(body.contact.email, 'pat@northwind.example');
      assert.equal(body.opportunity.stage, 'Discovery');
      assert.equal(body.opportunity.opportunityType, 'Assessment');
      assert.equal(body.href, `/opportunities/${body.opportunity.id}`);
      assert.equal(body.created.opportunity, true);
      assert.ok(body.lead.convertedOpportunityId);
      const createdClient = (graph.lists.get(CLIENTS) || []).find(
        (c) => c.fields.ClientCode === body.company.clientCode,
      );
      assert.equal(createdClient?.fields.ClientStage, 'Prospect');
      const createdOpp = (graph.lists.get(OPPORTUNITIES) || [])[0];
      assert.equal(createdOpp?.fields.Probability, undefined);
      assert.equal(createdOpp?.fields.ForecastCategory, undefined);
      assert.equal(createdOpp?.fields.CapitalHandoffStatus, undefined);
      assert.equal(createdOpp?.fields.Stage, 'Discovery');
      assert.equal(createdOpp?.fields.HVCG_IdempotencyKey, 'opp-from-lead|84');
      const opp = await fetch(`${base}/api/pm/opportunities/${body.opportunity.id}`, { headers: auth('a') });
      assert.equal(opp.status, 200);
      const home = await fetch(`${base}/api/pm/command-center`, { headers: auth('a') });
      const homeBody = (await home.json()) as {
        commandCenter: {
          myDay: { waitingFollowUps: Array<{ id: string }> };
          clientAttention: { opportunities: Array<{ href: string; id: string }> };
        };
      };
      assert.equal(
        homeBody.commandCenter.myDay.waitingFollowUps.some((row) => row.id === '84'),
        false,
      );
      assert.ok(
        homeBody.commandCenter.clientAttention.opportunities.some(
          (row) => row.href === `/opportunities/${body.opportunity.id}`,
        ),
      );
      const clientSearch = await fetch(`${base}/api/pm/search?q=Northwind`, { headers: auth('client') });
      const clientSearchBody = (await clientSearch.json()) as { results: Array<{ kind: string; id: string }> };
      assert.equal(
        clientSearchBody.results.some((r) => r.kind === 'opportunity' && r.id === body.opportunity.id),
        false,
      );
      const spoof = await fetch(`${base}/api/pm/leads/84/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({ clientCode: 'ACCG01', company: 'ACCG01' }),
      });
      assert.equal(spoof.status, 200);
      const spoofBody = (await spoof.json()) as { company: { clientCode: string }; opportunity: { id: string }; replay: boolean };
      assert.equal(spoofBody.opportunity.id, body.opportunity.id);
      assert.notEqual(spoofBody.company.clientCode, 'ACCG01');
      const replay = await fetch(`${base}/api/pm/leads/84/convert`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({}),
      });
      assert.equal(replay.status, 200);
      const replayBody = (await replay.json()) as { opportunity: { id: string }; replay: boolean };
      assert.equal(replayBody.opportunity.id, body.opportunity.id);
      assert.equal(replayBody.replay, true);
      const opps = graph.lists.get(OPPORTUNITIES) || [];
      assert.equal(opps.length, 1);
      const store = JSON.parse(readFileSync(join(dataDir, 'integration-store.json'), 'utf8')) as {
        auditEvents: Array<{ action: string }>;
      };
      assert.equal(store.auditEvents.filter((e) => e.action === 'pm_lead_convert').length, 1);
      const admin = await fetch(`${base}/api/pm/leads/84/convert`, {
        method: 'POST',
        headers: auth('admin'),
        body: JSON.stringify({}),
      });
      assert.equal(admin.status, 404);
      const clientDenied = await fetch(`${base}/api/pm/leads/84/convert`, {
        method: 'POST',
        headers: auth('client'),
        body: JSON.stringify({}),
      });
      assert.equal(clientDenied.status, 404);
    });
  });

  it('reuses an existing HVCG_Clients company by title and denies Converted PATCH', async () => {
    await withCrmLeads(async ({ base, graph }) => {
      graph.seed(
        LEADS,
        {
          Title: 'Alder & Co.',
          ContactName: 'Alex Alder',
          Email: 'alex@alder.example',
          Source: 'Website-Funding',
          LeadStatus: 'Contacted',
        },
        '85',
      );
      const got = await fetch(`${base}/api/pm/leads/85`, { headers: auth('a') });
      const gotBody = (await got.json()) as { lead: { etag: string } };
      const res = await fetch(`${base}/api/pm/leads/85/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        company: { clientCode: string; reused: boolean };
        lead: { clientCode?: string; status: string };
      };
      assert.equal(body.company.clientCode, 'ACCG01');
      assert.equal(body.company.reused, true);
      assert.equal(body.lead.clientCode, 'ACCG01');
      const clients = graph.lists.get(CLIENTS) || [];
      assert.equal(clients.filter((c) => c.fields.ClientCode === 'ACCG01').length, 1);
    });
  });

  it('does not grant entitlement and reconciles Graph 503 without duplicating the Opportunity', async () => {
    const entitlementBefore = process.env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS;
    await withCrmLeads(async ({ base, graph }) => {
      graph.seed(
        LEADS,
        {
          Title: 'SYN Conversion Co',
          ContactName: 'Syn Tester',
          Email: 'syn@conversion.example',
          Source: 'Website-EVA',
          LeadStatus: 'New',
        },
        '88',
      );
      const got = await fetch(`${base}/api/pm/leads/88`, { headers: auth('a') });
      const gotBody = (await got.json()) as { lead: { etag: string } };
      graph.failCreateFor.set(OPPORTUNITIES, 503);
      const failed = await fetch(`${base}/api/pm/leads/88/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(failed.status, 503);
      const leadAfterFail = await fetch(`${base}/api/pm/leads/88`, { headers: auth('a') });
      const leadFailBody = (await leadAfterFail.json()) as { lead: { status: string; etag: string } };
      assert.equal(leadFailBody.lead.status, 'New');
      assert.equal((graph.lists.get(OPPORTUNITIES) || []).length, 0);
      assert.equal((graph.lists.get(CLIENTS) || []).some((c) => c.fields.Title === 'SYN Conversion Co'), true);
      graph.failCreateFor.delete(OPPORTUNITIES);
      const retry = await fetch(`${base}/api/pm/leads/88/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': leadFailBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(retry.status, 200);
      const retryBody = (await retry.json()) as {
        opportunity: { id: string };
        created: { company: boolean; opportunity: boolean };
        entitlementProvisioned: boolean;
        company: { clientStage?: string };
      };
      assert.equal(retryBody.created.company, false);
      assert.equal(retryBody.created.opportunity, true);
      assert.equal(retryBody.entitlementProvisioned, false);
      assert.equal(retryBody.company.clientStage, 'Prospect');
      assert.equal((graph.lists.get(OPPORTUNITIES) || []).length, 1);
      graph.failPatchFor.set(LEADS, 503);
      graph.seed(
        LEADS,
        {
          Title: 'SYN Patch Fail Co',
          Email: 'patch@conversion.example',
          Source: 'Website-EVA',
          LeadStatus: 'New',
        },
        '89',
      );
      const lead89 = await fetch(`${base}/api/pm/leads/89`, { headers: auth('a') });
      const lead89Body = (await lead89.json()) as { lead: { etag: string } };
      const patchFail = await fetch(`${base}/api/pm/leads/89/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': lead89Body.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(patchFail.status, 503);
      assert.equal((graph.lists.get(OPPORTUNITIES) || []).length, 2);
      const stillNew = await fetch(`${base}/api/pm/leads/89`, { headers: auth('a') });
      const stillNewBody = (await stillNew.json()) as { lead: { status: string; etag: string } };
      assert.equal(stillNewBody.lead.status, 'New');
      graph.failPatchFor.delete(LEADS);
      const patchRetry = await fetch(`${base}/api/pm/leads/89/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': stillNewBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(patchRetry.status, 200);
      assert.equal((graph.lists.get(OPPORTUNITIES) || []).length, 2);
      const foreign = await fetch(`${base}/api/pm/leads/999/convert`, {
        method: 'POST',
        headers: auth('a'),
        body: JSON.stringify({}),
      });
      assert.equal(foreign.status, 404);
    });
    assert.equal(process.env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS, entitlementBefore);
  });

  it('operates Opportunities with attention states, ETag safety, audit, and no client activation', async () => {
    const entitlementBefore = process.env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS;
    await withCrmLeads(async ({ base, graph, dataDir }) => {
      graph.seed(CLIENTS, { Title: 'SYNTHETIC QA Phase 5G', ClientCode: 'SYNTH01', ClientStage: 'Prospect' }, '90');
      const overdue = graph.seed(
        OPPORTUNITIES,
        {
          Title: 'SYNTHETIC QA Phase 5G — Discovery',
          Stage: 'Discovery',
          WinLossStatus: 'Open',
          ClientIdLookupId: 90,
          OwnerEmail: 'manny@highvaluecapitalgroup.com',
          SalesOwnerEmail: 'manny@highvaluecapitalgroup.com',
          OpportunityType: 'Assessment',
          NextActionNotes: 'Schedule discovery call',
          NextActionDate: '2020-01-01T00:00:00.000Z',
          ExpectedCloseDate: '2030-01-15T00:00:00.000Z',
          Notes: 'Source=Website-EVA; Detail=synthetic-phase-5g',
        },
        '120',
      );
      graph.seed(
        OPPORTUNITIES,
        {
          Title: 'SYNTHETIC QA No Next Action',
          Stage: 'Assessment',
          WinLossStatus: 'Open',
          ClientIdLookupId: 90,
          OpportunityType: 'Advisory Engagement',
        },
        '121',
      );

      const list = await fetch(`${base}/api/pm/opportunities`, { headers: auth('staff') });
      assert.equal(list.status, 200);
      const listBody = (await list.json()) as {
        opportunities: Array<{ id: string; clientStage?: string; attention: { state: string }; nextAction?: string }>;
      };
      assert.deepEqual(listBody.opportunities.map((o) => o.id), ['120', '121']);
      assert.equal(listBody.opportunities[0].clientStage, 'Prospect');
      assert.equal(listBody.opportunities[0].nextAction, 'Schedule discovery call');
      assert.equal(listBody.opportunities[0].attention.state, 'OVERDUE');
      assert.equal(listBody.opportunities[1].attention.state, 'NO_NEXT_ACTION');

      const home = await fetch(`${base}/api/pm/command-center`, { headers: auth('staff') });
      const homeBody = (await home.json()) as {
        commandCenter: {
          criticalAlerts: Array<{ href?: string; title: string }>;
          clientAttention: { opportunities: Array<{ href: string; detail: string }> };
        };
      };
      assert.equal(
        homeBody.commandCenter.criticalAlerts.some((row) => row.href === '/opportunities/120' && row.title.includes('Overdue')),
        true,
      );
      assert.equal(
        homeBody.commandCenter.clientAttention.opportunities.some((row) => row.href === '/opportunities/121' && row.detail.includes('No Next Action')),
        true,
      );

      const patched = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('staff'), 'if-match': overdue.etag },
        body: JSON.stringify({
          stage: 'Proposal',
          ownerEmail: 'operator@highvaluecapitalgroup.com',
          nextAction: 'Send assessment scope',
          nextActionDate: '2030-02-01',
          expectedCloseDate: '2030-03-01',
          requiresExecutiveAttention: true,
          notes: 'Source=Website-EVA; Detail=synthetic-phase-5g; Updated through Atlas',
        }),
      });
      assert.equal(patched.status, 200);
      const patchedBody = (await patched.json()) as {
        opportunity: { stage: string; ownerEmail?: string; nextAction?: string; attention: { state: string }; clientStage?: string };
      };
      assert.equal(patchedBody.opportunity.stage, 'Proposal');
      assert.equal(patchedBody.opportunity.ownerEmail, 'operator@highvaluecapitalgroup.com');
      assert.equal(patchedBody.opportunity.nextAction, 'Send assessment scope');
      assert.equal(patchedBody.opportunity.attention.state, 'NEEDS_MANNY');
      assert.equal(patchedBody.opportunity.clientStage, 'Prospect');
      const item = await graph.getItem(OPPORTUNITIES, '120');
      assert.equal(item?.fields.OwnerEmail, 'operator@highvaluecapitalgroup.com');
      assert.equal(item?.fields.SalesOwnerEmail, 'operator@highvaluecapitalgroup.com');
      assert.equal(item?.fields.NextActionNotes, 'Send assessment scope');
      assert.equal(item?.fields.Stage, 'Proposal');
      assert.equal(item?.fields.ClientStage, undefined);

      const stale = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('staff'), 'if-match': overdue.etag },
        body: JSON.stringify({ nextAction: 'Stale mutation' }),
      });
      assert.equal(stale.status, 412);
      assert.equal(item?.fields.NextActionNotes, 'Send assessment scope');

      graph.failPatchFor.set(OPPORTUNITIES, 503);
      const graphFail = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('staff'), 'if-match': item!.etag },
        body: JSON.stringify({ nextAction: 'Hidden partial write' }),
      });
      assert.equal(graphFail.status, 503);
      assert.equal(item?.fields.NextActionNotes, 'Send assessment scope');
      graph.failPatchFor.delete(OPPORTUNITIES);

      const spoof = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('staff'), 'if-match': item!.etag },
        body: JSON.stringify({ ClientStage: 'Active Client', ClientCode: 'ACCG01', CapitalHandoffStatus: 'Ready' }),
      });
      assert.equal(spoof.status, 400);

      const clientDenied = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('client'), 'if-match': item!.etag },
        body: JSON.stringify({ nextAction: 'Client mutation' }),
      });
      assert.equal(clientDenied.status, 403);

      const won = await fetch(`${base}/api/pm/opportunities/120`, {
        method: 'PATCH',
        headers: { ...auth('staff'), 'if-match': item!.etag },
        body: JSON.stringify({ winLossStatus: 'Won', requiresExecutiveAttention: false }),
      });
      assert.equal(won.status, 200);
      const wonBody = (await won.json()) as { opportunity: { stage: string; winLossStatus?: string; attention: { state: string }; clientStage?: string } };
      assert.equal(wonBody.opportunity.stage, 'Won');
      assert.equal(wonBody.opportunity.winLossStatus, 'Won');
      assert.equal(wonBody.opportunity.attention.state, 'WON');
      assert.equal(wonBody.opportunity.clientStage, 'Prospect');
      const client = await graph.getItem(CLIENTS, '90');
      assert.equal(client?.fields.ClientStage, 'Prospect');
      assert.equal(process.env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS, entitlementBefore);

      const store = JSON.parse(readFileSync(join(dataDir, 'integration-store.json'), 'utf8')) as {
        auditEvents: Array<{ action: string; detail: string }>;
      };
      assert.equal(store.auditEvents.filter((e) => e.action === 'pm_opportunity_patch').length, 2);
      assert.equal(store.auditEvents.some((e) => e.detail.includes('clientStage=Prospect')), true);
    }, () => ['SYNTH01']);
    assert.equal(process.env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS, entitlementBefore);
  });

  it('does not convert Disqualified leads and returns 503 when Opportunities are unconfigured', async () => {
    await withCrmLeads(async ({ base, graph }) => {
      graph.seed(LEADS, { Title: 'Lost inbound', LeadStatus: 'Disqualified', Email: 'x@example.com' }, '86');
      const got = await fetch(`${base}/api/pm/leads/86`, { headers: auth('a') });
      const gotBody = (await got.json()) as { lead: { etag: string } };
      const res = await fetch(`${base}/api/pm/leads/86/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
    });
    await withLeads(async ({ base, graph }) => {
      graph.seed(LEADS, { Title: 'No CRM lists', LeadStatus: 'New', Email: 'y@example.com' }, '87');
      const got = await fetch(`${base}/api/pm/leads/87`, { headers: auth('a') });
      const gotBody = (await got.json()) as { lead: { etag: string } };
      const res = await fetch(`${base}/api/pm/leads/87/convert`, {
        method: 'POST',
        headers: { ...auth('a'), 'if-match': gotBody.lead.etag },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 503);
    });
  });

  it('portfolio blockerCount uses blocked tasks and dataQuality.needsOwnerReview', async () => {
    await withSpHub({ entitlements: () => ['ACCG01'] }, async ({ base, graph }) => {
      graph.seed(
        PROJECTS,
        {
          Title: 'Blocked file',
          ClientCode: 'ACCG01',
          IsInternalProject: false,
          ProjectStatus: 'In Progress',
          ProjectHealth: 'Green',
          Priority: 'High',
        },
        '90',
      );
      graph.seed(
        TASKS,
        {
          Title: 'Waiting on bank',
          ProjectIdLookupId: 90,
          ClientCode: 'ACCG01',
          TaskStatus: 'Blocked',
          Priority: 'High',
          Blockers: 'Bank package',
        },
        '91',
      );
      graph.seed(
        TASKS,
        {
          Title: 'Owner gate',
          ProjectIdLookupId: 90,
          ClientCode: 'ACCG01',
          TaskStatus: 'In Review',
          Priority: 'High',
        },
        '92',
      );
      const res = await fetch(`${base}/api/pm/portfolio`, { headers: auth('a') });
      const body = (await res.json()) as {
        portfolio: Array<{ id: string; blockerCount: number; dataQuality?: { needsOwnerReview?: boolean } }>;
      };
      const row = body.portfolio.find((p) => p.id === '90');
      assert.ok(row);
      assert.equal(row.blockerCount, 1);
      assert.equal(row.dataQuality?.needsOwnerReview, true);
    });
  });
});

describe('SharePoint config does not fall back to JSON', () => {
  it('createAuthorizedPmRepository is null when sharepoint is selected', () => {
    const prev = { ...process.env };
    try {
      process.env.NODE_ENV = 'development';
      process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
      process.env.INTEGRATION_HOST = '127.0.0.1';
      envSharePoint();
      const cfg = loadConfig();
      assert.equal(cfg.pmBackend.mode, 'sharepoint');
      assert.equal(createAuthorizedPmRepository(cfg), null);
    } finally {
      for (const key of Object.keys(process.env)) {
        if (!(key in prev)) delete process.env[key];
      }
      Object.assign(process.env, prev);
    }
  });
});
