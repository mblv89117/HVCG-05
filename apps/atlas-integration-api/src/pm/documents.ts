/**
 * Document aggregation for Documents module — link-first from Client 360 / Microsoft sources.
 * Does not copy file bytes; preserves SharePoint/OneDrive URLs and sensitivity flags.
 */

import type { IntegrationRepository } from '../store/repository.ts';
import type { PmRepository } from './repository.ts';

export interface OperatingDocument {
  id: string;
  title: string;
  kind: string;
  webUrl?: string;
  path?: string;
  classification?: string;
  confidentiality: 'restricted' | 'internal' | 'general';
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  owner?: string;
  modifiedAt?: string;
  version?: string;
  sourceSystem: string;
  sensitivityRestricted: boolean;
}

export function listOperatingDocuments(
  pm: PmRepository,
  repo: IntegrationRepository,
  opts?: {
    clientId?: string;
    projectId?: string;
    query?: string;
    documentType?: string;
    confidentiality?: string;
    includeRestricted?: boolean;
  },
): { documents: OperatingDocument[]; restrictedOmitted: number } {
  const clients = repo.listClient360();
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const projects = pm.listProjects();
  const projectByClient = new Map<string, (typeof projects)[0]>();
  for (const p of projects) {
    if (p.clientId && !projectByClient.has(p.clientId)) projectByClient.set(p.clientId, p);
  }
  if (opts?.projectId) {
    const proj = pm.getProject(opts.projectId);
    if (proj?.clientId && !opts.clientId) opts = { ...opts, clientId: proj.clientId };
  }

  const records = repo.listAllSourceRecords(500_000);
  const out: OperatingDocument[] = [];
  let restrictedOmitted = 0;

  for (const c of clients) {
    if (opts?.clientId && c.id !== opts.clientId) continue;
    const docIds = new Set(c.associations.documents || []);
    const hvsKeys = new Set(
      (c.sourceRefs || []).filter((s) => s.businessEntity === 'HVS').map((s) => s.sourceRecordId),
    );
    const matched = records.filter((r) => {
      if (docIds.has(r.id)) return true;
      if (hvsKeys.has(r.provenance.sourceRecordId)) return true;
      if (String(r.fields.atlasClientId || '') === c.id) return true;
      const name = String(r.fields.atlasClientName || '').toLowerCase();
      return Boolean(name && name === (c.displayName || '').toLowerCase());
    });

    for (const r of matched) {
      const restricted = Boolean(r.fields.sensitivityRestricted);
      if (restricted && !opts?.includeRestricted) {
        restrictedOmitted++;
        continue;
      }
      const proj =
        (opts?.projectId ? pm.getProject(opts.projectId) : undefined) ||
        projectByClient.get(c.id);
      if (opts?.projectId && proj?.id !== opts.projectId) continue;

      const classification = String(r.fields.atlasClassification || r.fields.documentClass || r.kind || '');
      const confidentiality: OperatingDocument['confidentiality'] = restricted
        ? 'restricted'
        : /confidential|legal|pii/i.test(classification)
          ? 'internal'
          : 'general';

      if (opts?.confidentiality && confidentiality !== opts.confidentiality) continue;
      if (opts?.documentType && !classification.toLowerCase().includes(opts.documentType.toLowerCase())) {
        continue;
      }
      const title = r.title || 'Untitled';
      if (opts?.query) {
        const q = opts.query.toLowerCase();
        const hay = `${title} ${c.displayName} ${classification} ${proj?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      out.push({
        id: r.id,
        title,
        kind: r.kind,
        webUrl: String(r.fields.webUrl || r.provenance.sourceUrl || '') || undefined,
        path: r.fields.path ? String(r.fields.path) : undefined,
        classification: classification || undefined,
        confidentiality,
        clientId: c.id,
        clientName: c.displayName,
        projectId: proj?.id,
        projectName: proj?.name,
        owner: String(r.fields.accountEmail || r.provenance.sourceAccount || '') || undefined,
        modifiedAt: String(r.fields.occurredAt || r.provenance.originalModifiedAt || '') || undefined,
        version: r.fields.version ? String(r.fields.version) : undefined,
        sourceSystem: String(r.provenance.sourceSystem || r.provenance.provider || 'microsoft'),
        sensitivityRestricted: restricted,
      });
      if (out.length >= 1000) break;
    }
    if (out.length >= 1000) break;
  }

  // Unused intentionally — keeps clientById referenced for future owner scoping
  void clientById;

  out.sort((a, b) => String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')));
  return { documents: out, restrictedOmitted };
}
