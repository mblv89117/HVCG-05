import {
  BaseIntegrationAdapter,
  UnsupportedOperationError,
  contentHash,
  extractDomain,
  inferBusinessEntity,
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
import { runDiscoveryForConnection } from '../../discovery/discover.ts';
import type { AppConfig } from '../../config.ts';
import {
  buildMicrosoftAuthorizeUrl,
  exchangeMicrosoftCode,
  fetchMicrosoftProfile,
  graphFetch,
  MICROSOFT_SCOPES,
  refreshMicrosoftToken,
} from '../../oauth/microsoft.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import type { OAuthStateRecord, TokenPayload } from '../../store/types.ts';
import { nowIso, tokenExpiresAt, type AdapterDeps } from '../context.ts';

export class MicrosoftAdapter extends BaseIntegrationAdapter {
  readonly providerId = 'microsoft' as const;
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
    if (!this.cfg.microsoft.clientId) {
      throw Object.assign(new Error('Microsoft OAuth not configured'), {
        code: 'microsoft_not_configured',
      });
    }
  }

  private getAccessToken(connectionId: string): string {
    const creds = this.repo.getCredentials(connectionId);
    if (!creds?.accessToken) {
      throw new Error('No credentials for connection');
    }
    if (creds.expiresAt && new Date(creds.expiresAt).getTime() < Date.now() + 60_000) {
      throw Object.assign(new Error('Token expired — refresh required'), { code: 'token_expired' });
    }
    return creds.accessToken;
  }

  async connect(request: ConnectRequest): Promise<ConnectResult> {
    this.requireConfigured();
    const connectionId = crypto.randomUUID();
    const state = crypto.randomUUID();
    const scopes = request.scopes?.length ? request.scopes : MICROSOFT_SCOPES;
    const oauthState: OAuthStateRecord = {
      id: state,
      providerId: 'microsoft',
      ownerUserId: request.ownerUserId,
      permissionMode: request.permissionMode,
      redirectUri: request.redirectUri,
      scopes,
      pendingConnectionId: connectionId,
      businessEntity: String(request.metadata?.businessEntity || ''),
      accountLabel: String(request.metadata?.accountLabel || ''),
      metadata: request.metadata || {},
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
    this.repo.saveOAuthState(oauthState);
    return {
      authorizationUrl: buildMicrosoftAuthorizeUrl(this.cfg, state, scopes),
      state,
      connection: {
        id: connectionId,
        providerId: 'microsoft',
        providerName: 'Microsoft 365',
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
    const tokens = await exchangeMicrosoftCode(this.cfg, code);
    const profile = await fetchMicrosoftProfile(tokens.access_token);
    const connectionId = state.pendingConnectionId;
    const now = nowIso();
    const email = profile.mail || profile.userPrincipalName;
    const domain = extractDomain(email);
    const businessEntity =
      state.businessEntity ||
      inferBusinessEntity({
        email,
        domain,
        displayName: profile.displayName,
        tenantOrOrg: domain,
      });
    const payload: TokenPayload = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokenExpiresAt(tokens.expires_in),
      tokenType: tokens.token_type,
      scope: tokens.scope,
      accountLogin: profile.userPrincipalName,
      accountId: profile.id,
    };
    // Unique credential slot per connectionId — never overwrites another Microsoft account.
    this.repo.saveCredentials(connectionId, payload);
    this.repo.upsertConnection({
      id: connectionId,
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity,
      accountName: profile.displayName || profile.userPrincipalName,
      accountDisplayName: profile.displayName,
      accountEmail: email,
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
      metadata: { graphUserId: profile.id, accountLabel: state.accountLabel },
      createdAt: now,
      updatedAt: now,
    });
    try {
      await runDiscoveryForConnection(this.repo, connectionId);
    } catch {
      // Discovery gaps are recorded as resources; connection remains Connected.
    }
    return { connectionId };
  }

  async disconnect(connectionId: string): Promise<void> {
    this.repo.wipeCredentials(connectionId);
    this.repo.markDisconnected(connectionId);
  }

  async verifyConnection(connectionId: string): Promise<{ ok: boolean; detail: string }> {
    if (!this.cfg.microsoft.clientId) {
      return { ok: false, detail: 'Microsoft OAuth not configured' };
    }
    const creds = this.repo.getCredentials(connectionId);
    if (!creds) return { ok: false, detail: 'No credentials stored' };
    try {
      await fetchMicrosoftProfile(creds.accessToken);
      return { ok: true, detail: 'Graph /me verified' };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : 'Verification failed',
      };
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
    const tokens = await refreshMicrosoftToken(this.cfg, creds.refreshToken);
    const now = nowIso();
    this.repo.saveCredentials(connectionId, {
      ...creds,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || creds.refreshToken,
      expiresAt: tokenExpiresAt(tokens.expires_in),
    });
    const conn = this.repo.getConnection(connectionId);
    if (conn) {
      this.repo.upsertConnection({
        ...conn,
        lastTokenRefreshAt: now,
        requiresReauthorization: false,
        updatedAt: now,
      });
    }
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

  async listResources(request: ListResourcesRequest): Promise<{
    items: ResourceDescriptor[];
    nextCursor?: string;
  }> {
    const token = this.getAccessToken(request.connectionId);
    const items: ResourceDescriptor[] = [];
    const type = request.resourceType || 'mailFolder';

    if (type === 'mailFolder' || !request.resourceType) {
      const data = await graphFetch<{ value: Array<{ id: string; displayName: string }> }>(
        token,
        '/me/mailFolders?$top=50',
      );
      items.push(
        ...data.value.map((f) => ({
          resourceType: 'mailFolder',
          resourceId: f.id,
          displayName: f.displayName,
        })),
      );
    }
    if (type === 'drive' || !request.resourceType) {
      const drives = await graphFetch<{ value: Array<{ id: string; name: string; webUrl?: string }> }>(
        token,
        '/me/drives?$top=20',
      );
      items.push(
        ...drives.value.map((d) => ({
          resourceType: 'drive',
          resourceId: d.id,
          displayName: d.name,
          webUrl: d.webUrl,
        })),
      );
    }
    if (type === 'site' || !request.resourceType) {
      const sites = await graphFetch<{ value: Array<{ id: string; displayName: string; webUrl?: string }> }>(
        token,
        '/sites?search=*',
      );
      items.push(
        ...sites.value.map((s) => ({
          resourceType: 'site',
          resourceId: s.id,
          displayName: s.displayName,
          webUrl: s.webUrl,
        })),
      );
    }
    return { items };
  }

  async searchRecords(request: SearchRecordsRequest): Promise<{
    items: CanonicalRecord[];
    nextCursor?: string;
  }> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    const items: CanonicalRecord[] = [];
    const rawTypes = request.resourceTypes?.length ? request.resourceTypes : ['mail', 'drive'];
    const types = rawTypes.map((t) => (t === 'email' || t === 'message' ? 'mail' : t));

    if (types.includes('mail')) {
      const q = encodeURIComponent(`"${request.query}"`);
      const data = await graphFetch<{
        value: Array<{
          id: string;
          subject?: string;
          bodyPreview?: string;
          receivedDateTime?: string;
          webLink?: string;
        }>;
      }>(token, `/me/messages?$search=${q}&$top=${request.limit || 25}&$select=id,subject,bodyPreview,receivedDateTime,webLink`, {
        headers: { ConsistencyLevel: 'eventual' },
      });
      for (const msg of data.value || []) {
        items.push(this.toEmailRecord(request.connectionId, conn, msg));
      }
    }
    if (types.includes('drive') || types.includes('file') || types.includes('document')) {
      const searchBody = {
        requests: [
          {
            entityTypes: ['driveItem'],
            query: { queryString: request.query },
            from: 0,
            size: request.limit || 25,
          },
        ],
      };
      try {
        const data = await graphFetch<{
          value: Array<{
            hitsContainers: Array<{
              hits: Array<{ resource: { id: string; name?: string; webUrl?: string } }>;
            }>;
          }>;
        }>(token, '/search/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(searchBody),
        });
        for (const container of data.value || []) {
          for (const hit of container.hitsContainers?.[0]?.hits || []) {
            const r = hit.resource;
            items.push(this.toDocumentRecord(request.connectionId, conn, r));
          }
        }
      } catch {
        // Search API may be unavailable; fall back to OneDrive children listing filter client-side later.
      }
    }
    return { items };
  }

  async fetchRecord(request: FetchRecordRequest): Promise<CanonicalRecord> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    if (request.resourceType === 'mail' || request.resourceType === 'message') {
      const msg = await graphFetch<{
        id: string;
        subject?: string;
        bodyPreview?: string;
        receivedDateTime?: string;
        webLink?: string;
      }>(token, `/me/messages/${request.recordId}`);
      return this.toEmailRecord(request.connectionId, conn, msg);
    }
    const item = await graphFetch<{ id: string; name?: string; webUrl?: string }>(
      token,
      `/me/drive/items/${request.recordId}`,
    );
    return this.toDocumentRecord(request.connectionId, conn, item);
  }

  async fetchChanges(request: FetchChangesRequest): Promise<FetchChangesResult> {
    const token = this.getAccessToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    const resourceType = request.resourceType || 'mail';

    // Graph does not support /me/messages/delta — use folder-scoped delta or initial page.
    if (resourceType === 'mail' || resourceType === 'email' || resourceType === 'message') {
      return this.fetchMailChanges(request.connectionId, conn, token, request.deltaToken);
    }
    if (resourceType === 'drive' || resourceType === 'file' || resourceType === 'document') {
      return this.fetchDriveChanges(request.connectionId, conn, token, request.deltaToken);
    }

    // Default: mail + drive combined for first validation sync
    const mail = await this.fetchMailChanges(request.connectionId, conn, token, request.deltaToken);
    const drive = await this.fetchDriveChanges(request.connectionId, conn, token);
    return {
      records: [...mail.records, ...drive.records],
      nextDeltaToken: mail.nextDeltaToken || drive.nextDeltaToken,
      hasMore: mail.hasMore || drive.hasMore,
    };
  }

  private async fetchMailChanges(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    token: string,
    deltaToken?: string,
  ): Promise<FetchChangesResult> {
    const checkpoint = this.repo.getCheckpoint(connectionId, 'mail');
    const link = deltaToken || checkpoint?.deltaToken;

    // Prefer inbox delta when supported; on failure fall back to recent messages page.
    try {
      let path =
        link && (link.startsWith('http') || link.includes('deltatoken') || link.includes('delta'))
          ? link.startsWith('http')
            ? link
            : link
          : '/me/mailFolders/inbox/messages/delta?$top=50&$select=id,subject,bodyPreview,receivedDateTime,webLink';
      if (link && !link.startsWith('http') && !link.includes('/')) {
        path = `/me/mailFolders/inbox/messages/delta?$deltatoken=${encodeURIComponent(link)}`;
      }
      const data = await graphFetch<{
        value: Array<{
          id: string;
          subject?: string;
          bodyPreview?: string;
          receivedDateTime?: string;
          webLink?: string;
          '@removed'?: { reason?: string };
        }>;
        '@odata.deltaLink'?: string;
        '@odata.nextLink'?: string;
      }>(token, path);
      const records = (data.value || [])
        .filter((m) => !m['@removed'])
        .map((m) => this.toEmailRecord(connectionId, conn, m));
      const next = data['@odata.deltaLink'] || data['@odata.nextLink'];
      if (next) {
        this.repo.saveCheckpoint({
          connectionId,
          resourceType: 'mail',
          deltaToken: next,
          updatedAt: nowIso(),
        });
      }
      return { records, nextDeltaToken: next, hasMore: Boolean(data['@odata.nextLink']) };
    } catch {
      const data = await graphFetch<{
        value: Array<{
          id: string;
          subject?: string;
          bodyPreview?: string;
          receivedDateTime?: string;
          webLink?: string;
        }>;
      }>(
        token,
        '/me/messages?$top=50&$orderby=receivedDateTime%20desc&$select=id,subject,bodyPreview,receivedDateTime,webLink',
      );
      const records = (data.value || []).map((m) => this.toEmailRecord(connectionId, conn, m));
      return { records, hasMore: false };
    }
  }

  private async fetchDriveChanges(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    token: string,
    deltaToken?: string,
  ): Promise<FetchChangesResult> {
    const checkpoint = this.repo.getCheckpoint(connectionId, 'drive');
    const link = deltaToken || checkpoint?.deltaToken;
    try {
      let path = '/me/drive/root/delta?$top=50';
      if (link) {
        path = link.startsWith('http') ? link : `/me/drive/root/delta?$deltatoken=${encodeURIComponent(link)}`;
      }
      const data = await graphFetch<{
        value: Array<{ id: string; name?: string; webUrl?: string; file?: unknown; folder?: unknown }>;
        '@odata.deltaLink'?: string;
        '@odata.nextLink'?: string;
      }>(token, path);
      const records = (data.value || [])
        .filter((i) => i.file || (!i.folder && i.name))
        .slice(0, 50)
        .map((i) => this.toDocumentRecord(connectionId, conn, i));
      const next = data['@odata.deltaLink'] || data['@odata.nextLink'];
      if (next) {
        this.repo.saveCheckpoint({
          connectionId,
          resourceType: 'drive',
          deltaToken: next,
          updatedAt: nowIso(),
        });
      }
      return { records, nextDeltaToken: next, hasMore: Boolean(data['@odata.nextLink']) };
    } catch {
      const data = await graphFetch<{
        value: Array<{ id: string; name?: string; webUrl?: string; file?: unknown }>;
      }>(token, '/me/drive/root/children?$top=50');
      const records = (data.value || [])
        .filter((i) => i.file)
        .map((i) => this.toDocumentRecord(connectionId, conn, i));
      return { records, hasMore: false };
    }
  }

  async downloadFile(request: FileTransferRequest): Promise<FileTransferResult> {
    const token = this.getAccessToken(request.connectionId);
    const resp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${request.resourceId}/content`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
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
    throw new UnsupportedOperationError(
      this.providerId,
      'createRecord',
      'Microsoft adapter does not support send/modify mail or document writes.',
    );
  }

  async syncNow(request: SyncNowRequest): Promise<SyncNowResult> {
    const conn = this.repo.getConnection(request.connectionId);
    if (!conn) throw new Error('Connection not found');

    // Ensure token is fresh before multi-page Graph crawl.
    try {
      await this.refreshAuthentication(request.connectionId);
    } catch {
      // Continue with existing token if refresh unavailable.
    }

    const { runMicrosoftDeepSync } = await import('./deepSync.ts');
    const { records, stats } = await runMicrosoftDeepSync({
      repo: this.repo,
      connectionId: request.connectionId,
      conn,
      mode: request.mode || 'full',
      getToken: async () => {
        try {
          return this.getAccessToken(request.connectionId);
        } catch {
          await this.refreshAuthentication(request.connectionId);
          return this.getAccessToken(request.connectionId);
        }
      },
    });

    const status =
      stats.errorCount === 0
        ? 'succeeded'
        : stats.imported > 0 || stats.duplicates > 0
          ? 'partial'
          : 'failed';
    const job = {
      id: crypto.randomUUID(),
      connectionId: request.connectionId,
      providerId: 'microsoft' as const,
      trigger: 'manual' as const,
      status: status as 'succeeded' | 'partial' | 'failed',
      startedAt: nowIso(),
      finishedAt: nowIso(),
      recordsImported: stats.imported,
      recordsSkipped: stats.skipped,
      duplicatesPrevented: stats.duplicates,
      errorCount: stats.errorCount,
      detail:
        [
          `streams=${stats.streams.length}`,
          `pages=${stats.pagesFetched}`,
          ...stats.details.slice(0, 5),
        ]
          .filter(Boolean)
          .join('; ') || undefined,
    };
    this.repo.saveSyncJob(job);
    const latest = this.repo.getConnection(request.connectionId) || conn;
    if (status === 'succeeded' || status === 'partial') {
      this.repo.upsertConnection({
        ...latest,
        lastSuccessfulSyncAt: nowIso(),
        status: 'Connected',
        recordsImported: this.repo.countSourceRecordsForConnection(request.connectionId),
        errorState: status === 'partial' ? job.detail : undefined,
        updatedAt: nowIso(),
      });
    }
    if (status === 'failed') {
      throw new Error(job.detail || 'Microsoft sync failed');
    }
    return { job, records };
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
    msg: { id: string; subject?: string; bodyPreview?: string; receivedDateTime?: string; webLink?: string },
  ): CanonicalRecord {
    const now = nowIso();
    return {
      kind: 'Email',
      id: crypto.randomUUID(),
      title: msg.subject || '(no subject)',
      summary: msg.bodyPreview,
      fields: { connectionId, messageId: msg.id, webLink: msg.webLink },
      provenance: {
        provider: 'microsoft',
        sourceSystem: 'outlook',
        sourceAccount: connectionId,
        sourceRecordId: msg.id,
        sourceUrl: msg.webLink,
        originalModifiedAt: msg.receivedDateTime,
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
    item: { id: string; name?: string; webUrl?: string },
  ): CanonicalRecord {
    const now = nowIso();
    return {
      kind: 'Document',
      id: crypto.randomUUID(),
      title: item.name || item.id,
      fields: { connectionId, itemId: item.id, webUrl: item.webUrl },
      provenance: {
        provider: 'microsoft',
        sourceSystem: 'sharepoint',
        sourceAccount: connectionId,
        sourceRecordId: item.id,
        sourceUrl: item.webUrl,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: contentHash(JSON.stringify(item)),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 1,
        permissionClassification: conn?.permissionMode ?? 'read_only_discovery',
      },
    };
  }
}

export function createMicrosoftAdapter(deps: AdapterDeps): MicrosoftAdapter {
  return new MicrosoftAdapter(deps, deps.config, deps.repo);
}
