/**
 * Idempotent recovery sweep for the existing fabric engine.
 *
 * OPEN_SOURCE: microsoft-graph-client (MIT) evaluated 2026-08-24.
 * DECISION: ADAPT the existing allowlisted FabricGraphClient.
 * A second Graph SDK would duplicate path allowlisting, owner-mailbox
 * guards, and non-fatal source handling. REJECT adding that stack.
 * MONITOR upstream Graph delta docs; do not ADOPT a second client.
 */

import { createFabricGraphClient } from './graph.ts';
import { runFabricSync, type FabricSyncResult } from './sync.ts';
import { fabricSweepIntervalMs, isFabricSweepEnabled, recordFabricSweepAttempt } from './status.ts';
import { ensureFabricChangeSubscriptions } from './subscriptions.ts';
import { createManagedIdentityTokenProvider, fabricMsiTokenProviderOptions } from '../token.ts';
import type { SharePointPmService } from '../repository.ts';
import type { AppConfig } from '../../../config.ts';
import type { PmGraphTokenProvider } from '../token.ts';

export interface FabricSweepHandle {
  stop: () => void;
  requestSync: (trigger: string) => Promise<{ accepted: boolean; queued: boolean }>;
}

export function startFabricRecoverySweep(opts: {
  enabled: boolean;
  intervalMs?: number;
  initialDelayMs?: number;
  run: () => Promise<void>;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
  log?: (rec: Record<string, unknown>) => void;
}): FabricSweepHandle {
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  const setTimer = opts.setTimeoutFn ?? setTimeout;
  const clearTimer = opts.clearTimeoutFn ?? clearTimeout;
  const log = opts.log ?? ((rec) => console.info(JSON.stringify(rec)));
  let stopped = false;
  let inFlight = false;

  let queued = false;

  const requestSync = async (trigger: string): Promise<{ accepted: boolean; queued: boolean }> => {
    if (stopped) return { accepted: false, queued: false };
    if (inFlight) {
      queued = true;
      log({ level: 'info', msg: 'fabric_sweep_skipped_overlap', trigger });
      return { accepted: true, queued: true };
    }
    inFlight = true;
    try {
      do {
        queued = false;
        await opts.run();
      } while (queued && !stopped);
      return { accepted: true, queued: false };
    } finally {
      inFlight = false;
    }
  };

  const tick = async (trigger: 'startup' | 'scheduled') => {
    await requestSync(trigger);
  };

  if (!opts.enabled) {
    log({ level: 'info', msg: 'fabric_sweep_disabled' });
    return {
      stop() {
        stopped = true;
      },
      requestSync,
    };
  }

  const initialDelayMs = opts.initialDelayMs ?? 20_000;
  const intervalMs = opts.intervalMs ?? 15 * 60 * 1000;

  timers.push(
    setTimer(() => {
      void tick('startup').then(() => {
        if (stopped) return;
        const loop = () => {
          timers.push(
            setTimer(() => {
              void tick('scheduled').then(() => {
                if (!stopped) loop();
              });
            }, intervalMs),
          );
        };
        loop();
      });
    }, initialDelayMs),
  );

  return {
    stop() {
      stopped = true;
      for (const t of timers) clearTimer(t);
    },
    requestSync,
  };
}

export function startConfiguredFabricSweep(opts: {
  cfg: AppConfig;
  sharepoint: SharePointPmService | null | undefined;
  env?: NodeJS.Dict<string | undefined>;
  tokenProvider?: PmGraphTokenProvider;
  now?: () => number;
}): FabricSweepHandle | null {
  const env = opts.env ?? process.env;
  const enabled =
    Boolean(opts.sharepoint && opts.cfg.pmBackend.sharepoint) && isFabricSweepEnabled(env);
  if (!opts.sharepoint || !opts.cfg.pmBackend.sharepoint) return null;

  const tokenProvider =
    opts.tokenProvider ||
    opts.cfg.pmTokenProvider ||
    createManagedIdentityTokenProvider(
      opts.cfg.pmBackend.sharepoint.managedIdentityClientId,
      fabricMsiTokenProviderOptions(),
    );

  return startFabricRecoverySweep({
    enabled,
    intervalMs: fabricSweepIntervalMs(env),
    initialDelayMs: 20_000,
    run: async () => {
      recordFabricSweepAttempt(opts.cfg.dataDir, ['Fabric recovery sweep started.']);
      let lastErr: unknown;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          const fabric = createFabricGraphClient(tokenProvider, { timeoutMs: 25_000 });
          await ensureFabricChangeSubscriptions({
            fabric,
            dataDir: opts.cfg.dataDir,
            env,
          });
          const result: FabricSyncResult = await runFabricSync({
            service: opts.sharepoint as SharePointPmService,
            fabric,
            dataDir: opts.cfg.dataDir,
            bootstrap: true,
          });
          console.info(
            JSON.stringify({
              level: 'info',
              msg: attempt === 1 ? 'fabric_sweep_complete' : 'fabric_bootstrap_complete',
              indexed: result.indexed,
              mailMode: result.checkpoint.mailMode || 'none',
              mailDeltaReady: result.checkpoint.mailDeltaReady === true,
              mailSkipPresent: Boolean(result.checkpoint.mailSkip),
              attempt,
            }),
          );
          return;
        } catch (err) {
          lastErr = err;
          const detail = err instanceof Error ? err.message : String(err);
          recordFabricSweepAttempt(opts.cfg.dataDir, [
            `Fabric sweep attempt ${attempt} failed: ${detail}`,
          ]);
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'fabric_bootstrap_retry',
              attempt,
              detail: String(err),
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 8_000));
        }
      }
      recordFabricSweepAttempt(opts.cfg.dataDir, [
        `Fabric sweep did not complete: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      ]);
      console.error(JSON.stringify({ level: 'error', msg: 'fabric_bootstrap_failed', detail: String(lastErr) }));
    },
  });
}
