import type { AppConfig } from '../config.ts';
import type { QboRepository } from '../store/repository.ts';
import { audit } from '../audit/auditLog.ts';
import { syncConnection } from './syncService.ts';

/**
 * Background incremental sync scheduler.
 * Tick only syncs Connected / Error connections (skips Disconnected / PendingOAuth).
 */
export function startSyncScheduler(repo: QboRepository, cfg: AppConfig): NodeJS.Timeout {
  const tick = async () => {
    const active = repo.listActiveConnections().filter((c) => c.status !== 'Syncing');
    audit({
      action: 'scheduler_tick',
      outcome: 'success',
      detail: `candidates=${active.length}`,
    });
    for (const conn of active) {
      try {
        await syncConnection(repo, cfg, conn.id, { resume: true });
      } catch {
        // Individual failures audited inside syncConnection
      }
    }
  };

  // Delay first tick slightly so server can finish boot
  const handle = setInterval(() => {
    void tick();
  }, cfg.syncIntervalMs);
  handle.unref?.();
  return handle;
}
