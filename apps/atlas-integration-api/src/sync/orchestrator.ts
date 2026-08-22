import {
  DEFAULT_RETRY,
  type ProviderId,
  type SyncErrorRecord,
  type SyncJobRecord,
} from '@hvcg/atlas-integration-core';
import type { IntegrationRepository } from '../store/repository.ts';
import type { AppRegistry } from '../connectors/registry.ts';

const MAX_DEAD_LETTER_ATTEMPTS = DEFAULT_RETRY.maxAttempts;

export interface SyncOrchestratorDeps {
  repo: IntegrationRepository;
  app: AppRegistry;
}

export async function runSyncForConnection(
  deps: SyncOrchestratorDeps,
  connectionId: string,
  trigger: SyncJobRecord['trigger'] = 'manual',
): Promise<SyncJobRecord> {
  const conn = deps.repo.getConnection(connectionId);
  if (!conn) throw Object.assign(new Error('Connection not found'), { status: 404 });

  const adapter = deps.app.registry.getAdapter(conn.providerId);
  if (!adapter) throw new Error(`No adapter for ${conn.providerId}`);

  const jobId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const job: SyncJobRecord = {
    id: jobId,
    connectionId,
    providerId: conn.providerId,
    trigger,
    status: 'running',
    startedAt,
    recordsImported: 0,
    recordsSkipped: 0,
    duplicatesPrevented: 0,
    errorCount: 0,
  };
  deps.repo.saveSyncJob(job);

  try {
    const result = await adapter.syncNow({ connectionId, mode: 'full' });
    const finished: SyncJobRecord = {
      ...result.job,
      id: jobId,
      trigger,
      startedAt,
      status: result.job.errorCount > 0 ? 'partial' : 'succeeded',
    };
    deps.repo.saveSyncJob(finished);
    const latest = deps.repo.getConnection(connectionId) || conn;
    deps.repo.upsertConnection({
      ...latest,
      lastSuccessfulSyncAt: new Date().toISOString(),
      status: 'Connected',
      recordsImported:
        latest.recordsImported ||
        result.job.recordsImported ||
        deps.repo.countSourceRecordsForConnection(connectionId),
      errorState: undefined,
      updatedAt: new Date().toISOString(),
    });
    return finished;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await recordSyncError(deps, connectionId, conn.providerId, jobId, message);
    const failed: SyncJobRecord = {
      ...job,
      status: 'failed',
      finishedAt: new Date().toISOString(),
      errorCount: 1,
      detail: message.slice(0, 500),
    };
    deps.repo.saveSyncJob(failed);
    deps.repo.upsertConnection({
      ...conn,
      status: 'Error',
      errorState: message.slice(0, 200),
      updatedAt: new Date().toISOString(),
    });
    return failed;
  }
}

async function recordSyncError(
  deps: SyncOrchestratorDeps,
  connectionId: string,
  providerId: ProviderId,
  syncJobId: string,
  message: string,
): Promise<void> {
  const existing = deps.repo.listSyncErrors(connectionId, 100).find((e) => e.code === 'sync_failure');
  const attempts = (existing?.attempts || 0) + 1;
  const err: SyncErrorRecord = {
    id: existing?.id || crypto.randomUUID(),
    connectionId,
    syncJobId,
    providerId,
    code: 'sync_failure',
    message: message.slice(0, 500),
    retryable: attempts < MAX_DEAD_LETTER_ATTEMPTS,
    attempts,
    deadLetter: attempts >= MAX_DEAD_LETTER_ATTEMPTS,
    createdAt: existing?.createdAt || new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
  };
  deps.repo.saveSyncError(err);
}

export async function runBatchSync(
  deps: SyncOrchestratorDeps,
  connectionIds: string[],
): Promise<SyncJobRecord[]> {
  // Run connections concurrently so multi-mailbox Microsoft ingestion proceeds together.
  const settled = await Promise.allSettled(
    connectionIds.map((connectionId) => runSyncForConnection(deps, connectionId, 'scheduled')),
  );
  const results: SyncJobRecord[] = [];
  for (const item of settled) {
    if (item.status === 'fulfilled') results.push(item.value);
  }
  return results;
}
