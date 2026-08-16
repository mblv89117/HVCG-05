/**
 * Atlas operating-index search. Not a second SoR.
 * Tenant-wide / unclassified knowledge search is Manny-only until source-ACL projection exists.
 * Other users: entitled ClientCodes + authorized internal only.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { isMannyPrincipal } from './manny.ts';
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
    | 'opportunity';
  id: string;
  clientCode?: string;
  title: string;
  href: string;
  source: string;
}

export async function searchSharePointPm(
  service: SharePointPmService,
  principal: AtlasPrincipal,
  rawQuery: string,
): Promise<{ query: string; results: PmSearchHit[]; scope: 'entitled' | 'manny_tenant' }> {
  const query = rawQuery.trim().slice(0, 120);
  if (query.length < 2) return { query, results: [], scope: 'entitled' };
  const q = query.toLowerCase();
  const results: PmSearchHit[] = [];
  const manny = isMannyPrincipal(principal);
  const clients = await service.listAuthorizedClients(principal);
  for (const c of clients) {
    const hay = [c.clientCode, c.displayName, c.dba, c.industry].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q) || (isCanonicalClientCode(query) && c.clientCode === query)) {
      results.push({
        kind: 'client',
        id: c.clientCode,
        clientCode: c.clientCode,
        title: `${c.clientCode} · ${c.displayName}`,
        href: `/clients/${encodeURIComponent(c.clientCode)}`,
        source: 'HVCG_Clients',
      });
    }
  }
  const projects = await service.listAuthorizedProjects(principal);
  for (const p of projects) {
    const hay = [p.name, p.nextAction, p.clientCode, p.objective].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      results.push({
        kind: 'project',
        id: p.id,
        clientCode: p.clientCode,
        title: p.name,
        href: `/projects/${encodeURIComponent(p.id)}`,
        source: 'HVCG_Projects',
      });
    }
  }
  const tasks = await service.listAuthorizedTasks(principal);
  for (const t of tasks) {
    const hay = [t.title, t.nextAction, t.clientCode, t.description].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      results.push({
        kind: 'task',
        id: t.id,
        clientCode: t.clientCode,
        title: t.title,
        href: t.projectId ? `/projects/${encodeURIComponent(t.projectId)}` : '/my-work',
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
      results.push({
        kind,
        id: String(item.id),
        clientCode,
        title,
        href: `/clients/${encodeURIComponent(clientCode)}`,
        source,
      });
    }
  };
  for (const c of clients) {
    const extras = await service.listWorkspaceCollections(principal, c.clientCode);
    for (const item of extras.communications.items) {
      const title = String(item.title || '');
      const hay = [title, item.summary].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      const file = isFileIndexRow(item);
      results.push({
        kind: file ? 'document' : 'communication',
        id: String(item.id),
        clientCode: c.clientCode,
        title,
        href: `/clients/${encodeURIComponent(c.clientCode)}`,
        source: file ? 'HVCG_Communications/file-index' : 'HVCG_Communications',
      });
    }
    pushCollection(extras.meetings.items, 'meeting', 'HVCG_Meetings', c.clientCode);
    pushCollection(extras.engagements.items, 'engagement', 'HVCG_Engagements', c.clientCode);
    pushCollection(extras.deliverables.items, 'deliverable', 'HVCG_Deliverables', c.clientCode);
    pushCollection(extras.decisionsRisks.items, 'decision', 'HVCG_Decisions', c.clientCode);
  }
  if (manny) {
    const vendors = await service.listVendors();
    for (const v of vendors) {
      const hay = [v.title, v.category, v.notes].filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(q)) {
        results.push({
          kind: 'vendor',
          id: v.id,
          title: v.title,
          href: '/procurement',
          source: 'HVCG_Vendors',
        });
      }
    }
    const opportunities = await service.listOpportunities();
    for (const o of opportunities) {
      const hay = [o.title, o.notes, o.clientCode].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      results.push({
        kind: 'opportunity',
        id: o.id,
        clientCode: o.clientCode,
        title: o.title,
        href: o.clientCode ? `/clients/${encodeURIComponent(o.clientCode)}` : '/pipeline',
        source: 'HVCG_Opportunities',
      });
    }
    const files = await service.listIndexedFiles();
    for (const f of files) {
      if (f.clientCode) continue;
      const hay = [f.title, f.summary].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
      results.push({
        kind: 'document',
        id: f.id,
        title: f.title,
        href: '/documents',
        source: 'HVCG_Communications/file-index',
      });
    }
  }
  return { query, results: results.slice(0, 40), scope: manny ? 'manny_tenant' : 'entitled' };
}
