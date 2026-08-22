/**
 * Entitled Search hot-path: parallel catalogs + listId TTL cache.
 * Fail-closed authz is unchanged. Empty-scope still skips SharePoint.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { createListItemCache } from '../src/pm/sharepoint/listCache.ts';
import { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import type { SharePointPmSettings } from '../src/pm/sharepoint/settings.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
const VENDORS = 'ffffffff-ffff-4fff-8fff-fffffffffff2';
const OPPORTUNITIES = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const LEADS = 'ffffffff-ffff-4fff-8fff-fffffffffff4';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const SYN_A = '11111111-1111-4111-8111-aaaaaaaaaa01';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const synMember: AtlasPrincipal = {
  userId: SYN_A,
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Team Member'],
};

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function operatingIndexService(overrides: Partial<SearchPmService> = {}): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          dba: 'SYN Alpha',
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
      return emptyCollection;
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
    ...overrides,
  };
}

class CountingGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  listCalls = 0;
  listCallsById = new Map<string, number>();
  nextId = 100;
  etagN = 1;

  constructor() {
    for (const id of [PROJECTS, TASKS, MILESTONES, CLIENTS, COMMS, VENDORS, OPPORTUNITIES, LEADS]) {
      this.lists.set(id, []);
    }
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
    this.listCalls += 1;
    this.listCallsById.set(listId, (this.listCallsById.get(listId) || 0) + 1);
    return { items: [...(this.lists.get(listId) || [])] };
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
    if (!item) throw new Error('not_found');
    if (etag !== item.etag) throw new Error('etag');
    item.fields = { ...item.fields, ...fields };
    item.etag = `"etag-${this.etagN++}"`;
    return item;
  }
}

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: {
    id: oid || '',
    mail: `${(oid || 'x').slice(0, 8)}@hvcg.example`,
    userPrincipalName: `${(oid || 'x').slice(0, 8)}@hvcg.example`,
  },
});

function settings(): SharePointPmSettings {
  return {
    siteId: SITE,
    projectsListId: PROJECTS,
    tasksListId: TASKS,
    milestonesListId: MILESTONES,
    clientsListId: CLIENTS,
    communicationsListId: COMMS,
    vendorsListId: VENDORS,
    opportunitiesListId: OPPORTUNITIES,
    leadsListId: LEADS,
    managedIdentityClientId: MI,
  };
}

describe('listId TTL cache', () => {
  it('hits the second getOrLoad and invalidates after write', async () => {
    let loads = 0;
    const cache = createListItemCache({ ttlMs: 20_000, maxEntries: 8 });
    const first = await cache.getOrLoad('list-a', async () => {
      loads += 1;
      return [{ id: '1', fields: { Title: 'A' } }];
    });
    const second = await cache.getOrLoad('list-a', async () => {
      loads += 1;
      return [{ id: '2', fields: { Title: 'B' } }];
    });
    assert.equal(loads, 1);
    assert.equal(first[0].id, '1');
    assert.equal(second[0].id, '1');
    assert.equal(cache.stats().hits, 1);
    assert.equal(cache.stats().misses, 1);
    cache.invalidate('list-a');
    const third = await cache.getOrLoad('list-a', async () => {
      loads += 1;
      return [{ id: '3', fields: { Title: 'C' } }];
    });
    assert.equal(loads, 2);
    assert.equal(third[0].id, '3');
  });

  it('dedupes concurrent loaders for the same listId', async () => {
    let loads = 0;
    const cache = createListItemCache({ ttlMs: 20_000 });
    const loader = async () => {
      loads += 1;
      await sleep(40);
      return [{ id: '1', fields: { Title: 'A' } }];
    };
    const [a, b] = await Promise.all([cache.getOrLoad('list-a', loader), cache.getOrLoad('list-a', loader)]);
    assert.equal(loads, 1);
    assert.equal(a[0].id, '1');
    assert.equal(b[0].id, '1');
    assert.ok(cache.stats().dedupes >= 1);
  });
});

describe('entitled Search hot-path', () => {
  it('empty-scope non-staff still makes zero SharePoint calls', async () => {
    let calls = 0;
    const bump = async <T>(value: T): Promise<T> => {
      calls += 1;
      return value;
    };
    const service = operatingIndexService({
      async listAuthorizedClients() {
        return bump([]);
      },
      async listAuthorizedProjects() {
        return bump([]);
      },
      async listAuthorizedTasks() {
        return bump([]);
      },
      async listOpportunities() {
        return bump([{ id: 'leak', title: 'hvcg secret book', clientCode: 'SYN02' }]);
      },
    });
    const empty: AtlasPrincipal = {
      userId: SYN_A,
      organizationId: 'org-hvcg',
      allowedClientIds: [],
      roles: [],
    };
    const found = await searchSharePointPm(service, empty, 'hvcg');
    assert.equal(found.results.length, 0);
    assert.equal(calls, 0);
  });

  it('entitled catalogs start in parallel (elapsed << sequential catalog delay)', async () => {
    const delayMs = 80;
    const startedAt = new Map<string, number>();
    const delayed = async <T>(name: string, value: T): Promise<T> => {
      startedAt.set(name, Date.now());
      await sleep(delayMs);
      return value;
    };
    const service = operatingIndexService({
      async listAuthorizedClients() {
        return delayed('clients', [
          {
            id: 'SYN01',
            itemId: '1',
            clientCode: 'SYN01',
            displayName: 'SYNTHETIC Alpha Co',
            source: 'sharepoint',
          },
        ]);
      },
      async listAuthorizedProjects() {
        return delayed('projects', []);
      },
      async listAuthorizedTasks() {
        return delayed('tasks', []);
      },
      async listWorkspaceCollections() {
        return delayed('extras', emptyCollection);
      },
      async listOpportunities() {
        return delayed('opportunities', []);
      },
      async listLeads() {
        return delayed('leads', []);
      },
      async listCapitalOpportunities() {
        return delayed('capital', []);
      },
    });
    const t0 = Date.now();
    const found = await searchSharePointPm(service, synMember, 'SYN01');
    const elapsed = Date.now() - t0;
    assert.ok(found.results.some((r) => r.kind === 'client' && r.clientCode === 'SYN01'));
    assert.equal(found.results.some((r) => r.clientCode === 'SYN02'), false);
    const starts = [...startedAt.values()];
    assert.ok(starts.length >= 4, 'expected several catalogs to start');
    const spread = Math.max(...starts) - Math.min(...starts);
    assert.ok(spread < delayMs, `catalogs must overlap; start spread ${spread}ms`);
    assert.ok(elapsed < delayMs * 3, `parallel entitled path ${elapsed}ms must beat sequential ${delayMs * 4}+`);
  });

  it('q=SYN01 still returns the authorized client and never SYN02', async () => {
    const service = operatingIndexService({
      async listAuthorizedProjects() {
        return [
          { id: 'p1', name: 'SYN01 working capital', clientCode: 'SYN01' },
          { id: 'p2', name: 'SYN02 secret expansion', clientCode: 'SYN02' },
        ] as never;
      },
      async listOpportunities() {
        return [
          { id: 'o1', title: 'SYN01 discovery', clientCode: 'SYN01' },
          { id: 'o2', title: 'SYN02 hidden book', clientCode: 'SYN02' },
        ];
      },
    });
    const found = await searchSharePointPm(service, synMember, 'SYN01');
    assert.ok(found.results.some((r) => r.kind === 'client' && r.clientCode === 'SYN01'));
    assert.ok(found.results.every((r) => !r.clientCode || r.clientCode === 'SYN01'));
    assert.equal(found.scope, 'entitled');
  });

  it('SharePoint listAll cache hits the second clients read; write invalidates', async () => {
    const graph = new CountingGraph();
    graph.seed(CLIENTS, { Title: 'SYNTHETIC Alpha Co', ClientCode: 'SYN01' }, '1');
    graph.seed(CLIENTS, { Title: 'SYNTHETIC Bravo Co', ClientCode: 'SYN02' }, '2');
    graph.seed(PROJECTS, {
      Title: 'SYN01 file',
      ClientCode: 'SYN01',
      IsInternalProject: false,
      ProjectStatus: 'In Progress',
      ProjectHealth: 'Green',
      Priority: 'Medium',
    }, '10');
    const cache = createListItemCache({ ttlMs: 20_000 });
    const service = new SharePointPmService(settings(), graph, lookupOk, cache);
    const first = await service.listAuthorizedClients(synMember);
    const afterFirst = graph.listCallsById.get(CLIENTS) || 0;
    const second = await service.listAuthorizedClients(synMember);
    assert.equal(first.length, 1);
    assert.equal(first[0].clientCode, 'SYN01');
    assert.equal(second[0].clientCode, 'SYN01');
    assert.equal(graph.listCallsById.get(CLIENTS), afterFirst, 'second clients listAll must be a cache hit');
    assert.ok(cache.stats().hits >= 1);

    const manny: AtlasPrincipal = {
      userId: MANNY_ENTRA_OID,
      organizationId: 'org-hvcg',
      allowedClientIds: ['SYN01', 'SYN99'],
      roles: ['HVCG Owner'],
    };
    await service.createVerifiedHistoricalClient(manny, {
      clientCode: 'SYN99',
      Title: 'SYNTHETIC Ninety-Nine',
      provenanceSource: 'test',
    });
    const afterWrite = await service.listAuthorizedClients({
      ...synMember,
      allowedClientIds: ['SYN01', 'SYN99'],
    });
    assert.ok((graph.listCallsById.get(CLIENTS) || 0) > afterFirst, 'write must invalidate clients cache');
    assert.ok(afterWrite.some((c) => c.clientCode === 'SYN99'));
    assert.ok(afterWrite.some((c) => c.clientCode === 'SYN01'));
  });

  it('tasks re-list of projects is a cache hit / in-flight dedupe, not a second Graph read', async () => {
    const graph = new CountingGraph();
    graph.seed(CLIENTS, { Title: 'SYNTHETIC Alpha Co', ClientCode: 'SYN01' }, '1');
    graph.seed(PROJECTS, {
      Title: 'SYN01 file',
      ClientCode: 'SYN01',
      IsInternalProject: false,
      ProjectStatus: 'In Progress',
      ProjectHealth: 'Green',
      Priority: 'Medium',
    }, '10');
    graph.seed(TASKS, {
      Title: 'SYN01 collect bank statements',
      ClientCode: 'SYN01',
      ProjectIdLookupId: 10,
      TaskStatus: 'Not Started',
      Priority: 'Medium',
    }, '30');
    const cache = createListItemCache({ ttlMs: 20_000 });
    const service = new SharePointPmService(settings(), graph, lookupOk, cache);
    await Promise.all([service.listAuthorizedProjects(synMember), service.listAuthorizedTasks(synMember)]);
    assert.equal(graph.listCallsById.get(PROJECTS), 1, 'parallel projects+tasks must share one Graph projects listAll');
  });
});
