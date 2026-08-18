import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CapitalHttpError } from '../src/capital/errors.ts';
import {
  capabilityForCapitalList,
  createCapitalGraphTransport,
  type CapitalGraphResourceAllowlist,
} from '../src/capital/sharepoint/graph.ts';
import { mapHandoffSource } from '../src/capital/sharepoint/map.ts';
import { GRAPH_ORIGIN } from '../src/pm/sharepoint/graph.ts';
import { capabilityForPmList } from '../src/pm/sharepoint/graph.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const OPPORTUNITIES = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const DOCUMENT_REQUESTS = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const LENDER_OUTREACH = '33333333-cccc-4ccc-8ccc-ccccccccccc1';
const LENDERS = '44444444-dddd-4ddd-8ddd-ddddddddddd1';
const CLIENTS = '55555555-eeee-4eee-8eee-eeeeeeeeeee1';
const PM_PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const RANDOM = '99999999-9999-4999-8999-999999999999';
const ACCESS_TOKEN = 'test-capital-access-token-sentinel-do-not-leak';

const ALLOWLIST: CapitalGraphResourceAllowlist = {
  siteId: SITE,
  opportunitiesListId: OPPORTUNITIES,
  documentRequestsListId: DOCUMENT_REQUESTS,
  lenderOutreachListId: LENDER_OUTREACH,
  lendersListId: LENDERS,
  clientsListId: CLIENTS,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function assertSanitized(err: unknown): asserts err is CapitalHttpError {
  assert.ok(err instanceof CapitalHttpError);
  const blob = `${err.message}\n${err.stack || ''}\n${err.code}`;
  assert.equal(blob.includes(ACCESS_TOKEN), false);
  assert.equal(blob.toLowerCase().includes('authorization'), false);
  assert.equal(blob.includes('Bearer '), false);
}

describe('Capital Graph allowlist', () => {
  it('maps EVA and unknown handoff sources to Other', () => {
    assert.equal(mapHandoffSource('EVA'), 'Other');
    assert.equal(mapHandoffSource('SalesWin'), 'SalesWin');
    assert.equal(mapHandoffSource('mystery'), 'Other');
  });

  it('accepts configured capital lists and rejects random and PM list IDs', async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const transport = createCapitalGraphTransport(
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

    assert.equal(capabilityForCapitalList(ALLOWLIST, OPPORTUNITIES), 'write');
    assert.equal(capabilityForCapitalList(ALLOWLIST, DOCUMENT_REQUESTS), 'write');
    assert.equal(capabilityForCapitalList(ALLOWLIST, LENDER_OUTREACH), 'write');
    assert.equal(capabilityForCapitalList(ALLOWLIST, CLIENTS), 'read');
    assert.equal(capabilityForCapitalList(ALLOWLIST, LENDERS), 'read');

    await transport.listItems(OPPORTUNITIES);
    await transport.listItems(CLIENTS);
    assert.equal(tokenCalls, 2);
    assert.equal(fetchCalls, 2);

    tokenCalls = 0;
    fetchCalls = 0;
    await assert.rejects(() => transport.listItems(RANDOM), (err: unknown) => {
      assertSanitized(err);
      assert.match(err.message, /approved resource allowlist/);
      assert.equal(err.code, 'CAPITAL_BACKEND_UNAVAILABLE');
      return true;
    });
    await assert.rejects(() => transport.listItems(PM_PROJECTS), /approved resource allowlist/);
    await assert.rejects(() => transport.getItem(PM_PROJECTS, '1'), /approved resource allowlist/);
    assert.equal(tokenCalls, 0);
    assert.equal(fetchCalls, 0);
  });

  it('permits capital opportunity writes and rejects client creates before Graph', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const transport = createCapitalGraphTransport(
      ALLOWLIST,
      { getToken: async () => ACCESS_TOKEN },
      {
        fetch: async (input, init) => {
          calls.push({ url: String(input), method: String(init?.method || 'GET') });
          if (String(init?.method) === 'POST') {
            return jsonResponse(201, { id: '1', fields: { Title: 'x' } });
          }
          return jsonResponse(200, { id: '1', fields: { Title: 'x' } });
        },
      },
    );

    await transport.createItem(OPPORTUNITIES, { Title: 'Working capital' });
    assert.equal(calls.some((c) => c.method === 'POST' && c.url.includes(OPPORTUNITIES)), true);

    const before = calls.length;
    await assert.rejects(() => transport.createItem(CLIENTS, { Title: 'nope' }), (err: unknown) => {
      assertSanitized(err);
      assert.match(err.message, /does not allow this operation/);
      return true;
    });
    await assert.rejects(() => transport.createItem(LENDERS, { Title: 'nope' }), /does not allow this operation/);
    assert.equal(calls.length, before);
  });

  it('does not treat PM allowlist capability as capital authorization', () => {
    const pmAllowlist = {
      siteId: SITE,
      projectsListId: PM_PROJECTS,
      tasksListId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      milestonesListId: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      clientsListId: CLIENTS,
    };
    assert.equal(capabilityForPmList(pmAllowlist, PM_PROJECTS), 'write');
    assert.throws(() => capabilityForCapitalList(ALLOWLIST, PM_PROJECTS));
    assert.equal(`${GRAPH_ORIGIN}/v1.0`.startsWith('https://'), true);
  });
});
