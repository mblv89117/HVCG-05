import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import {
  capabilityForPmList,
  createGraphTransport,
  GRAPH_HOST,
  GRAPH_ORIGIN,
  parsePmGraphListItemsUrl,
  type PmGraphResourceAllowlist,
} from '../src/pm/sharepoint/graph.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const RISKS = 'adb19ed2-7243-4317-8ef0-81c42c31df11';
const RANDOM = '99999999-9999-4999-8999-999999999999';
const OTHER_SITE =
  'other.sharepoint.com,33333333-3333-4333-8333-333333333033,44444444-4444-4444-8444-444444444044';
const ACCESS_TOKEN = 'test-access-token-sentinel-do-not-leak';
const IDENTITY_HEADER = 'test-identity-header-sentinel-do-not-leak';

const ALLOWLIST: PmGraphResourceAllowlist = {
  siteId: SITE,
  projectsListId: PROJECTS,
  tasksListId: TASKS,
  milestonesListId: MILESTONES,
  clientsListId: CLIENTS,
};

function itemsUrl(listId: string, extra = ''): string {
  return `${GRAPH_ORIGIN}/v1.0/sites/${encodeURIComponent(SITE)}/lists/${encodeURIComponent(listId)}/items${extra}`;
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
  });
}

function redirectResponse(status: number, location: string): Response {
  return new Response(null, { status, headers: { location } });
}

function assertSanitized(err: unknown): asserts err is PmHttpError {
  assert.ok(err instanceof PmHttpError);
  const blob = `${err.message}\n${err.stack || ''}\n${err.code}\n${JSON.stringify({ code: err.code, message: err.message })}`;
  assert.equal(blob.includes(ACCESS_TOKEN), false);
  assert.equal(blob.toLowerCase().includes('authorization'), false);
  assert.equal(blob.includes('Bearer '), false);
  assert.equal(blob.includes(IDENTITY_HEADER), false);
}

describe('PM Graph transport resource allowlist', () => {
  it('accepts the four configured lists and rejects any other list before Graph', async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const transport = createGraphTransport(
      ALLOWLIST,
      {
        getToken: async () => {
          tokenCalls += 1;
          return ACCESS_TOKEN;
        },
      },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(200, { value: [] });
        },
      },
    );

    assert.equal(capabilityForPmList(ALLOWLIST, PROJECTS), 'write');
    assert.equal(capabilityForPmList(ALLOWLIST, TASKS), 'write');
    assert.equal(capabilityForPmList(ALLOWLIST, MILESTONES), 'write');
    assert.equal(capabilityForPmList(ALLOWLIST, CLIENTS), 'write');

    await transport.listItems(PROJECTS);
    await transport.listItems(TASKS);
    await transport.listItems(MILESTONES);
    await transport.listItems(CLIENTS);
    assert.equal(tokenCalls, 4);
    assert.equal(fetchCalls, 4);

    tokenCalls = 0;
    fetchCalls = 0;
    await assert.rejects(() => transport.listItems(RISKS), (err: unknown) => {
      assertSanitized(err);
      assert.match(err.message, /approved resource allowlist/);
      return true;
    });
    await assert.rejects(() => transport.listItems(RANDOM), /approved resource allowlist/);
    await assert.rejects(() => transport.getItem('ffffffff-ffff-4fff-8fff-fffffffffff1', '1'), /approved resource allowlist/);
    assert.equal(tokenCalls, 0);
    assert.equal(fetchCalls, 0);
  });

  it('allows HVCG_Leads write only when leadsListId is configured', async () => {
    const LEADS = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
    let fetchCalls = 0;
    const withoutLeads = createGraphTransport(ALLOWLIST, { getToken: async () => ACCESS_TOKEN }, {
      fetch: async () => {
        fetchCalls += 1;
        return jsonResponse(200, { value: [] });
      },
    });
    await assert.rejects(() => withoutLeads.listItems(LEADS), /approved resource allowlist/);
    assert.equal(fetchCalls, 0);

    const withLeads = createGraphTransport(
      { ...ALLOWLIST, leadsListId: LEADS },
      { getToken: async () => ACCESS_TOKEN },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(201, { id: '1', fields: { Title: 'Lead' } });
        },
      },
    );
    assert.equal(capabilityForPmList({ ...ALLOWLIST, leadsListId: LEADS }, LEADS), 'write');
    await withLeads.createItem(LEADS, { Title: 'Lead' });
    assert.equal(fetchCalls, 1);
  });
});

describe('PM Graph transport capability matrix', () => {
  it('permits Projects/Tasks/Milestones/Clients selected-list writes and rejects unknown lists', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const transport = createGraphTransport(
      ALLOWLIST,
      { getToken: async () => ACCESS_TOKEN },
      {
        fetch: async (input, init) => {
          calls.push({ url: String(input), method: String(init?.method || 'GET') });
          if (String(init?.method) === 'POST') {
            return jsonResponse(201, { id: '1', fields: { Title: 'x' } });
          }
          if (String(init?.method) === 'PATCH') {
            return jsonResponse(200, { Title: 'y' });
          }
          return jsonResponse(200, { id: '1', fields: { Title: 'x' } });
        },
      },
    );

    await transport.listItems(PROJECTS);
    await transport.getItem(PROJECTS, '1');
    await transport.createItem(PROJECTS, { Title: 'p' });
    await transport.patchItemFields(PROJECTS, '1', { Title: 'p2' }, '"etag"');

    await transport.listItems(TASKS);
    await transport.createItem(TASKS, { Title: 't' });
    await transport.patchItemFields(TASKS, '1', { Title: 't2' }, '"etag"');

    await transport.listItems(MILESTONES);
    await transport.createItem(MILESTONES, { Title: 'm' });
    await transport.patchItemFields(MILESTONES, '1', { Title: 'm2' }, '"etag"');

    await transport.listItems(CLIENTS);
    await transport.getItem(CLIENTS, '1');

    await transport.createItem(CLIENTS, { Title: 'c' });
    await transport.patchItemFields(CLIENTS, '1', { Title: 'c2' }, '"etag"');

    const writeCalls = calls.filter((c) => c.method === 'POST' || c.method === 'PATCH');
    assert.equal(writeCalls.some((c) => c.url.includes(CLIENTS)), true);
    assert.equal(writeCalls.some((c) => c.url.includes(PROJECTS)), true);
    assert.equal(writeCalls.some((c) => c.url.includes(TASKS)), true);
    assert.equal(writeCalls.some((c) => c.url.includes(MILESTONES)), true);

    const before = calls.length;
    await assert.rejects(() => transport.createItem(RISKS, { Title: 'nope' }), (err: unknown) => {
      assertSanitized(err);
      assert.match(err.message, /approved resource input|approved resource allowlist/);
      return true;
    });
    assert.equal(calls.length, before);
  });
});

describe('PM Graph origin, site, and redirect controls', () => {
  it('accepts the Graph origin and rejects alternate HTTPS, HTTP, and malformed continuation URLs before token use', async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const transport = createGraphTransport(
      ALLOWLIST,
      {
        getToken: async () => {
          tokenCalls += 1;
          return ACCESS_TOKEN;
        },
      },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(200, { value: [] });
        },
      },
    );

    const valid = itemsUrl(PROJECTS, '?$skiptoken=100');
    await transport.listItems(PROJECTS, { nextLink: valid });
    assert.equal(tokenCalls, 1);
    assert.equal(fetchCalls, 1);

    tokenCalls = 0;
    fetchCalls = 0;
    await assert.rejects(
      () => transport.listItems(PROJECTS, { nextLink: `https://evil.example/v1.0/sites/${encodeURIComponent(SITE)}/lists/${PROJECTS}/items` }),
      /pagination link was rejected/,
    );
    await assert.rejects(
      () => transport.listItems(PROJECTS, { nextLink: `http://${GRAPH_HOST}/v1.0/sites/${encodeURIComponent(SITE)}/lists/${PROJECTS}/items` }),
      /pagination link was rejected/,
    );
    await assert.rejects(
      () => transport.listItems(PROJECTS, { nextLink: 'not-a-url' }),
      /pagination link was rejected/,
    );
    assert.equal(tokenCalls, 0);
    assert.equal(fetchCalls, 0);
  });

  it('rejects a continuation path for a different site before an authenticated Graph request', async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const transport = createGraphTransport(
      ALLOWLIST,
      {
        getToken: async () => {
          tokenCalls += 1;
          return ACCESS_TOKEN;
        },
      },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(200, { value: [] });
        },
      },
    );
    const other = `${GRAPH_ORIGIN}/v1.0/sites/${encodeURIComponent(OTHER_SITE)}/lists/${PROJECTS}/items?$skiptoken=1`;
    await assert.rejects(() => transport.listItems(PROJECTS, { nextLink: other }), /pagination link was rejected/);
    assert.equal(tokenCalls, 0);
    assert.equal(fetchCalls, 0);
  });

  it('does not follow Graph 301/302/307/308 or forward the bearer token to a Location URL', async () => {
    for (const status of [301, 302, 307, 308]) {
      const calls: Array<{ url: string; redirect?: RequestRedirect; hasBearer: boolean }> = [];
      const transport = createGraphTransport(
        ALLOWLIST,
        { getToken: async () => ACCESS_TOKEN },
        {
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            calls.push({
              url: String(input),
              redirect: init?.redirect,
              hasBearer: (headers.get('authorization') || '').startsWith('Bearer '),
            });
            return redirectResponse(status, 'https://evil.example/steal');
          },
        },
      );
      await assert.rejects(() => transport.listItems(PROJECTS), (err: unknown) => {
        assertSanitized(err);
        assert.match(err.message, /redirect was rejected/);
        return true;
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].redirect, 'manual');
      assert.equal(calls[0].hasBearer, true);
      assert.equal(calls[0].url.startsWith(GRAPH_ORIGIN), true);
    }
  });
});

describe('PM Graph pagination nextLink confinement', () => {
  it('accepts a same-list nextLink and rejects cross-list, catalog, columns, and permissions links before Graph', async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const transport = createGraphTransport(
      ALLOWLIST,
      {
        getToken: async () => {
          tokenCalls += 1;
          return ACCESS_TOKEN;
        },
      },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(200, { value: [] });
        },
      },
    );

    await transport.listItems(PROJECTS, { nextLink: itemsUrl(PROJECTS, '?$skiptoken=20') });
    assert.equal(tokenCalls, 1);
    assert.equal(fetchCalls, 1);

    tokenCalls = 0;
    fetchCalls = 0;
    const siteEnc = encodeURIComponent(SITE);
    await assert.rejects(
      () => transport.listItems(PROJECTS, { nextLink: itemsUrl(TASKS, '?$skiptoken=1') }),
      /pagination link was rejected/,
    );
    await assert.rejects(
      () =>
        transport.listItems(PROJECTS, {
          nextLink: `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists`,
        }),
      /pagination link was rejected/,
    );
    await assert.rejects(
      () =>
        transport.listItems(PROJECTS, {
          nextLink: `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${PROJECTS}/columns`,
        }),
      /pagination link was rejected/,
    );
    await assert.rejects(
      () =>
        transport.listItems(PROJECTS, {
          nextLink: `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${PROJECTS}/permissions`,
        }),
      /pagination link was rejected/,
    );
    assert.equal(tokenCalls, 0);
    assert.equal(fetchCalls, 0);
  });

  it('rejects a Graph-returned nextLink that switches lists without issuing another request', async () => {
    let fetchCalls = 0;
    const transport = createGraphTransport(
      ALLOWLIST,
      { getToken: async () => ACCESS_TOKEN },
      {
        fetch: async () => {
          fetchCalls += 1;
          return jsonResponse(200, {
            value: [{ id: '1', fields: {} }],
            '@odata.nextLink': itemsUrl(TASKS, '?$skiptoken=2'),
          });
        },
      },
    );
    await assert.rejects(() => transport.listItems(PROJECTS), /pagination link was rejected/);
    assert.equal(fetchCalls, 1);
  });
});

describe('PM Graph metadata surface absence', () => {
  it('exposes only item list/get/create/patch operations', () => {
    const transport = createGraphTransport(ALLOWLIST, { getToken: async () => ACCESS_TOKEN });
    assert.deepEqual(Object.keys(transport).sort(), ['createItem', 'getItem', 'listItems', 'patchItemFields']);
    assert.equal('listLists' in transport, false);
    assert.equal('getColumns' in transport, false);
    assert.equal('getList' in transport, false);
    assert.equal('graphGet' in transport, false);
    assert.equal(parsePmGraphListItemsUrl(`${GRAPH_ORIGIN}/v1.0/sites/${encodeURIComponent(SITE)}/lists`), null);
    assert.equal(
      parsePmGraphListItemsUrl(`${GRAPH_ORIGIN}/v1.0/sites/${encodeURIComponent(SITE)}/lists/${PROJECTS}`),
      null,
    );
    assert.equal(
      parsePmGraphListItemsUrl(`${GRAPH_ORIGIN}/v1.0/sites/${encodeURIComponent(SITE)}/lists/${PROJECTS}/columns`),
      null,
    );
  });
});

describe('PM Graph Selected-permission collection reads', () => {
  it('does not send $filter to Graph even when a Hub field predicate is supplied', async () => {
    const urls: string[] = [];
    const transport = createGraphTransport(
      ALLOWLIST,
      { getToken: async () => ACCESS_TOKEN },
      {
        fetch: async (input) => {
          urls.push(String(input));
          return jsonResponse(200, { value: [] });
        },
      },
    );
    await transport.listItems(PROJECTS, { filter: "fields/ClientCode eq 'ACCG01'" });
    assert.equal(urls.length, 1);
    const url = new URL(urls[0]);
    assert.equal(url.searchParams.get('$filter'), null);
    assert.equal(url.searchParams.get('$expand'), 'fields');
    assert.equal(urls[0].includes('$filter'), false);
    assert.equal(urls[0].includes(ACCESS_TOKEN), false);
  });

  it('maps Graph 401 and 403 to a permission/token rejection without leaking the body', async () => {
    for (const status of [401, 403]) {
      const transport = createGraphTransport(
        ALLOWLIST,
        { getToken: async () => ACCESS_TOKEN },
        {
          fetch: async () => jsonResponse(status, { error: { code: 'accessDenied', message: ACCESS_TOKEN } }),
        },
      );
      await assert.rejects(() => transport.listItems(PROJECTS), (err: unknown) => {
        assertSanitized(err);
        assert.equal((err as PmHttpError).status, 503);
        assert.match((err as PmHttpError).message, /permission or token was rejected/);
        return true;
      });
    }
  });
});
