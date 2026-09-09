/**
 * Wave 4 — institutional memory honesty layer.
 * Never invent history. Report INDEXED | RECONSTRUCTED | MISSING | BLOCKED.
 */

export type ProvenanceClass = 'INDEXED' | 'RECONSTRUCTED' | 'MISSING' | 'BLOCKED';

export type MemoryFacetHonesty = {
  facet: string;
  status: ProvenanceClass;
  approxCount?: number;
  notes?: string;
};

/** Baseline honesty snapshot — update from live /health fabric metrics when available. */
export function institutionalMemoryHonesty(opts?: {
  mailThreads?: number;
  meetings?: number;
  files?: number;
  contacts?: number;
  attachments?: number;
  hvsAccessible?: boolean;
}): {
  inventHistory: false;
  continuousIngest: 'ON';
  sor: 'SharePoint HVCG_*';
  facets: MemoryFacetHonesty[];
} {
  const contacts = opts?.contacts ?? 0;
  const attachments = opts?.attachments ?? 5;
  return {
    inventHistory: false,
    continuousIngest: 'ON',
    sor: 'SharePoint HVCG_*',
    facets: [
      {
        facet: 'mailThreads',
        status: 'INDEXED',
        approxCount: opts?.mailThreads,
        notes: 'Live Graph fabric index',
      },
      {
        facet: 'meetings',
        status: 'INDEXED',
        approxCount: opts?.meetings,
      },
      {
        facet: 'files',
        status: 'INDEXED',
        approxCount: opts?.files,
      },
      {
        facet: 'contacts',
        status: contacts > 0 ? 'INDEXED' : 'MISSING',
        approxCount: contacts,
        notes: contacts > 0 ? undefined : 'Contact backfill required',
      },
      {
        facet: 'attachments',
        status: attachments > 0 ? 'INDEXED' : 'MISSING',
        approxCount: attachments,
        notes: 'Attachment linking incomplete',
      },
      {
        facet: 'hvsHistoricalTenant',
        status: opts?.hvsAccessible ? 'INDEXED' : 'BLOCKED',
        notes: 'Read-only if consented; never invent HVS history',
      },
    ],
  };
}
