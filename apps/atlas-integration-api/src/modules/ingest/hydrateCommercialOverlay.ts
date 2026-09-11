/**
 * Rehydrate commercial overlay for a ClientCode from durable ingest stores.
 * GET composition is pure in-memory: durable envelopes → projection → response.
 * Does not invent observations. Does not rewrite historical timestamps.
 * Disk persistence is opt-in (persist===true) and off by default.
 */
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import type { CommercialOverlay } from '../../pm/commercialContext/types.ts';
import { emptyOverlay, loadOverlay, saveOverlay } from '../../pm/commercialContext/store.ts';
import {
  listIngestsByClientCode,
  resolveAzureTableIngestConfig,
  type AzureTableListResult,
} from './azureTableStore.ts';
import { applyEnvelopeToOverlay } from './projectToCommercialOverlay.ts';
import { loadIngestStore } from './store.ts';

export type DurableHydrateStatus =
  | 'ok'
  | 'empty'
  | 'unavailable'
  | 'error'
  | 'truncated'
  | 'not_configured';

export type HydrateCommercialOverlayResult = {
  overlay: CommercialOverlay;
  hydratedFrom: string[];
  applied: number;
  durableStatus: DurableHydrateStatus;
  durableReason?: string;
  truncated: boolean;
  persisted: boolean;
};

function mergeEnvelope(
  overlay: CommercialOverlay,
  envelope: AtlasIntegrationEnvelope,
  recordedAtHint?: string,
): { overlay: CommercialOverlay; changed: boolean } {
  const result = applyEnvelopeToOverlay(overlay, envelope, { recordedAtHint });
  return { overlay: result.overlay, changed: Boolean(result.projected && !result.replay) };
}

function cloneOverlay(overlay: CommercialOverlay): CommercialOverlay {
  return {
    gccSignals: [...(overlay.gccSignals ?? [])],
    preCallBriefs: [...(overlay.preCallBriefs ?? [])],
    attributions: [...(overlay.attributions ?? [])],
    copilotAssessments: [...(overlay.copilotAssessments ?? [])],
  } as CommercialOverlay;
}

export async function hydrateCommercialOverlayForClient(opts: {
  dataDir: string;
  clientCode: string;
  env?: NodeJS.Dict<string>;
  /** GET paths must leave this false/undefined. Persistence is opt-in only. */
  persist?: boolean;
}): Promise<HydrateCommercialOverlayResult> {
  let overlay = cloneOverlay(loadOverlay(opts.dataDir) ?? emptyOverlay());
  const hydratedFrom: string[] = [];
  let applied = 0;
  let durableStatus: DurableHydrateStatus = 'not_configured';
  let durableReason: string | undefined;
  let truncated = false;

  const local = loadIngestStore(opts.dataDir);
  for (const record of Object.values(local.byIdempotencyKey)) {
    if (record.envelope?.clientCode !== opts.clientCode) continue;
    const hint = record.envelope.timestamp || record.receivedAt;
    const merged = mergeEnvelope(overlay, record.envelope, hint);
    overlay = merged.overlay;
    if (merged.changed) applied += 1;
    if (!hydratedFrom.includes('local-json')) hydratedFrom.push('local-json');
  }

  const tableCfg = resolveAzureTableIngestConfig(opts.env ?? process.env);
  if (tableCfg) {
    let listed: AzureTableListResult;
    try {
      listed = await listIngestsByClientCode({
        cfg: tableCfg,
        clientCode: opts.clientCode,
      });
    } catch (err) {
      listed = {
        status: 'UNAVAILABLE',
        records: [],
        truncated: false,
        pageCount: 0,
        httpStatus: 0,
        reason: err instanceof Error ? err.message : 'azure_table_list_threw',
      };
    }

    if (listed.status === 'SUCCESS_WITH_ROWS' || listed.status === 'SUCCESS_EMPTY') {
      durableStatus = listed.truncated
        ? 'truncated'
        : listed.status === 'SUCCESS_EMPTY'
          ? 'empty'
          : 'ok';
      truncated = listed.truncated;
      hydratedFrom.push('azure-table');
      for (const row of listed.records) {
        if (row.envelope?.clientCode !== opts.clientCode) continue;
        const hint = row.envelope.timestamp || row.receivedAt;
        const merged = mergeEnvelope(overlay, row.envelope, hint);
        overlay = merged.overlay;
        if (merged.changed) applied += 1;
      }
      if (listed.truncated) {
        hydratedFrom.push('azure-table-truncated');
        durableReason = 'durable_read_hit_safety_ceiling';
      }
    } else if (listed.status === 'UNAVAILABLE' || listed.status === 'ERROR') {
      durableStatus = listed.status === 'UNAVAILABLE' ? 'unavailable' : 'error';
      durableReason = listed.reason;
      hydratedFrom.push('azure-table-unavailable');
    }
  }

  const shouldPersist = opts.persist === true && applied > 0;
  if (shouldPersist) {
    saveOverlay(opts.dataDir, overlay);
  }

  if (!hydratedFrom.length) {
    return {
      overlay,
      hydratedFrom: ['overlay-only'],
      applied: 0,
      durableStatus,
      durableReason,
      truncated,
      persisted: false,
    };
  }

  return {
    overlay,
    hydratedFrom,
    applied,
    durableStatus,
    durableReason,
    truncated,
    persisted: shouldPersist,
  };
}
