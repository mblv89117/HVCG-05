/**
 * Atlas operating-index search. Not a second SoR.
 * Tenant-wide / unclassified knowledge search is Manny-only until source-ACL projection exists.
 * Other users: entitled ClientCodes + authorized internal only.
 *
 * Performance contract (authenticated Hub /api/pm/search):
 * - Kick core + CRM + Manny catalog reads in parallel (do not serialize Graph listAll).
 * - Budget secondary catalogs so SharePoint stalls cannot hold client hits for 14s+.
 * - Authorization is applied after every list read; caches (if any) must be raw-list only.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { isMannyPrincipal } from './manny.ts';
import { isInternalStaff } from './authz.ts';
import type { SharePointPmService } from './repository.ts';

import { isFileIndexRow } from './fabric/fileIndex.ts';

export interface PmSearchHit {
  kind:
    | 'client'
    | 'project'
    | 'task'
    | 'communication'
    | 'document'
    | 'vendor'
    | 'meeting'
    | 'engagement'
    | 'deliverable'
    | 'decision'
    | 'opportunity'
    | 'lead'
    | 'capital_opportunity'
    | 'lender';
  id: string;
  clientCode?: string;
  title: string;
  href: string;
  source: string;
}

export interface PmSearchTiming {
  totalMs: number;
  clientsMs: number;
  coreMs: number;
  catalogsMs: number;
  extrasMs: number;
  overallBudgetMs: number;
}

type LeadRow = {
  id: string;
  title: string;
  clientCode?: string;
  notes?: string;
  email?: string;
  company?: string;
  status?: string;
};

type CapitalOpportunityRow = {
  id: string;
  title: string;
  clientCode?: string;
  notes?: string;
  projectId?: string;
};

type LenderRow = {
  id: string;
  title: string;
  notes?: string;
  category?: string;
};

/**
 * Search reads existing SharePoint-backed list methods only.
 * Optional lead / capital / lender catalogs are used when the source exposes them —
 * search does not create lists.
 */
export type SearchPmService = Pick<
  SharePointPmService,
  | 'listAuthorizedClients'
  | 'listAuthorizedProjects'
  | 'listAuthorizedTasks'
  | 'listWorkspaceCollections'
  | 'listVendors'
  | 'listOpportunities'
  | 'listIndexedFiles'
> & {
  listWorkspaceCollectionsForSearch?: SharePointPmService['listWorkspaceCollectionsForSearch'];
  listLeads?: () => Promise<LeadRow[]>;
  listCapitalOpportunities?: () => Promise<CapitalOpportunityRow[]>;
  listLenders?: () => Promise<LenderRow[]>;
};

const SEARCH_CAP = 40;
/** Hard ceiling for the whole search response (P95 target ≤ 5s). */
const OVERALL_BUDGET_MS = 4500;
/** Projects/tasks must not block an already-matched authorized client. */
const CORE_BUDGET_MS = 2500;
/** CRM catalogs (opportunities/leads/capital) share this budget from search start. */
const CATALOG_BUDGET_MS = 2500;
/** Workspace extras must not block or fail the operating-index (clients/projects/tasks). */
const EXTRAS_BUDGET_MS = 900;
/** Manny-only vendors/lenders/files share this budget from search start. */
const MANNY_BUDGET_MS = 2500;

async function bestEffort<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function withBudget<T>(fn: () => Promise<T>, budgetMs: number): Promise<T | undefined> {
  if (budgetMs <= 0) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), budgetMs);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clientHref(clientCode: string): string {
  return `/clients/${encodeURIComponent(clientCode)}`;
}

function projectHref(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}

/** Bound records with a canonical ClientCode: entitled principals. Unclassified: Manny-only. */
function canSeeClientBound(manny: boolean, entitled: Set<string>, clientCode?: string): boolean {
  const code = (clientCode || '').trim();
  if (!code) return manny;
  if (!isCanonicalClientCode(code)) return false;
  if (entitled.has(code)) return true;
  return manny;
}

/** Unconverted HVCG_Leads are internal CRM, not a client-scope wildcard. */
function canSeeLead(principal: AtlasPrincipal, entitled: Set<string>, clientCode?: string): boolean {
  const code = (clientCode || '').trim();
  if (!code) return isInternalStaff(principal);
  if (!isCanonicalClientCode(code) || code === '*') return false;
  return entitled.has(code);
}

function opportunityHref(id: string): string {
  const item = (id || '').trim();
  return item ? `/opportunities/${encodeURIComponent(item)}` : '/leads';
}

function capitalOpportunityHref(row: CapitalOpportunityRow): string {
  const id = (row.id || '').trim();
  if (id) return `/capital?opportunity=${encodeURIComponent(id)}`;
  return '/capital';
}

function leadHref(id: string): string {
  const item = (id || '').trim();
  return item ? `/leads/${encodeURIComponent(item)}` : '/leads';
}

export async function searchSharePointPm(
  service: SearchPmService,
  principal: AtlasPrincipal,
  rawQuery: string,
  opts?: {
    extrasBudgetMs?: number;
    coreBudgetMs?: number;
    catalogBudgetMs?: number;
    mannyBudgetMs?: number;
    overallBudgetMs?: number;
  },
): Promise<{
  query: string;
  results: PmSearchHit[];
  scope: 'entitled' | 'manny_tenant';
  timing: PmSearchTiming;
}> {
  const query = rawQuery.trim().slice(0, 120);
  const emptyTiming = (totalMs: number): PmSearchTiming => ({
    totalMs,
    clientsMs: 0,
    coreMs: 0,
    catalogsMs: 0,
    extrasMs: 0,
    overallBudgetMs: opts?.overallBudgetMs ?? OVERALL_BUDGET_MS,
  });
  if (query.length < 2) {
    return { query, results: [], scope: 'entitled', timing: emptyTiming(0) };
  }
  const q = query.toLowerCase();
  const results: PmSearchHit[] = [];
  const manny = isMannyPrincipal(principal);
  const started = Date.now();
  const overallBudgetMs = opts?.overallBudgetMs ?? OVERALL_BUDGET_MS;
  const extrasBudgetMs = opts?.extrasBudgetMs ?? EXTRAS_BUDGET_MS;
  const coreBudgetMs = opts?.coreBudgetMs ?? CORE_BUDGET_MS;
  const catalogBudgetMs = opts?.catalogBudgetMs ?? CATALOG_BUDGET_MS;
  const mannyBudgetMs = opts?.mannyBudgetMs ?? MANNY_BUDGET_MS;
  const remaining = () => Math.max(0, overallBudgetMs - (Date.now() - started));
  let entitled = new Set<string>();

  const push = (hit: PmSearchHit) => {
    if (hit.clientCode && !canSeeClientBound(manny, entitled, hit.clientCode)) return;
    results.push(hit);
  };

  // Kick every independent catalog read immediately. Authz filtering happens below.
  const clientsStarted = Date.now();
  const clientsP = service.listAuthorizedClients(principal);
  const projectsP = withBudget(() => service.listAuthorizedProjects(principal), Math.min(coreBudgetMs, remaining()));
  const tasksP = withBudget(() => service.listAuthorizedTasks(principal), Math.min(coreBudgetMs, remaining()));
  const opportunitiesP = withBudget(
    () => bestEffort(() => service.listOpportunities(), []),
    Math.min(catalogBudgetMs, remaining()),
  ).then((rows) => rows || []);
  const leadsP = withBudget(
    () => bestEffort(async () => (await service.listLeads?.()) || [], []),
    Math.min(catalogBudgetMs, remaining()),
  ).then((rows) => rows || []);
  const capitalP = withBudget(
    () => bestEffort(async () => (await service.listCapitalOpportunities?.()) || [], []),
    Math.min(catalogBudgetMs, remaining()),
  ).then((rows) => rows || []);
  const vendorsP = manny
    ? withBudget(() => bestEffort(() => service.listVendors(), []), Math.min(mannyBudgetMs, remaining())).then(
        (rows) => rows || [],
      )
    : Promise.resolve([] as Awaited<ReturnType<SharePointPmService['listVendors']>>);
  const lendersP = manny
    ? withBudget(
        () => bestEffort(async () => (await service.listLenders?.()) || [], []),
        Math.min(mannyBudgetMs, remaining()),
      ).then((rows) => rows || [])
    : Promise.resolve([] as LenderRow[]);
  const filesP = manny
    ? withBudget(() => bestEffort(() => service.listIndexedFiles(), []), Math.min(mannyBudgetMs, remaining())).then(
        (rows) => rows || [],
      )
    : Promise.resolve([] as Awaited<ReturnType<SharePointPmService['listIndexedFiles']>>);

  const clients = await clientsP;
  const clientsMs = Date.now() - clientsStarted;
  entitled = new Set(clients.map((c) => c.clientCode));

  for (const c of clients) {
    const hay = [c.clientCode, c.displayName, c.dba, c.industry].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q) || (isCanonicalClientCode(query) && c.clientCode === query)) {
      push({
        kind: 'client',
        id: c.clientCode,
        clientCode: c.clientCode,
        title: `${c.clientCode} · ${c.displayName}`,
        href: clientHref(c.clientCode),
        source: 'HVCG_Clients',
      });
    }
  }

  const coreStarted = Date.now();
  const [projects, tasks] = await Promise.all([
    projectsP.then((rows) => rows || []),
    tasksP.then((rows) => rows || []),
  ]);
  const coreMs = Date.now() - coreStarted;

  for (const p of projects) {
    const hay = [p.name, p.nextAction, p.clientCode, p.objective].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      push({
        kind: 'project',
        id: p.id,
        clientCode: p.clientCode,
        title: p.name,
        href: projectHref(p.id),
        source: 'HVCG_Projects',
      });
    }
  }
  for (const t of tasks) {
    const hay = [t.title, t.nextAction, t.clientCode, t.description].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      push({
        kind: 'task',
        id: t.id,
        clientCode: t.clientCode,
        title: t.title,
        href: t.projectId ? projectHref(t.projectId) : '/my-work',
        source: 'HVCG_Tasks',
      });
    }
  }

  const pushCollection = (
    items: Array<Record<string, unknown>>,
    kind: PmSearchHit['kind'],
    source: string,
    clientCode: string,
  ) => {
    for (const item of items) {
      const title = String(item.title || '');
      const hay = [title, item.summary, item.status].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      push({
        kind,
        id: String(item.id),
        clientCode,
        title,
        href: clientHref(clientCode),
        source,
      });
    }
  };

  const extrasStarted = Date.now();
  const extrasPromise = (async () => {
    const budget = Math.min(extrasBudgetMs, remaining());
    if (budget <= 0 || clients.length === 0) {
      return clients.map((client) => ({ client, extras: undefined }));
    }
    if (service.listWorkspaceCollectionsForSearch) {
      const batched = await withBudget(
        () => service.listWorkspaceCollectionsForSearch!(principal, clients.map((c) => c.clientCode)),
        budget,
      );
      return clients.map((client) => ({ client, extras: batched?.get(client.clientCode) }));
    }
    return Promise.all(
      clients.map(async (c) => {
        const extras = await withBudget(
          () => service.listWorkspaceCollections(principal, c.clientCode),
          Math.min(budget, remaining()),
        );
        return { client: c, extras };
      }),
    );
  })();

  const catalogsStarted = Date.now();
  const [extrasRows, opportunities, leads, capitalOpps, vendors, lenders, files] = await Promise.all([
    extrasPromise,
    opportunitiesP,
    leadsP,
    capitalP,
    vendorsP,
    lendersP,
    filesP,
  ]);
  const catalogsMs = Date.now() - catalogsStarted;
  const extrasMs = Date.now() - extrasStarted;

  for (const row of extrasRows) {
    if (!row.extras) continue;
    const c = row.client;
    const extras = row.extras;
    for (const item of extras.communications.items) {
      const title = String(item.title || '');
      const hay = [title, item.summary].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      const file = isFileIndexRow(item);
      push({
        kind: file ? 'document' : 'communication',
        id: String(item.id),
        clientCode: c.clientCode,
        title,
        href: clientHref(c.clientCode),
        source: file ? 'HVCG_Communications/file-index' : 'HVCG_Communications',
      });
    }
    pushCollection(extras.meetings.items, 'meeting', 'HVCG_Meetings', c.clientCode);
    pushCollection(extras.engagements.items, 'engagement', 'HVCG_Engagements', c.clientCode);
    pushCollection(extras.deliverables.items, 'deliverable', 'HVCG_Deliverables', c.clientCode);
    pushCollection(extras.decisionsRisks.items, 'decision', 'HVCG_Decisions', c.clientCode);
  }

  for (const o of opportunities) {
    if (!canSeeClientBound(manny, entitled, o.clientCode)) continue;
    const hay = [o.title, o.notes, o.clientCode].filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(q)) continue;
    push({
      kind: 'opportunity',
      id: o.id,
      clientCode: o.clientCode,
      title: o.title,
      href: opportunityHref(o.id),
      source: 'HVCG_Opportunities',
    });
  }

  for (const lead of leads) {
    if (!canSeeLead(principal, entitled, lead.clientCode)) continue;
    const hay = [lead.title, lead.notes, lead.email, lead.company, lead.status, lead.clientCode]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) continue;
    push({
      kind: 'lead',
      id: lead.id,
      clientCode: lead.clientCode,
      title: lead.title,
      href: leadHref(lead.id),
      source: 'HVCG_Leads',
    });
  }

  for (const o of capitalOpps) {
    if (!canSeeClientBound(manny, entitled, o.clientCode)) continue;
    const hay = [o.title, o.notes, o.clientCode, o.projectId].filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(q)) continue;
    push({
      kind: 'capital_opportunity',
      id: o.id,
      clientCode: o.clientCode,
      title: o.title,
      href: capitalOpportunityHref(o),
      source: 'HVCG_CapitalOpportunities',
    });
  }

  if (manny) {
    for (const v of vendors) {
      const hay = [v.title, v.category, v.notes].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(q)) {
        push({
          kind: 'vendor',
          id: v.id,
          title: v.title,
          href: '/procurement',
          source: 'HVCG_Vendors',
        });
      }
    }
    for (const lender of lenders) {
      const hay = [lender.title, lender.category, lender.notes].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      push({
        kind: 'lender',
        id: lender.id,
        title: lender.title,
        href: '/capital',
        source: 'HVCG_Lenders',
      });
    }
    for (const f of files) {
      if (f.clientCode) continue;
      const hay = [f.title, f.summary].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      push({
        kind: 'document',
        id: f.id,
        title: f.title,
        href: '/documents',
        source: 'HVCG_Communications/file-index',
      });
    }
  }

  return {
    query,
    results: results.slice(0, SEARCH_CAP),
    scope: manny ? 'manny_tenant' : 'entitled',
    timing: {
      totalMs: Date.now() - started,
      clientsMs,
      coreMs,
      catalogsMs,
      extrasMs,
      overallBudgetMs,
    },
  };
}
