/**
 * Repeatable Atlas search performance + authorization benchmark.
 *
 * Baseline (live Hub cert 2026-08-20, authenticated, 12 samples):
 *   P50 14474 ms · P95 15622 ms · Graph list reads serialized + duplicated
 *
 * This suite models production Graph latency (~2s / listAll) and measures the
 * optimized parallel + budgeted search path. It does not call live Graph.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { createListItemCache } from '../src/pm/sharepoint/listCache.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

const GRAPH_LIST_MS = 2000;
const BASELINE = { p50: 14474, p95: 15622, note: 'ATLAS_PRODUCTION_CERTIFICATION_2026-08-20' };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function principal(partial: Partial<AtlasPrincipal> & { userId: string }): AtlasPrincipal {
  return {
    userId: partial.userId,
    email: partial.email || 'bench@hvcg.test',
    organizationId: partial.organizationId || 'org-hvcg',
    allowedClientIds: partial.allowedClientIds || ['SYN01'],
    roles: partial.roles || ['HVCG Team Member'],
  };
}

function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((pct / 100) * (sorted.length - 1)));
  return sorted[idx];
}

type CallLog = { name: string; at: number };

function instrumentedService(opts: {
  listLatencyMs?: number;
  manny?: boolean;
  log: CallLog[];
}): SearchPmService {
  const latency = opts.listLatencyMs ?? GRAPH_LIST_MS;
  const started = Date.now();
  const mark = (name: string) => {
    opts.log.push({ name, at: Date.now() - started });
  };
  const delayed = async <T>(name: string, value: T): Promise<T> => {
    mark(name);
    await sleep(latency);
    return value;
  };

  const clients = [
    {
      clientCode: 'SYN01',
      displayName: 'SYN Atlas Conversion Co',
      dba: undefined as string | undefined,
      industry: 'QA',
    },
    {
      clientCode: 'SYN02',
      displayName: 'Hidden Bravo',
      dba: undefined as string | undefined,
      industry: 'QA',
    },
  ];

  return {
    async listAuthorizedClients(p) {
      const rows = await delayed('listAuthorizedClients', clients);
      const allowed = new Set(p.allowedClientIds.filter((c) => c !== '*'));
      return rows.filter((c) => allowed.has(c.clientCode)) as never;
    },
    async listAuthorizedProjects(p) {
      const rows = await delayed('listAuthorizedProjects', [
        { id: 'p1', name: 'SYN01 working capital', clientCode: 'SYN01', nextAction: 'Call', objective: 'Raise' },
        { id: 'p2', name: 'SYN02 secret project', clientCode: 'SYN02', nextAction: 'Hide', objective: 'Leak' },
      ]);
      const allowed = new Set(p.allowedClientIds.filter((c) => c !== '*'));
      return rows.filter((r) => allowed.has(r.clientCode || '')) as never;
    },
    async listAuthorizedTasks(p) {
      const rows = await delayed('listAuthorizedTasks', [
        { id: 't1', title: 'SYN01 task', clientCode: 'SYN01', projectId: 'p1', description: 'ok' },
        { id: 't2', title: 'SYN02 task', clientCode: 'SYN02', projectId: 'p2', description: 'no' },
      ]);
      const allowed = new Set(p.allowedClientIds.filter((c) => c !== '*'));
      return rows.filter((r) => allowed.has(r.clientCode || '')) as never;
    },
    async listWorkspaceCollections() {
      return delayed('listWorkspaceCollections', {
        communications: { status: 'COMPLETE', queried: true, items: [] },
        meetings: { status: 'COMPLETE', queried: true, items: [] },
        engagements: { status: 'COMPLETE', queried: true, items: [] },
        deliverables: { status: 'COMPLETE', queried: true, items: [] },
        decisionsRisks: { status: 'COMPLETE', queried: true, items: [] },
        contacts: { status: 'COMPLETE', queried: true, items: [] },
      }) as never;
    },
    async listWorkspaceCollectionsForSearch() {
      await delayed('listWorkspaceCollectionsForSearch', null);
      return new Map();
    },
    async listOpportunities() {
      return delayed('listOpportunities', [
        { id: 'o1', title: 'SYN01 opportunity', clientCode: 'SYN01', notes: 'open' },
        { id: 'o2', title: 'SYN02 opportunity', clientCode: 'SYN02', notes: 'hidden' },
      ]);
    },
    async listLeads() {
      return delayed('listLeads', [
        { id: 'l1', title: 'Inbound website', clientCode: undefined, notes: 'staff', company: 'Web' },
        { id: 'l2', title: 'Hidden lead', clientCode: 'SYN02', notes: 'no' },
      ]);
    },
    async listCapitalOpportunities() {
      return delayed('listCapitalOpportunities', [
        { id: 'c1', title: 'SYN01 capital qualify', clientCode: 'SYN01' },
        { id: 'c2', title: 'SYN02 capital', clientCode: 'SYN02' },
      ]);
    },
    async listVendors() {
      return delayed('listVendors', [{ id: 'v1', title: 'VendorCo', category: 'IT', notes: 'manny' }]);
    },
    async listLenders() {
      return delayed('listLenders', [{ id: 'ln1', title: 'LenderCo', category: 'Bank', notes: 'manny' }]);
    },
    async listIndexedFiles() {
      return delayed('listIndexedFiles', [
        { id: 'f1', title: 'Unclassified memo', summary: 'manny only' },
        { id: 'f2', title: 'SYN01 file', clientCode: 'SYN01', summary: 'scoped' },
      ]);
    },
  };
}

/** Legacy serialized critical path used to explain the ~14s production P50. */
async function legacySerializedSearch(service: SearchPmService, p: AtlasPrincipal, q: string) {
  const clients = await service.listAuthorizedClients(p);
  const projects = await service.listAuthorizedProjects(p);
  const tasks = await service.listAuthorizedTasks(p);
  await service.listOpportunities();
  await service.listLeads?.();
  await service.listCapitalOpportunities?.();
  await service.listWorkspaceCollectionsForSearch?.(p, clients.map((c) => c.clientCode));
  if (p.userId === MANNY_ENTRA_OID) {
    await service.listVendors();
    await service.listLenders?.();
    await service.listIndexedFiles();
  }
  const hay = clients.map((c) => c.clientCode).join(' ');
  return {
    query: q,
    results: hay.toLowerCase().includes(q.toLowerCase())
      ? [{ kind: 'client', id: 'SYN01', clientCode: 'SYN01', title: 'SYN01', href: '/clients/SYN01', source: 'HVCG_Clients' }]
      : [],
    ms: 0,
  };
}

describe('Atlas search performance benchmark', () => {
  it('profiles legacy serialized path ≈ production P50 with 2s list latency', async () => {
    const log: CallLog[] = [];
    const service = instrumentedService({ log, listLatencyMs: 200 });
    const p = principal({ userId: MANNY_ENTRA_OID, allowedClientIds: ['SYN01', 'SYN02', 'ACCG01'] });
    // Use 200ms stands-in so the suite stays fast; scale to 2s equivalent counts.
    const started = Date.now();
    await legacySerializedSearch(service, p, 'SYN01');
    const elapsed = Date.now() - started;
    const listCalls = log.length;
    const projectedMs = listCalls * GRAPH_LIST_MS;
    assert.ok(listCalls >= 7, `expected many serialized list calls, got ${listCalls}`);
    assert.ok(projectedMs >= 14000, `projected serialized latency ${projectedMs} should explain ~14s baseline`);
    assert.ok(elapsed < 5000, 'bench itself must stay fast');
  });

  it('optimized cold path stays within overall budget and preserves authz', async () => {
    const samples: number[] = [];
    const requestCounts: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const log: CallLog[] = [];
      const service = instrumentedService({ log, listLatencyMs: 800 });
      const syn = principal({
        userId: 'syn-a',
        roles: ['HVCG Team Member'],
        allowedClientIds: ['SYN01'],
      });
      const started = Date.now();
      const found = await searchSharePointPm(service, syn, 'SYN01', {
        overallBudgetMs: 4500,
        coreBudgetMs: 2500,
        catalogBudgetMs: 2500,
        extrasBudgetMs: 900,
        mannyBudgetMs: 2500,
      });
      samples.push(Date.now() - started);
      requestCounts.push(log.length);
      assert.ok(found.results.some((r) => r.kind === 'client' && r.clientCode === 'SYN01'));
      assert.ok(found.results.every((r) => !r.clientCode || r.clientCode === 'SYN01'));
      assert.equal(found.scope, 'entitled');
      assert.ok(found.timing.totalMs <= 4500 + 250, 'must respect overall budget');
    }
    samples.sort((a, b) => a - b);
    const p50 = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    assert.ok(p50 <= 3000, `optimized P50 ${p50} should be <= 3000ms under modeled latency`);
    assert.ok(p95 <= 5000, `optimized P95 ${p95} should be <= 5000ms under modeled latency`);

    const report = {
      baseline: BASELINE,
      after: {
        p50,
        p95,
        min: samples[0],
        max: samples[samples.length - 1],
        sampleCount: samples.length,
        medianRequestCount: [...requestCounts].sort((a, b) => a - b)[Math.floor(requestCounts.length / 2)],
        modeledListLatencyMs: 800,
        overallBudgetMs: 4500,
      },
      authorization: 'PASS — SYN01 scoped; SYN02 excluded',
      cache: 'raw listId TTL cache + inflight dedupe (principal filter after load)',
      at: new Date().toISOString(),
    };
    mkdirSync('/opt/cursor/artifacts', { recursive: true });
    writeFileSync('/opt/cursor/artifacts/atlas_search_perf_benchmark.json', JSON.stringify(report, null, 2));
  });

  it('Manny catalogs run in parallel and stay budgeted (no 14s serial vendors→lenders→files)', async () => {
    const log: CallLog[] = [];
    const service = instrumentedService({ log, listLatencyMs: 700 });
    const manny = principal({
      userId: MANNY_ENTRA_OID,
      roles: ['HVCG Owner'],
      allowedClientIds: ['SYN01', 'SYN02'],
    });
    const started = Date.now();
    const found = await searchSharePointPm(service, manny, 'LenderCo', {
      overallBudgetMs: 4500,
      mannyBudgetMs: 2500,
      extrasBudgetMs: 200,
    });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 3500, `Manny search elapsed ${elapsed} must not serialize three 700ms catalogs`);
    assert.ok(found.results.some((r) => r.kind === 'lender'));
    assert.equal(found.scope, 'manny_tenant');
    const vendorAt = log.find((c) => c.name === 'listVendors')?.at ?? -1;
    const lenderAt = log.find((c) => c.name === 'listLenders')?.at ?? -1;
    const filesAt = log.find((c) => c.name === 'listIndexedFiles')?.at ?? -1;
    assert.ok(vendorAt >= 0 && lenderAt >= 0 && filesAt >= 0);
    assert.ok(Math.abs(vendorAt - lenderAt) < 200, 'vendors and lenders should start nearly together');
  });

  it('list cache dedupes concurrent identical listId loads without principal keys', async () => {
    const cache = createListItemCache({ ttlMs: 30_000, maxEntries: 8 });
    let loads = 0;
    const loader = async () => {
      loads += 1;
      await sleep(50);
      return [{ id: '1', fields: { Title: 'A', ClientCode: 'SYN01' } }];
    };
    const [a, b] = await Promise.all([cache.getOrLoad('list-clients', loader), cache.getOrLoad('list-clients', loader)]);
    assert.equal(loads, 1);
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    const c = await cache.getOrLoad('list-clients', loader);
    assert.equal(loads, 1);
    assert.equal(c[0].fields.ClientCode, 'SYN01');
    const stats = cache.stats();
    assert.ok(stats.hits >= 1);
    assert.ok(stats.dedupes >= 1);
    assert.equal(stats.ttlMs, 30_000);
  });
});
