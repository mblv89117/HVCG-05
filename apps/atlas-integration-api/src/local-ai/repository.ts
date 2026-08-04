/**
 * Local AI Operations store — separate from integration credentials.
 * Never stores Production secrets or provider tokens.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AiAuditEvent,
  AiJobRecord,
  OperationsQueueItem,
} from '@hvcg/atlas-integration-core';

export interface LocalAiStoreSnapshot {
  version: number;
  aiJobs: AiJobRecord[];
  auditEvents: AiAuditEvent[];
  operationsQueue: OperationsQueueItem[];
  authoritativeWriteAttempts: Array<{
    id: string;
    at: string;
    aiJobId: string;
    action: string;
    blocked: true;
    detail: string;
  }>;
}

function empty(): LocalAiStoreSnapshot {
  return {
    version: 1,
    aiJobs: [],
    auditEvents: [],
    operationsQueue: [],
    authoritativeWriteAttempts: [],
  };
}

export class LocalAiRepository {
  private data: LocalAiStoreSnapshot;
  private path: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'local-ai-operations.json');
    if (existsSync(this.path)) {
      const raw = JSON.parse(readFileSync(this.path, 'utf8')) as LocalAiStoreSnapshot;
      this.data = { ...empty(), ...raw };
    } else {
      this.data = empty();
      this.persist();
    }
  }

  private persist() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  listJobs(): AiJobRecord[] {
    return [...this.data.aiJobs];
  }

  getJob(aiJobId: string): AiJobRecord | undefined {
    return this.data.aiJobs.find((j) => j.aiJobId === aiJobId);
  }

  findByIdempotencyKey(key: string): AiJobRecord | undefined {
    return this.data.aiJobs.find((j) => j.idempotencyKey === key);
  }

  upsertJob(job: AiJobRecord) {
    const i = this.data.aiJobs.findIndex((j) => j.aiJobId === job.aiJobId);
    if (i >= 0) this.data.aiJobs[i] = job;
    else this.data.aiJobs.push(job);
    this.persist();
  }

  appendAudit(event: Omit<AiAuditEvent, 'id'> & { id?: string }) {
    const row: AiAuditEvent = {
      id: event.id || randomUUID(),
      auditCorrelationId: event.auditCorrelationId,
      aiJobId: event.aiJobId,
      at: event.at,
      actor: event.actor,
      action: event.action,
      detail: event.detail,
      previousStatus: event.previousStatus,
      nextStatus: event.nextStatus,
    };
    this.data.auditEvents.push(row);
    this.persist();
    return row;
  }

  listAudit(aiJobId?: string): AiAuditEvent[] {
    const rows = aiJobId
      ? this.data.auditEvents.filter((e) => e.aiJobId === aiJobId)
      : this.data.auditEvents;
    return [...rows].sort((a, b) => a.at.localeCompare(b.at));
  }

  recordBlockedAuthoritativeWrite(input: {
    aiJobId: string;
    action: string;
    detail: string;
  }) {
    this.data.authoritativeWriteAttempts.push({
      id: randomUUID(),
      at: new Date().toISOString(),
      aiJobId: input.aiJobId,
      action: input.action,
      blocked: true,
      detail: input.detail,
    });
    this.persist();
  }

  listBlockedWrites() {
    return [...this.data.authoritativeWriteAttempts];
  }

  listOperationsQueue(): OperationsQueueItem[] {
    return [...this.data.operationsQueue];
  }

  getOperationsItem(id: string): OperationsQueueItem | undefined {
    return this.data.operationsQueue.find((i) => i.id === id);
  }

  upsertOperationsItem(item: OperationsQueueItem) {
    const i = this.data.operationsQueue.findIndex((x) => x.id === item.id);
    if (i >= 0) this.data.operationsQueue[i] = item;
    else this.data.operationsQueue.push(item);
    this.persist();
  }
}
