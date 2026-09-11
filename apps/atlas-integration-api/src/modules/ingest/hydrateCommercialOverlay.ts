/**
 * Rehydrate commercial overlay for a ClientCode from durable ingest stores.
 * Local JSON store is always consulted; Azure Table is used when configured.
 * Does not invent observations — only replays persisted envelopes.
 */
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import type { CommercialOverlay } from '../../pm/commercialContext/types.ts';
import { emptyOverlay, loadOverlay, saveOverlay } from '../../pm/commercialContext/store.ts';
import {
  listIngestsByClientCode,
  resolveAzureTableIngestConfig,
} from './azureTableStore.ts';
import { applyEnvelopeToOverlay } from './projectToCommercialOverlay.ts';
import { loadIngestStore } from './store.ts';

function mergeEnvelope(
  overlay: CommercialOverlay,
  envelope: AtlasIntegrationEnvelope,
): { overlay: CommercialOverlay; changed: boolean } {
  const result = applyEnvelopeToOverlay(overlay, envelope);
  return { overlay: result.overlay, changed: Boolean(result.projected && !result.replay) };
}

export async function hydrateCommercialOverlayForClient(opts: {
  dataDir: string;
  clientCode: string;
  env?: NodeJS.Dict<string>;
  persist?: boolean;
}): Promise<{ overlay: CommercialOverlay; hydratedFrom: string[]; applied: number }> {
  let overlay = loadOverlay(opts.dataDir);
  const hydratedFrom: string[] = [];
  let applied = 0;

  const local = loadIngestStore(opts.dataDir);
  for (const record of Object.values(local.byIdempotencyKey)) {
    if (record.envelope?.clientCode !== opts.clientCode) continue;
    const merged = mergeEnvelope(overlay, record.envelope);
    overlay = merged.overlay;
    if (merged.changed) applied += 1;
    if (!hydratedFrom.includes('local-json')) hydratedFrom.push('local-json');
  }

  const tableCfg = resolveAzureTableIngestConfig(opts.env ?? process.env);
  if (tableCfg) {
    try {
      const rows = await listIngestsByClientCode({
        cfg: tableCfg,
        clientCode: opts.clientCode,
      });
      if (rows.length) {
        hydratedFrom.push('azure-table');
        for (const row of rows) {
          if (row.envelope?.clientCode !== opts.clientCode) continue;
          const merged = mergeEnvelope(overlay, row.envelope);
          overlay = merged.overlay;
          if (merged.changed) applied += 1;
        }
      }
    } catch {
      hydratedFrom.push('azure-table-unavailable');
    }
  }

  if (opts.persist !== false && applied > 0) {
    saveOverlay(opts.dataDir, overlay);
  }

  if (!hydratedFrom.length) {
    return { overlay: overlay ?? emptyOverlay(), hydratedFrom: ['overlay-only'], applied: 0 };
  }

  return { overlay, hydratedFrom, applied };
}
