/**
 * W2I-R1 list-walk availability.
 * Truncation stays fail-closed. Optional lists do not zero a finished file index.
 * Communications truncation is documents=SOURCE_UNAVAILABLE and is not cached.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository, createSharePointPmService } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { composeClientTruth, workspaceSnapshotFromPayload } from '../src/pm/commercialContext/clientTruth.ts';
import { ListWalkTruncatedError, PmHttpError, toErrorBody } from '../src/pm/sharepoint/errors.ts';
import { createGraphTransport, type GraphListItem, type GraphListPage, type PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { createListItemCache } from '../src/pm/sharepoint/listCache.ts';
import { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { SharePointPmSettings } from '../src/pm/sharepoint/settings.ts';
import { buildSharePointClientWorkspace } from '../src/pm/sharepoint/workspace.ts';
import { FILE_INDEX_MARKER } from '../src/pm/sharepoint/fabric/fileIndex.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const MEETINGS = 'ffffffff-ffff-4fff-8fff-fffffffffff4';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const USER_STAFF = '11111111-1111-4111-8111-111111111003';

const ACCG_FILE = 'ACCG indexed correspondence.pdf';
const PDG_FILE = 'PDG secret index.pdf';
const PARTIAL_TITLE = 'cycled partial file.pdf';
const CYCLE_LINK = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${COMMS}/items?$skiptoken=repeat`;

const principal: AtlasPrincipal = {
  userId: USER_STAFF,
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01', 'PDG01', 'HFD01'],
  roles: ['HVCG Team Member'],
};

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: {
    id: oid,
    mail: `${oid.slice(0, 8)}@hvcg.example`,
    userPrincipalName: `${oid.slice(0, 8)}@hvcg.example`,
  },
});

function settings(extra?: Partial<SharePointPmSettings>): SharePointPmSettings {
  return {
    siteId: SITE,
    projectsListId: PROJECTS,
    tasksListId: TASKS,
    milestonesListId: MILESTONES,
    clientsListId: CLIENTS,
    communicationsListId: COMMS,
    meetingsListId: MEETINGS,
    managedIdentityClientId: MI,
    ...extra,
  };
}

function item(id: string, fields: Record<string, unknown>): GraphListItem {
  return { id, etag: `"etag-${id}"`, fields };
}

class WalkGraph implements PmGraphTransport {
  calls = new Map<string, number>();
  mode: 'ok' | 'cycle' | 'page_cap' | 'stall' | 'deny' | 'abort' = 'ok';
  /** Which list id uses mode. Other lists return their seeded rows in one page. */
  modeList = COMMS;
  readonly lists = new Map<string, GraphListItem[]>();

  constructor() {
    this.lists.set(CLIENTS, [
      item('1', { Title: 'ACCG Inc.', ClientCode: 'ACCG01' }),
      item('2', { Title: 'PDG', ClientCode: 'PDG01' }),
    ]);
    this.lists.set(PROJECTS, [
      item('10', {
        Title: 'ACCG weekly operating file',
        ClientCode: 'ACCG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }),
      item('11', {
        Title: 'PDG secret work',
        ClientCode: 'PDG01',
        IsInternalProject: false,
        ProjectStatus: 'In Progress',
        ProjectHealth: 'Green',
        Priority: 'Medium',
      }),
    ]);
    this.lists.set(TASKS, [
      item('20', {
        Title: 'ACCG overdue blocked follow-up',
        ProjectIdLookupId: 10,
        ClientCode: 'ACCG01',
        TaskStatus: 'Blocked',
        Priority: 'High',
      }),
    ]);
    this.lists.set(MILESTONES, []);
    this.lists.set(COMMS, [
      item('31', {
        Title: ACCG_FILE,
        ClientCode: 'ACCG01',
        Summary: FILE_INDEX_MARKER,
        SourceItemId: 'file:accg-indexed-correspondence',
      }),
      item('32', {
        Title: PDG_FILE,
        ClientCode: 'PDG01',
        Summary: FILE_INDEX_MARKER,
        SourceItemId: 'file:pdg-secret',
      }),
    ]);
    this.lists.set(MEETINGS, [item('40', { Title: 'ACCG kickoff', ClientCode: 'ACCG01', MeetingDate: '2026-09-01' })]);
  }

  async listItems(listId: string, opts?: { nextLink?: string }): Promise<GraphListPage> {
    const n = (this.calls.get(listId) || 0) + 1;
    this.calls.set(listId, n);
    if (listId !== this.modeList || this.mode === 'ok') {
      if (opts?.nextLink) return { items: [] };
      return { items: this.lists.get(listId) || [] };
    }
    if (this.mode === 'deny') throw new PmHttpError(403, 'forbidden', 'list rejected');
    if (this.mode === 'abort') throw new PmHttpError(503, 'PM_BACKEND_UNAVAILABLE', 'SharePoint PM Graph transport failed (HTTP 0).');
    if (this.mode === 'cycle') {
      return {
        items: [
          item(`partial-${n}`, {
            Title: PARTIAL_TITLE,
            ClientCode: 'ACCG01',
            Summary: FILE_INDEX_MARKER,
            SourceItemId: `file:partial-${n}`,
          }),
        ],
        nextLink: CYCLE_LINK,
      };
    }
    if (this.mode === 'stall') {
      const link = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${listId}/items?$skiptoken=stall-${n}`;
      return {
        items: [item('same-row', { Title: PARTIAL_TITLE, ClientCode: 'ACCG01', Summary: FILE_INDEX_MARKER })],
        nextLink: link,
      };
    }
    const link = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${listId}/items?$skiptoken=page-${n}`;
    return {
      items: [item(`page-${n}`, { Title: PARTIAL_TITLE, ClientCode: 'ACCG01', Summary: FILE_INDEX_MARKER })],
      nextLink: link,
    };
  }

  async getItem(): Promise<GraphListItem | null> {
    return null;
  }

  async createItem(): Promise<GraphListItem> {
    throw new PmHttpError(403, 'forbidden', 'read-only');
  }

  async patchItemFields(): Promise<GraphListItem> {
    throw new PmHttpError(403, 'forbidden', 'read-only');
  }
}

function serviceFor(graph: WalkGraph, cacheTtl = 60_000, extra?: Partial<SharePointPmSettings>) {
  return new SharePointPmService(settings(extra), graph, lookupOk, createListItemCache({ ttlMs: cacheTtl }));
}

function truthFor(workspace: Awaited<ReturnType<typeof buildSharePointClientWorkspace>>) {
  const snapshot = workspaceSnapshotFromPayload(workspace);
  const truth = composeClientTruth({ clientCode: 'ACCG01', workspace: snapshot });
  assert.equal('failClosed' in truth, false);
  if ('failClosed' in truth) throw new Error('unexpected fail closed');
  return { snapshot, truth };
}

describe('W2I-R1 list walk diagnostics and isolation', () => {
  it('503 body names the list, reason, and pagesFetched and omits links, tokens, and titles', () => {
    const err = new ListWalkTruncatedError({
      reason: 'page_cap',
      listKey: 'HVCG_Communications',
      pagesFetched: 80,
    });
    const body = toErrorBody(err);
    assert.equal(body.error, 'LIST_WALK_TRUNCATED');
    assert.equal(body.code, 'LIST_WALK_TRUNCATED');
    assert.equal(body.listDisplayName, 'HVCG_Communications');
    assert.equal(body.listKey, 'HVCG_Communications');
    assert.equal(body.reason, 'page_cap');
    assert.equal(body.pagesFetched, 80);
    const encoded = JSON.stringify(body);
    assert.equal(/skiptoken|nextLink|Bearer|@odata|PARTIAL_TITLE|cycled partial/i.test(encoded), false);
    assert.equal(/https?:\/\//.test(encoded), false);
    const poisoned = toErrorBody(
      new ListWalkTruncatedError({
        reason: 'repeated_next_link',
        listKey: 'https://graph.microsoft.com/v1.0/sites/x/lists/y/items?$skiptoken=secret',
        pagesFetched: 2,
      }),
    );
    assert.equal(poisoned.listKey, 'configured_list');
    assert.equal(/skiptoken|graph\.microsoft/.test(JSON.stringify(poisoned)), false);
  });

  it('follows distinct nextLinks and does not restart on the first page', async () => {
    const urls: Array<string | undefined> = [];
    const page2 = `https://GRAPH.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${COMMS}/items?$skiptoken=abc%2Bdef%3D%3D`;
    const graph: PmGraphTransport = {
      async listItems(listId, opts) {
        urls.push(opts?.nextLink);
        if (listId !== COMMS) return { items: [] };
        if (!opts?.nextLink) {
          return {
            items: [item('1', { Title: 'A', ClientCode: 'ACCG01', Summary: FILE_INDEX_MARKER, SourceItemId: 'file:a' })],
            nextLink: page2,
          };
        }
        assert.equal(opts.nextLink, page2);
        return {
          items: [item('2', { Title: ACCG_FILE, ClientCode: 'ACCG01', Summary: FILE_INDEX_MARKER, SourceItemId: 'file:b' })],
        };
      },
      async getItem() {
        return null;
      },
      async createItem() {
        throw new Error('no');
      },
      async patchItemFields() {
        throw new Error('no');
      },
    };
    const service = new SharePointPmService(settings({ meetingsListId: undefined }), graph, lookupOk, createListItemCache({ ttlMs: 0 }));
    const rows = await service.listWorkspaceCollections(principal, 'ACCG01');
    assert.equal(rows.communications.status, 'COMPLETE');
    assert.equal(rows.communications.items.some((row) => row.title === ACCG_FILE), true);
    assert.equal(urls.filter((url) => url === page2).length, 1);
    assert.equal(urls[0], undefined);
  });

  it('requests the Graph nextLink unchanged when the transport would otherwise rewrite it', async () => {
    const nextLink = `https://GRAPH.microsoft.com/v1.0/sites/${encodeURIComponent(SITE)}/lists/${CLIENTS}/items?$skiptoken=abc%2Bdef%3D%3D`;
    const fetched: string[] = [];
    const transport = createGraphTransport(
      settings(),
      { getToken: async () => 'token-must-not-leak' },
      {
        fetch: async (input) => {
          fetched.push(String(input));
          if (fetched.length === 1) {
            return new Response(
              JSON.stringify({
                value: [{ id: '1', fields: { Title: 'ACCG Inc.', ClientCode: 'ACCG01' } }],
                '@odata.nextLink': nextLink,
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            );
          }
          return new Response(JSON.stringify({ value: [{ id: '9', fields: { Title: 'tail', ClientCode: 'ACCG01' } }] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        },
      },
    );
    const service = new SharePointPmService(settings(), transport, lookupOk, createListItemCache({ ttlMs: 0 }));
    const clients = await service.listClientHints();
    assert.ok(clients.some((row) => row.clientCode === 'ACCG01'));
    assert.equal(fetched[1], nextLink);
    assert.equal(fetched.some((url) => url.includes('token-must-not-leak')), false);
  });

  it('repeated nextLink and a non-advancing page are repeated_next_link and are not cached', async () => {
    for (const mode of ['cycle', 'stall'] as const) {
      const graph = new WalkGraph();
      graph.mode = mode;
      graph.modeList = COMMS;
      const service = serviceFor(graph);
      const workspace = await buildSharePointClientWorkspace(service, principal, 'ACCG01');
      assert.equal(workspace.documents.availability, 'SOURCE_UNAVAILABLE');
      assert.equal(workspace.documents.status, 'SOURCE_UNAVAILABLE');
      assert.equal(workspace.documents.items.length, 0);
      assert.equal(JSON.stringify(workspace).includes(PARTIAL_TITLE), false);
      assert.equal(workspace.projects.some((p) => p.name === 'ACCG weekly operating file'), true);
      const after = graph.calls.get(COMMS) || 0;
      assert.ok(after >= 1 && after < 80, `${mode} stops before the page cap (${after})`);
      await buildSharePointClientWorkspace(service, principal, 'ACCG01');
      assert.ok((graph.calls.get(COMMS) || 0) > after, `${mode} must not cache a truncated walk`);
      const { truth } = truthFor(workspace);
      assert.match(truth.documents.summary, /documents=SOURCE_UNAVAILABLE/);
      assert.equal(/documents=MISSING/.test(truth.documents.summary), false);
      assert.equal(truth.documents.completeness === 'INDEXED', false);
      assert.equal(truth.canExecute, false);
      assert.equal(truth.capitalSubmit, false);
      assert.equal(truth.globalAutoRespond, false);
      assert.equal(GLOBAL_AUTO_RESPOND, false);
    }
  });

  it('page_cap names HVCG_Communications, stays at 80 pages, and is not cached as complete', async () => {
    const graph = new WalkGraph();
    graph.mode = 'page_cap';
    graph.modeList = COMMS;
    const service = serviceFor(graph);
    const workspace = await buildSharePointClientWorkspace(service, principal, 'ACCG01');
    assert.equal(workspace.communications.status, 'SOURCE_UNAVAILABLE');
    assert.match(workspace.communications.reason || '', /HVCG_Communications/);
    assert.match(workspace.communications.reason || '', /page_cap/);
    assert.match(workspace.communications.reason || '', /pagesFetched=80/);
    assert.equal(graph.calls.get(COMMS), 80);
    assert.equal(workspace.documents.availability, 'SOURCE_UNAVAILABLE');
    assert.equal(JSON.stringify(workspace).includes(PARTIAL_TITLE), false);
    const after = graph.calls.get(COMMS) || 0;
    await service.listWorkspaceCollections(principal, 'ACCG01');
    assert.equal(graph.calls.get(COMMS), after + 80);
  });

  it('clients, projects, and tasks truncation still fails the workspace with a named 503', async () => {
    for (const [listId, listKey] of [
      [CLIENTS, 'HVCG_Clients'],
      [PROJECTS, 'HVCG_Projects'],
      [TASKS, 'HVCG_Tasks'],
    ] as const) {
      const graph = new WalkGraph();
      graph.mode = 'cycle';
      graph.modeList = listId;
      const service = serviceFor(graph);
      await assert.rejects(
        () => buildSharePointClientWorkspace(service, principal, 'ACCG01'),
        (err: unknown) => {
          assert.ok(err instanceof ListWalkTruncatedError);
          assert.equal(err.status, 503);
          assert.equal(err.listKey, listKey);
          assert.equal(err.reason, 'repeated_next_link');
          const body = toErrorBody(err);
          assert.equal(body.listDisplayName, listKey);
          assert.equal(body.reason, 'repeated_next_link');
          assert.equal(typeof body.pagesFetched, 'number');
          assert.ok((body.pagesFetched as number) > 0);
          assert.equal(/skiptoken|https?:\/\//.test(JSON.stringify(body)), false);
          return true;
        },
      );
    }
  });

  it('optional meetings truncation leaves a finished communications index INDEXED', async () => {
    const graph = new WalkGraph();
    graph.mode = 'page_cap';
    graph.modeList = MEETINGS;
    const service = serviceFor(graph);
    const workspace = await buildSharePointClientWorkspace(service, principal, 'ACCG01');
    assert.equal(workspace.meetings.status, 'SOURCE_UNAVAILABLE');
    assert.match(workspace.meetings.reason || '', /HVCG_Meetings/);
    assert.match(workspace.meetings.reason || '', /page_cap/);
    assert.equal(workspace.documents.availability, undefined);
    assert.equal(workspace.documents.items.some((row) => row.title === ACCG_FILE), true);
    assert.equal(workspace.documents.items.some((row) => row.title === PDG_FILE), false);
    assert.equal(workspace.projects.some((p) => p.name === 'PDG secret work'), false);
    const { truth } = truthFor(workspace);
    assert.equal(truth.documents.completeness, 'INDEXED');
    assert.match(truth.documents.summary, /documents=INDEXED|Current index: ACCG indexed correspondence\.pdf/);
    assert.equal(truth.documents.summary.includes(PDG_FILE), false);
    assert.equal(/documents=SOURCE_UNAVAILABLE/.test(truth.documents.summary), false);
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
  });

  it('a finished empty file-index is documents=MISSING and a finished entitled index is INDEXED', async () => {
    const empty = new WalkGraph();
    empty.lists.set(COMMS, []);
    const emptyWorkspace = await buildSharePointClientWorkspace(serviceFor(empty, 0), principal, 'ACCG01');
    const emptyTruth = truthFor(emptyWorkspace).truth;
    assert.equal(emptyTruth.documents.completeness, 'MISSING');
    assert.match(emptyTruth.documents.summary, /documents=MISSING/);
    assert.equal(emptyTruth.documents.summary.includes(PDG_FILE), false);

    const filled = new WalkGraph();
    const filledWorkspace = await buildSharePointClientWorkspace(serviceFor(filled, 0), principal, 'ACCG01');
    const filledTruth = truthFor(filledWorkspace).truth;
    assert.equal(filledTruth.documents.completeness, 'INDEXED');
    assert.match(filledTruth.documents.summary, new RegExp(ACCG_FILE));
    assert.equal(filledTruth.documents.summary.includes(PDG_FILE), false);
    assert.equal(filledTruth.canExecute, false);
    assert.equal(filledTruth.capitalSubmit, false);
    assert.equal(filledTruth.globalAutoRespond, false);
  });

  it('communications 401, 403, and transport abort stay SOURCE_UNAVAILABLE without promoting partial rows', async () => {
    for (const mode of ['deny', 'abort'] as const) {
      const graph = new WalkGraph();
      graph.mode = mode;
      graph.modeList = COMMS;
      const workspace = await buildSharePointClientWorkspace(serviceFor(graph, 0), principal, 'ACCG01');
      assert.equal(workspace.documents.availability, 'SOURCE_UNAVAILABLE');
      assert.equal(workspace.documents.items.length, 0);
      assert.equal(workspace.projects.length > 0, true);
      const { truth } = truthFor(workspace);
      assert.match(truth.documents.summary, /documents=SOURCE_UNAVAILABLE/);
      assert.equal(/documents=MISSING/.test(truth.documents.summary), false);
      assert.equal(truth.documents.completeness === 'INDEXED', false);
    }
    const denied = new WalkGraph();
    denied.mode = 'deny';
    denied.listItems = async (listId) => {
      if (listId === COMMS) throw new PmHttpError(401, 'unauthorized', 'SharePoint PM permission or token was rejected (HTTP 401).');
      return { items: denied.lists.get(listId) || [] };
    };
    const workspace = await buildSharePointClientWorkspace(serviceFor(denied, 0), principal, 'ACCG01');
    assert.equal(workspace.documents.availability, 'SOURCE_UNAVAILABLE');
    assert.match(truthFor(workspace).truth.documents.summary, /SOURCE_UNAVAILABLE/);
  });

  it('unknown ClientCode fails closed before a workspace body', async () => {
    const graph = new WalkGraph();
    await assert.rejects(
      () => buildSharePointClientWorkspace(serviceFor(graph, 0), principal, 'NOPE99'),
      (err: unknown) => {
        assert.ok(err instanceof PmHttpError);
        assert.equal(err.status, 404);
        assert.equal(err.code, 'not_found');
        return true;
      },
    );
  });
});

const USER_CLIENT = '11111111-1111-4111-8111-111111111006';

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function verify(token: string): Promise<Record<string, unknown>> {
  if (token === 'staff') return { oid: USER_STAFF, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  if (token === 'client') return { oid: USER_CLIENT, roles: ['Client Executive'], scp: 'access_as_user' };
  const err = new Error('invalid') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

async function withHub(
  graph: WalkGraph,
  fn: (base: string) => Promise<void>,
  extraEnv?: Record<string, string>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-w2i-r1-'));
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
  process.env.INTEGRATION_PM_MEETINGS_LIST_ID = MEETINGS;
  process.env.AZURE_CLIENT_ID = MI;
  process.env.INTEGRATION_PM_LIST_CACHE_TTL_MS = '60000';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (extraEnv) Object.assign(process.env, extraEnv);
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: verify,
    resolveAllowedClientIds: async () => ['ACCG01', 'PDG01', 'HFD01'],
    lookupUserBasic: lookupOk,
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
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  }
}

async function ask(base: string, question: string) {
  const url = new URL(`${base}/operator/runtime.json`);
  url.searchParams.set('question', question);
  url.searchParams.set('client', 'ACCG01');
  const res = await fetch(url, { headers: auth('staff') });
  const body = (await res.json()) as {
    workflowAnswer?: string;
    runtime?: { workspaceTruth?: string; canExecute?: boolean; toolsInvoked?: string[] };
  };
  return { status: res.status, body };
}

describe('W2I-R1 workspace route honesty', () => {
  it('unknown ClientCode is 404 and a required-list truncation 503 names the list', async () => {
    const graph = new WalkGraph();
    graph.mode = 'cycle';
    graph.modeList = CLIENTS;
    await withHub(graph, async (base) => {
      const unknown = await fetch(`${base}/api/pm/clients/NOPE99/workspace`, { headers: auth('staff') });
      assert.equal(unknown.status, 404);
      const unknownBody = await unknown.json();
      assert.equal(JSON.stringify(unknownBody).includes('ACCG'), false);

      const truncated = await fetch(`${base}/api/pm/clients/ACCG01/workspace`, { headers: auth('staff') });
      assert.equal(truncated.status, 503);
      const body = (await truncated.json()) as Record<string, unknown>;
      assert.equal(body.code, 'LIST_WALK_TRUNCATED');
      assert.equal(body.listDisplayName, 'HVCG_Clients');
      assert.equal(body.listKey, 'HVCG_Clients');
      assert.equal(body.reason, 'repeated_next_link');
      assert.equal(typeof body.pagesFetched, 'number');
      assert.ok((body.pagesFetched as number) > 0);
      const encoded = JSON.stringify(body);
      assert.equal(/skiptoken|nextLink|Bearer|token-must|https?:\/\//i.test(encoded), false);
      assert.equal(encoded.includes(PARTIAL_TITLE), false);
      assert.equal(encoded.includes(PDG_FILE), false);
    });
  });

  it('communications page_cap keeps documents SOURCE_UNAVAILABLE and uncached; meetings truncation does not', async () => {
    const capped = new WalkGraph();
    capped.mode = 'page_cap';
    capped.modeList = COMMS;
    await withHub(capped, async (base) => {
      const first = await ask(base, 'What documents exist for ACCG?');
      assert.equal(first.status, 200);
      assert.equal(first.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
      assert.match(first.body.workflowAnswer || '', /documents=SOURCE_UNAVAILABLE/);
      assert.match(first.body.workflowAnswer || '', /will not invent files/i);
      assert.match(first.body.workflowAnswer || '', /canExecute=false/);
      assert.match(first.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.match(first.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
      assert.equal((first.body.workflowAnswer || '').includes(PARTIAL_TITLE), false);
      assert.equal((first.body.workflowAnswer || '').includes(PDG_FILE), false);
      assert.equal(/documents=INDEXED|documents=MISSING/.test(first.body.workflowAnswer || ''), false);
      const after = capped.calls.get(COMMS) || 0;
      assert.equal(after, 80);
      const second = await ask(base, 'Documents');
      assert.equal(second.body.runtime?.workspaceTruth, 'SOURCE_UNAVAILABLE');
      assert.ok((capped.calls.get(COMMS) || 0) > after);

      const ws = await fetch(`${base}/api/pm/clients/ACCG01/workspace`, { headers: auth('staff') });
      assert.equal(ws.status, 200);
      const wsBody = (await ws.json()) as {
        workspace: {
          documents: { availability?: string; items: Array<{ title: string }> };
          projects: Array<{ name: string }>;
        };
      };
      assert.equal(wsBody.workspace.documents.availability, 'SOURCE_UNAVAILABLE');
      assert.equal(wsBody.workspace.documents.items.some((row) => row.title === PARTIAL_TITLE), false);
      assert.equal(wsBody.workspace.projects.some((row) => row.name === 'PDG secret work'), false);
    });

    const meetings = new WalkGraph();
    meetings.mode = 'page_cap';
    meetings.modeList = MEETINGS;
    await withHub(meetings, async (base) => {
      const documents = await ask(base, 'What documents exist for ACCG?');
      assert.equal(documents.status, 200);
      assert.equal(documents.body.runtime?.workspaceTruth, undefined);
      assert.match(documents.body.workflowAnswer || '', /documents=INDEXED/);
      assert.match(documents.body.workflowAnswer || '', new RegExp(ACCG_FILE));
      assert.equal((documents.body.workflowAnswer || '').includes(PDG_FILE), false);
      assert.equal(/documents=SOURCE_UNAVAILABLE/.test(documents.body.workflowAnswer || ''), false);
      assert.match(documents.body.workflowAnswer || '', /canExecute=false/);
      assert.match(documents.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.equal(GLOBAL_AUTO_RESPOND, false);
      const ws = await fetch(`${base}/api/pm/clients/ACCG01/workspace`, { headers: auth('staff') });
      const wsBody = (await ws.json()) as {
        workspace: { meetings: { status: string; reason?: string }; documents: { availability?: string } };
      };
      assert.equal(wsBody.workspace.meetings.status, 'SOURCE_UNAVAILABLE');
      assert.match(wsBody.workspace.meetings.reason || '', /HVCG_Meetings/);
      assert.equal(wsBody.workspace.documents.availability, undefined);
    });
  });

  it('finished empty and entitled file-index answers stay MISSING and INDEXED', async () => {
    const empty = new WalkGraph();
    empty.lists.set(COMMS, []);
    await withHub(empty, async (base) => {
      const documents = await ask(base, 'What documents exist for ACCG?');
      assert.match(documents.body.workflowAnswer || '', /documents=MISSING/);
      assert.equal(/documents=SOURCE_UNAVAILABLE|documents=INDEXED/.test(documents.body.workflowAnswer || ''), false);
      assert.equal((documents.body.workflowAnswer || '').includes(PDG_FILE), false);
      assert.match(documents.body.workflowAnswer || '', /canExecute=false/);
    });

    const filled = new WalkGraph();
    await withHub(filled, async (base) => {
      const documents = await ask(base, 'Documents');
      assert.match(documents.body.workflowAnswer || '', /documents=INDEXED/);
      assert.match(documents.body.workflowAnswer || '', new RegExp(ACCG_FILE));
      assert.equal((documents.body.workflowAnswer || '').includes(PDG_FILE), false);
      assert.match(documents.body.workflowAnswer || '', /GLOBAL_AUTO_RESPOND=false/);
      assert.match(documents.body.workflowAnswer || '', /capitalSubmit=false/);
      assert.match(documents.body.workflowAnswer || '', /canExecute=false/);
    });
  });
});
