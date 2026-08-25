/**
 * Scheduled business-memory backfill after fabric sweep — no owner API action required.
 */

import type { AppConfig } from '../../config.ts';
import { buildKnowledgeOperatingPicture } from '../sharepoint/knowledgeOperating.ts';
import { createFabricGraphClient, type FabricGraphClient } from '../sharepoint/fabric/graph.ts';
import { isFabricSweepEnabled } from '../sharepoint/fabric/status.ts';
import { bootstrapMannyPrincipal } from '../sharepoint/manny.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from '../sharepoint/token.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { operatorOperatingPictureFromKnowledge } from './model.ts';
import {
  runCurrentClientBackfill,
  emitBusinessMemoryGovernedTriggers,
  probeHvsHistoricalMailboxRead,
} from './clientBusinessMemory.ts';
import {
  readBusinessMemoryOverlay,
  resolveBusinessMemoryDir,
  writeBusinessMemoryOverlay,
} from './businessMemoryState.ts';

let backfillInFlight: Promise<{ ran: boolean; skipped?: string; enumerated?: number }> | null = null;

export async function runScheduledBusinessMemoryBackfill(opts: {
  cfg: AppConfig;
  sharepoint: SharePointPmService;
  fabric?: FabricGraphClient;
  trigger?: string;
}): Promise<{ ran: boolean; skipped?: string; enumerated?: number }> {
  if (backfillInFlight) {
    return { ran: false, skipped: 'overlap' };
  }

  const memDir = resolveBusinessMemoryDir(opts.cfg.dataDir);
  const overlay = readBusinessMemoryOverlay(memDir);
  if (overlay.backfillInProgress) {
    return { ran: false, skipped: 'lock' };
  }

  const run = async (): Promise<{ ran: boolean; skipped?: string; enumerated?: number }> => {
    overlay.backfillInProgress = true;
    overlay.backfillStartedAt = new Date().toISOString();
    writeBusinessMemoryOverlay(memDir, overlay);

    try {
      const operational =
        typeof opts.sharepoint.listCurrentOperationalClients === 'function'
          ? await opts.sharepoint.listCurrentOperationalClients()
          : [];
      const clientCodes = operational
        .map((c) => c.clientCode)
        .filter((code) => code && code !== '*');
      if (!clientCodes.length) {
        return { ran: false, skipped: 'no_active_clients' };
      }

      const principal = bootstrapMannyPrincipal(clientCodes);
      const knowledge = await buildKnowledgeOperatingPicture(opts.sharepoint, principal, {
        dataDir: opts.cfg.dataDir,
      });
      const picture = operatorOperatingPictureFromKnowledge(knowledge);

      const fabric =
        opts.fabric ||
        createFabricGraphClient(
          opts.cfg.pmTokenProvider ||
            createManagedIdentityTokenProvider(
              opts.cfg.pmBackend.sharepoint?.managedIdentityClientId || '',
              { resource: GRAPH_TOKEN_RESOURCE, timeoutMs: 15_000 },
            ),
        );

      await probeHvsHistoricalMailboxRead({
        fabric,
        dataDir: opts.cfg.dataDir,
        env: process.env,
      });

      const result = await runCurrentClientBackfill({
        dataDir: opts.cfg.dataDir,
        principal,
        picture,
        service: opts.sharepoint,
        skipFabricSync: true,
        sweepEnabled: isFabricSweepEnabled(),
        bootstrapEnumeration: true,
        operationalClients: operational,
      });

      await emitBusinessMemoryGovernedTriggers({
        dataDir: opts.cfg.dataDir,
        principal,
        overlay: result,
      });

      const enumerated = result.identityMap.length;
      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'business_memory_backfill_complete',
          trigger: opts.trigger || 'scheduled_sweep',
          enumerated,
          backfilled: result.progress.currentClientsBackfilled,
          partial: result.progress.currentClientsPartial,
        }),
      );
      return { ran: true, enumerated };
    } finally {
      const latest = readBusinessMemoryOverlay(memDir);
      latest.backfillInProgress = false;
      writeBusinessMemoryOverlay(memDir, latest);
    }
  };

  backfillInFlight = run().finally(() => {
    backfillInFlight = null;
  });
  return await backfillInFlight;
}
