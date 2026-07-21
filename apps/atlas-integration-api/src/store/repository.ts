import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  decryptSecret,
  encryptSecret,
  sourceDedupeKey,
  type AuditEventRecord,
  type CanonicalRecord,
  type ConnectionRecord,
  type DiscoveredResource,
  type ProviderId,
  type SyncErrorRecord,
  type SyncJobRecord,
} from '@hvcg/atlas-integration-core';
import type {
  CheckpointRecord,
  Client360Candidate,
  CredentialBlob,
  OAuthStateRecord,
  StoreSnapshot,
  TokenPayload,
  WebhookEventRecord,
} from './types.ts';

const empty = (): StoreSnapshot => ({
  connections: [],
  credentials: [],
  oauthStates: [],
  sourceRecords: [],
  sourceDedupeIndex: {},
  syncJobs: [],
  syncErrors: [],
  auditEvents: [],
  checkpoints: [],
  webhooks: [],
  discoveredResources: [],
  client360: [],
});

function normalizeConnection(c: ConnectionRecord): ConnectionRecord {
  return {
    ...c,
    businessEntity: c.businessEntity || 'unknown',
    recordsDiscovered: c.recordsDiscovered ?? 0,
    recordsImported: c.recordsImported ?? 0,
    accountDisplayName: c.accountDisplayName || c.accountName,
    mailboxType: c.mailboxType || 'n/a',
    encryptedCredentialsRef: c.encryptedCredentialsRef || c.id,
  };
}

export class IntegrationRepository {
  private data: StoreSnapshot;
  private path: string;
  private encryptionKey: string;

  constructor(dataDir: string, encryptionKeyB64: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'integration-store.json');
    this.encryptionKey = encryptionKeyB64;
    if (existsSync(this.path)) {
      const raw = JSON.parse(readFileSync(this.path, 'utf8')) as StoreSnapshot;
      this.data = {
        ...empty(),
        ...raw,
        sourceDedupeIndex: raw.sourceDedupeIndex || {},
        discoveredResources: raw.discoveredResources || [],
        client360: raw.client360 || [],
        connections: (raw.connections || []).map((c) => normalizeConnection(c)),
      };
    } else {
      this.data = empty();
      this.persist();
    }
  }

  private persist() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  upsertConnection(conn: ConnectionRecord) {
    const normalized = normalizeConnection(conn);
    const i = this.data.connections.findIndex((c) => c.id === normalized.id);
    if (i >= 0) this.data.connections[i] = normalized;
    else this.data.connections.push(normalized);
    this.persist();
  }

  getConnection(id: string): ConnectionRecord | undefined {
    const c = this.data.connections.find((x) => x.id === id && !x.disconnectedAt);
    return c ? normalizeConnection(c) : undefined;
  }

  /**
   * List connections. Multi-account: does NOT collapse by provider.
   * Omit ownerUserId to return every active connection (admin inventory).
   */
  listConnections(filter?: {
    ownerUserId?: string;
    providerId?: ProviderId;
    businessEntity?: string;
  }): ConnectionRecord[] {
    return this.data.connections
      .filter((c) => {
        if (c.disconnectedAt) return false;
        if (filter?.ownerUserId && c.ownerUserId !== filter.ownerUserId) return false;
        if (filter?.providerId && c.providerId !== filter.providerId) return false;
        if (filter?.businessEntity && c.businessEntity !== filter.businessEntity) return false;
        return true;
      })
      .map(normalizeConnection);
  }

  markDisconnected(connectionId: string) {
    const conn = this.getConnection(connectionId);
    if (!conn) return;
    const now = new Date().toISOString();
    this.upsertConnection({
      ...conn,
      status: 'Disconnected',
      disconnectedAt: now,
      updatedAt: now,
    });
  }

  saveCredentials(connectionId: string, tokens: TokenPayload) {
    // Credentials keyed ONLY by connectionId — accounts never collide.
    const ciphertext = encryptSecret(JSON.stringify(tokens), this.encryptionKey);
    const now = new Date().toISOString();
    const blob: CredentialBlob = { connectionId, ciphertext, updatedAt: now };
    const i = this.data.credentials.findIndex((c) => c.connectionId === connectionId);
    if (i >= 0) this.data.credentials[i] = blob;
    else this.data.credentials.push(blob);
    this.persist();
  }

  getCredentials(connectionId: string): TokenPayload | undefined {
    const blob = this.data.credentials.find((c) => c.connectionId === connectionId);
    if (!blob) return undefined;
    try {
      return JSON.parse(decryptSecret(blob.ciphertext, this.encryptionKey)) as TokenPayload;
    } catch {
      return undefined;
    }
  }

  wipeCredentials(connectionId: string) {
    const i = this.data.credentials.findIndex((c) => c.connectionId === connectionId);
    if (i >= 0) {
      this.data.credentials[i] = {
        connectionId,
        ciphertext: encryptSecret('REVOKED', this.encryptionKey),
        updatedAt: new Date().toISOString(),
      };
      this.persist();
    }
  }

  saveOAuthState(state: OAuthStateRecord) {
    this.data.oauthStates.push(state);
    this.persist();
  }

  getOAuthState(stateId: string): OAuthStateRecord | undefined {
    const now = Date.now();
    return this.data.oauthStates.find((s) => {
      if (s.id !== stateId) return false;
      return new Date(s.expiresAt).getTime() > now;
    });
  }

  consumeOAuthState(stateId: string): OAuthStateRecord | undefined {
    const state = this.getOAuthState(stateId);
    if (!state) return undefined;
    this.data.oauthStates = this.data.oauthStates.filter((s) => s.id !== stateId);
    this.persist();
    return state;
  }

  upsertSourceRecord(record: CanonicalRecord, opts?: { deferPersist?: boolean }): 'imported' | 'duplicate' {
    const key = sourceDedupeKey(
      record.provenance.provider,
      record.provenance.sourceAccount,
      record.provenance.sourceRecordId,
    );
    const existingId = this.data.sourceDedupeIndex[key];
    if (existingId) {
      const idx = this.data.sourceRecords.findIndex((r) => r.id === existingId);
      if (idx >= 0) {
        this.data.sourceRecords[idx] = { ...record, id: existingId };
        if (!opts?.deferPersist) this.persist();
      }
      return 'duplicate';
    }
    this.data.sourceRecords.push(record);
    this.data.sourceDedupeIndex[key] = record.id;
    if (!opts?.deferPersist) this.persist();
    return 'imported';
  }

  /** Batch upsert — single persist for deep Microsoft ingestion. */
  upsertSourceRecordsBatch(
    records: CanonicalRecord[],
  ): { imported: number; duplicates: number } {
    let imported = 0;
    let duplicates = 0;
    for (const record of records) {
      const result = this.upsertSourceRecord(record, { deferPersist: true });
      if (result === 'imported') imported++;
      else duplicates++;
    }
    this.persist();
    return { imported, duplicates };
  }

  listSourceRecords(connectionId?: string, limit = 100): CanonicalRecord[] {
    const rows = connectionId
      ? this.data.sourceRecords.filter(
          (r) =>
            r.provenance.sourceAccount === connectionId || r.fields.connectionId === connectionId,
        )
      : this.data.sourceRecords;
    return rows.slice(0, limit);
  }

  listAllSourceRecords(limit = 100_000): CanonicalRecord[] {
    return this.data.sourceRecords.slice(0, limit);
  }

  clearCheckpoints(connectionId: string, resourceTypes?: string[]) {
    this.data.checkpoints = this.data.checkpoints.filter((c) => {
      if (c.connectionId !== connectionId) return true;
      if (!resourceTypes?.length) return false;
      return !resourceTypes.includes(c.resourceType);
    });
    this.persist();
  }

  countSourceRecordsForConnection(connectionId: string): number {
    return this.data.sourceRecords.filter(
      (r) => r.provenance.sourceAccount === connectionId || r.fields.connectionId === connectionId,
    ).length;
  }

  replaceDiscoveredResources(connectionId: string, resources: DiscoveredResource[]) {
    this.data.discoveredResources = [
      ...this.data.discoveredResources.filter((r) => r.connectionId !== connectionId),
      ...resources,
    ];
    this.persist();
  }

  listDiscoveredResources(connectionId: string): DiscoveredResource[] {
    return this.data.discoveredResources.filter((r) => r.connectionId === connectionId);
  }

  saveClient360(candidates: Client360Candidate[]) {
    this.data.client360 = candidates;
    this.persist();
  }

  listClient360(): Client360Candidate[] {
    return this.data.client360;
  }

  saveSyncJob(job: SyncJobRecord) {
    const i = this.data.syncJobs.findIndex((j) => j.id === job.id);
    if (i >= 0) this.data.syncJobs[i] = job;
    else this.data.syncJobs.push(job);
    this.persist();
  }

  listSyncJobs(connectionId: string, limit = 50): SyncJobRecord[] {
    return this.data.syncJobs
      .filter((j) => j.connectionId === connectionId)
      .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))
      .slice(0, limit);
  }

  saveSyncError(err: SyncErrorRecord) {
    const i = this.data.syncErrors.findIndex((e) => e.id === err.id);
    if (i >= 0) this.data.syncErrors[i] = err;
    else this.data.syncErrors.push(err);
    this.persist();
  }

  listSyncErrors(connectionId: string, limit = 50): SyncErrorRecord[] {
    return this.data.syncErrors
      .filter((e) => e.connectionId === connectionId && !e.deadLetter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  countOpenErrors(connectionId: string): number {
    return this.data.syncErrors.filter((e) => e.connectionId === connectionId && !e.deadLetter)
      .length;
  }

  getCheckpoint(connectionId: string, resourceType: string): CheckpointRecord | undefined {
    return this.data.checkpoints.find(
      (c) => c.connectionId === connectionId && c.resourceType === resourceType,
    );
  }

  saveCheckpoint(checkpoint: CheckpointRecord) {
    const i = this.data.checkpoints.findIndex(
      (c) =>
        c.connectionId === checkpoint.connectionId && c.resourceType === checkpoint.resourceType,
    );
    if (i >= 0) this.data.checkpoints[i] = checkpoint;
    else this.data.checkpoints.push(checkpoint);
    this.persist();
  }

  saveWebhook(ev: WebhookEventRecord): boolean {
    if (this.data.webhooks.some((w) => w.id === ev.id)) return false;
    this.data.webhooks.push(ev);
    this.persist();
    return true;
  }

  markWebhook(id: string, status: WebhookEventRecord['status']) {
    const w = this.data.webhooks.find((x) => x.id === id);
    if (w) {
      w.status = status;
      w.processedAt = new Date().toISOString();
      this.persist();
    }
  }

  appendAudit(event: AuditEventRecord) {
    this.data.auditEvents.push(event);
    if (this.data.auditEvents.length > 10_000) {
      this.data.auditEvents = this.data.auditEvents.slice(-10_000);
    }
    this.persist();
  }

  listAudit(limit = 100): AuditEventRecord[] {
    return [...this.data.auditEvents].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }

  dashboardSummary() {
    const connections = this.listConnections();
    return {
      connections: connections.length,
      connectionCount: connections.length,
      byProvider: connections.reduce(
        (acc, c) => {
          acc[c.providerId] = (acc[c.providerId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byEntity: connections.reduce(
        (acc, c) => {
          const e = String(c.businessEntity || 'unknown');
          acc[e] = (acc[e] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byStatus: connections.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      sourceRecords: this.data.sourceRecords.length,
      syncJobs: this.data.syncJobs.length,
      syncJobCount: this.data.syncJobs.length,
      openErrors: this.data.syncErrors.filter((e) => !e.deadLetter).length,
      openErrorCount: this.data.syncErrors.filter((e) => !e.deadLetter).length,
      discoveredResources: this.data.discoveredResources.length,
      client360Candidates: this.data.client360.length,
      webhooksQueued: this.data.webhooks.filter((w) => w.status === 'queued').length,
    };
  }

  countByKind(kind: string): number {
    return this.data.sourceRecords.filter((r) => r.kind === kind).length;
  }
}
