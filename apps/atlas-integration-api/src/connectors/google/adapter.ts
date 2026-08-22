import {
  BaseIntegrationAdapter,
  contentHash,
  type AdapterAction,
  type CanonicalRecord,
  type ConnectRequest,
  type ConnectResult,
  type FetchChangesRequest,
  type FetchChangesResult,
  type FetchRecordRequest,
  type FileTransferRequest,
  type FileTransferResult,
  type ListResourcesRequest,
  type MutateRecordRequest,
  type PermissionMode,
  type ResourceDescriptor,
  type SearchRecordsRequest,
  type SyncNowRequest,
  type SyncNowResult,
  type TokenHealth,
} from '@hvcg/atlas-integration-core';
import type { AppConfig } from '../../config.ts';
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleFetch,
  GOOGLE_SCOPES,
  refreshGoogleToken,
} from '../../oauth/google.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import type { OAuthStateRecord, TokenPayload } from '../../store/types.ts';
import { nowIso, tokenExpiresAt, type AdapterDeps } from '../context.ts';

export class GoogleAdapter extends BaseIntegrationAdapter {
  readonly providerId = 'google' as const;
  readonly adapterVersion = '0.1.0';
  protected supportedActions = new Set<AdapterAction>([
    'connect',
    'disconnect',
    'verifyConnection',
    'refreshAuthentication',
    'getConnectionStatus',
    'listResources',
    'searchRecords',
    'fetchRecord',
    'fetchChanges',
    'downloadFile',
    'syncNow',
    'getSyncHistory',
    'getErrors',
  ]);

  constructor(
    private deps: AdapterDeps,
    private cfg: AppConfig,
    private repo: IntegrationRepository,
  ) {
    super();
  }

  protected getPermissionMode(connectionId: string): PermissionMode {
    return this.repo.getConnection(connectionId)?.permissionMode ?? 'read_only_discovery';
  }

  private requireConfigured(): void {
    if (!this.cfg.google.clientId || !this.cfg.google.clientSecret) {
      throw Object.assign(new Error('Google OAuth not configured'), { code: 'google_not_configured' });
    }
  }

  private getAccessToken(connectionId: string): string {
    const creds = this.repo.getCredentials(connectionId);
    if (!creds?.accessToken) throw new Error('No credentials for connection');
    return creds.accessToken;
  }

  async connect(request: ConnectRequest): Promise<ConnectResult> {
    this.requireConfigured();
    const connectionId = crypto.randomUUID();
    const state = crypto.randomUUID();
    const scopes = request.scopes?.length ? request.scopes : GOOGLE_SCOPES;
    this.repo.saveOAuthState({
      id: state,
      providerId: 'google',
      ownerUserId: request.ownerUserId,
      permissionMode: request.permissionMode,
      redirectUri: request.redirectUri,
      scopes,
      pendingConnectionId: connectionId,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    return {
      authorizationUrl: buildGoogleAuthorizeUrl(this.cfg, state, scopes),
      state,
      connection: {
        id: connectionId,
        providerId: 'google',
        providerName: 'Google Workspace',
        businessEntity: String(request.metadata?.businessEntity || 'unknown'),
        accountName: 'Pending',
        mailboxType: 'user',
        ownerUserId: request.ownerUserId,
        authType: 'oauth2_delegated',
        permissionMode: request.permissionMode,
        scopes,
        status: 'Connecting',
        environment: request.environment,
        connectedAt: nowIso(),
        requiresReauthorization: false,
        autoSyncEnabled: true,
        recordsDiscovered: 0,
        recordsImported: 0,
        resourceSelections: [],
        encryptedCredentialsRef: connectionId,
        metadata: request.metadata || {},
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    };
  }

  async completeOAuth(code: string, stateId: string): Promise<{ connectionId: string }> {
    const state = this.repo.consumeOAuthState(stateId);
    if (!state) throw new Error('Invalid or expired OAuth state');
    const tokens = await exchangeGoogleCode(this.cfg, code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const connectionId = state.pendingConnectionId;
    const now = nowIso();
    const { extractDomain, inferBusinessEntity } = await import('@hvcg/atlas-integration-core');
    const { runDiscoveryForConnection } = await import('../../discovery/discover.ts');
    const domain = extractDomain(profile.email);
    const businessEntity =
      state.businessEntity ||
      inferBusinessEntity({ email: profile.email, domain, displayName: profile.name });
    this.repo.saveCredentials(connectionId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokenExpiresAt(tokens.expires_in),
      tokenType: tokens.token_type,
      scope: tokens.scope,
      accountLogin: profile.email,
      accountId: profile.sub,
    });
    this.repo.upsertConnection({
      id: connectionId,
      providerId: 'google',
      providerName: 'Google Workspace',
      businessEntity,
      accountName: profile.name || profile.email,
      accountDisplayName: profile.name,
      accountEmail: profile.email,
      tenantOrOrg: domain,
      domain,
      mailboxType: 'user',
      ownerUserId: state.ownerUserId,
      authType: 'oauth2_delegated',
      permissionMode: state.permissionMode,
      scopes: state.scopes,
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      lastTokenRefreshAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: connectionId,
      metadata: { googleSub: profile.sub },
      createdAt: now,
      updatedAt: now,
    });
    try {
      await runDiscoveryForConnection(this.repo, connectionId);
    } catch {
      /* gaps recorded in discovery */
    }
    return { connectionId };
  }

  async disconnect(connectionId: string): Promise<void> {
    this.repo.wipeCredentials(connectionId);
    this.repo.markDisconnected(connectionId);
  }

  async verifyConnection(connectionId: string): Promise<{ ok: boolean; detail: string }> {
    if (!this.cfg.google.clientId) {
      return { ok: false, detail: 'Google OAuth not configured' };
    }
    const creds = this.repo.getCredentials(connectionId);
    if (!creds) return { ok: false, detail: 'No credentials stored' };
    try {
      await fetchGoogleProfile(creds.accessToken);
      return { ok: true, detail: 'Google userinfo verified' };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : 'Verification failed' };
    }
  }

  async refreshAuthentication(connectionId: string): Promise<TokenHealth> {
    const creds = this.repo.getCredentials(connectionId);
    if (!creds?.refreshToken) {
      return {
        healthy: false,
        refreshSupported: false,
        requiresReauthorization: true,
        detail: 'No refresh token',
      };
    }
    const tokens = await refreshGoogleToken(this.cfg, creds.refreshToken);
    const now = nowIso();
    this.repo.saveCredentials(connectionId, {
      ...creds,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || creds.refreshToken,
      expiresAt: tokenExpiresAt(tokens.expires_in),
    });
    return {
      healthy: true,
      expiresAt: tokenExpiresAt(tokens.expires_in),
      lastRefreshAt: now,
      refreshSupported: true,
      requiresReauthorization: false,
    };
  }

  async getConnectionStatus(connectionId: string) {
    return this.repo.getConnection(connectionId)?.status ?? 'Disconnected';
  }

  async listResources(request: ListResourcesRequest): Promise<{ items: ResourceDescriptor[] }> {
    const token = this.getAccessToken(request.connectionId);
    const items: ResourceDescriptor[] = [];
    const labels = await googleFetch<{ labels: Array<{ id: string; name: string }> }>(
      token,
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    );
    items.push(
      ...labels.labels.map((l) => ({
        resourceType: 'gmailLabel',
        resourceId: l.id,
        displayName: l.name,
      })),
    );
    const drives = await googleFetch<{ files: Array<{ id: string; name: string; webViewLink?: string }> }>(
      token,
      'https://www.googleapis.com/drive/v3/files?pageSize=25&q=mimeType%3D%27application%2Fvnd.google-apps.folder%27',
    );
    items.push(
      ...drives.files.map((f) => ({
        resourceType: 'driveFolder',
        resourceId: f.id,
        displayName: f.name,
        webUrl: f.webViewLink,
      })),
    );
    return { items };
  }

  async searchRecords(request: SearchRecordsRequest): Promise<{ items: CanonicalRecord[] }> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    const items: CanonicalRecord[] = [];
    const types = request.resourceTypes?.length ? request.resourceTypes : ['gmail', 'drive'];

    if (types.includes('gmail')) {
      const data = await googleFetch<{ messages?: Array<{ id: string }> }>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(request.query)}&maxResults=${request.limit || 25}`,
      );
      for (const m of data.messages || []) {
        const msg = await googleFetch<{
          id: string;
          snippet?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        }>(token, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata`);
        items.push(this.toEmailRecord(request.connectionId, conn, msg));
      }
    }
    if (types.includes('drive')) {
      const data = await googleFetch<{ files: Array<{ id: string; name: string; webViewLink?: string }> }>(
        token,
        `https://www.googleapis.com/drive/v3/files?pageSize=${request.limit || 25}&q=name+contains+'${encodeURIComponent(request.query)}'`,
      );
      for (const f of data.files) {
        items.push(this.toDocumentRecord(request.connectionId, conn, f));
      }
    }
    return { items };
  }

  async fetchRecord(request: FetchRecordRequest): Promise<CanonicalRecord> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    if (request.resourceType === 'gmail' || request.resourceType === 'mail') {
      const msg = await googleFetch<{
        id: string;
        snippet?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${request.recordId}?format=metadata`,
      );
      return this.toEmailRecord(request.connectionId, conn, msg);
    }
    const file = await googleFetch<{ id: string; name: string; webViewLink?: string }>(
      token,
      `https://www.googleapis.com/drive/v3/files/${request.recordId}`,
    );
    return this.toDocumentRecord(request.connectionId, conn, file);
  }

  async fetchChanges(request: FetchChangesRequest): Promise<FetchChangesResult> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    const checkpoint = this.repo.getCheckpoint(request.connectionId, 'gmail');
    const pageToken = checkpoint?.cursor || request.deltaToken;
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/history?maxResults=${request.limit || 50}&historyTypes=messageAdded`;
    if (pageToken) url += `&startHistoryId=${pageToken}`;
    const data = await googleFetch<{
      history?: Array<{ messages?: Array<{ id: string }> }>;
      historyId?: string;
    }>(token, url);
    const records: CanonicalRecord[] = [];
    for (const h of data.history || []) {
      for (const m of h.messages || []) {
        const msg = await googleFetch<{ id: string; snippet?: string }>(
          token,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata`,
        );
        records.push(this.toEmailRecord(request.connectionId, conn, msg));
      }
    }
    if (data.historyId) {
      this.repo.saveCheckpoint({
        connectionId: request.connectionId,
        resourceType: 'gmail',
        cursor: data.historyId,
        updatedAt: nowIso(),
      });
    }
    return { records, nextDeltaToken: data.historyId, hasMore: false };
  }

  async downloadFile(request: FileTransferRequest): Promise<FileTransferResult> {
    const token = this.getAccessToken(request.connectionId);
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${request.resourceId}?alt=media`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) throw new Error(`Drive download failed: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    return {
      resourceId: request.resourceId,
      fileName: request.fileName || 'download',
      contentType: resp.headers.get('content-type') || undefined,
      contentBase64: buf.toString('base64'),
      sizeBytes: buf.length,
    };
  }

  async createRecord(_request: MutateRecordRequest): Promise<CanonicalRecord> {
    this.ensureWritable(_request.connectionId, 'createRecord');
    throw new Error('Google adapter is read-only; create not implemented');
  }

  async syncNow(request: SyncNowRequest): Promise<SyncNowResult> {
    const changes = await this.fetchChanges({ connectionId: request.connectionId });
    let imported = 0;
    let duplicates = 0;
    for (const record of changes.records) {
      const result = this.repo.upsertSourceRecord(record);
      if (result === 'imported') imported++;
      else duplicates++;
    }
    const job = {
      id: crypto.randomUUID(),
      connectionId: request.connectionId,
      providerId: 'google' as const,
      trigger: 'manual' as const,
      status: 'succeeded' as const,
      startedAt: nowIso(),
      finishedAt: nowIso(),
      recordsImported: imported,
      recordsSkipped: 0,
      duplicatesPrevented: duplicates,
      errorCount: 0,
    };
    this.repo.saveSyncJob(job);
    return { job, records: changes.records };
  }

  async getSyncHistory(connectionId: string, limit?: number) {
    return this.repo.listSyncJobs(connectionId, limit);
  }

  async getErrors(connectionId: string, limit?: number) {
    return this.repo.listSyncErrors(connectionId, limit);
  }

  private toEmailRecord(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    msg: { id: string; snippet?: string; payload?: { headers?: Array<{ name: string; value: string }> } },
  ): CanonicalRecord {
    const now = nowIso();
    const subject = msg.payload?.headers?.find((h) => h.name.toLowerCase() === 'subject')?.value;
    return {
      kind: 'Email',
      id: crypto.randomUUID(),
      title: subject || '(no subject)',
      summary: msg.snippet,
      fields: { connectionId, messageId: msg.id },
      provenance: {
        provider: 'google',
        sourceSystem: 'gmail',
        sourceAccount: connectionId,
        sourceRecordId: msg.id,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: contentHash(JSON.stringify(msg)),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 1,
        permissionClassification: conn?.permissionMode ?? 'read_only_discovery',
      },
    };
  }

  private toDocumentRecord(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    file: { id: string; name: string; webViewLink?: string },
  ): CanonicalRecord {
    const now = nowIso();
    return {
      kind: 'Document',
      id: crypto.randomUUID(),
      title: file.name,
      fields: { connectionId, fileId: file.id, webUrl: file.webViewLink },
      provenance: {
        provider: 'google',
        sourceSystem: 'drive',
        sourceAccount: connectionId,
        sourceRecordId: file.id,
        sourceUrl: file.webViewLink,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: contentHash(JSON.stringify(file)),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 1,
        permissionClassification: conn?.permissionMode ?? 'read_only_discovery',
      },
    };
  }
}

export function createGoogleAdapter(deps: AdapterDeps): GoogleAdapter {
  return new GoogleAdapter(deps, deps.config, deps.repo);
}
