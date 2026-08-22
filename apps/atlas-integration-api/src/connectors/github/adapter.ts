import {
  BaseIntegrationAdapter,
  contentHash,
  type AdapterAction,
  type CanonicalRecord,
  type ConnectRequest,
  type ConnectResult,
  type FetchRecordRequest,
  type ListResourcesRequest,
  type MutateRecordRequest,
  type PermissionMode,
  type ResourceDescriptor,
  type SearchRecordsRequest,
  type SyncNowRequest,
  type SyncNowResult,
  type TokenHealth,
  type WebhookProcessRequest,
} from '@hvcg/atlas-integration-core';
import type { AppConfig } from '../../config.ts';
import {
  buildGitHubAuthorizeUrl,
  exchangeGitHubCode,
  fetchGitHubUser,
  getGitHubInstallationToken,
  githubFetch,
  verifyGitHubWebhookSignature,
} from '../../oauth/github.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import type { OAuthStateRecord, TokenPayload } from '../../store/types.ts';
import { nowIso, tokenExpiresAt, type AdapterDeps } from '../context.ts';

export class GitHubAdapter extends BaseIntegrationAdapter {
  readonly providerId = 'github' as const;
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
    'createRecord',
    'processWebhook',
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

  private requireOAuthConfigured(): void {
    if (!this.cfg.github.clientId || !this.cfg.github.clientSecret) {
      throw Object.assign(
        new Error('GitHub OAuth not configured. Owner must install GitHub App or set GITHUB_APP_CLIENT_ID/SECRET.'),
        { code: 'github_not_configured' },
      );
    }
  }

  private async resolveToken(connectionId: string): Promise<string> {
    const creds = this.repo.getCredentials(connectionId);
    if (!creds) throw new Error('No credentials for connection');
    if (creds.installationId && this.cfg.github.appId && this.cfg.github.privateKey) {
      if (creds.expiresAt && new Date(creds.expiresAt).getTime() > Date.now() + 60_000) {
        return creds.accessToken;
      }
      const inst = await getGitHubInstallationToken(this.cfg, creds.installationId);
      this.repo.saveCredentials(connectionId, {
        ...creds,
        accessToken: inst.token,
        expiresAt: inst.expires_at,
      });
      return inst.token;
    }
    return creds.accessToken;
  }

  async connect(request: ConnectRequest): Promise<ConnectResult> {
    this.requireOAuthConfigured();
    const connectionId = crypto.randomUUID();
    const state = crypto.randomUUID();
    const oauthState: OAuthStateRecord = {
      id: state,
      providerId: 'github',
      ownerUserId: request.ownerUserId,
      permissionMode: request.permissionMode,
      redirectUri: request.redirectUri,
      scopes: request.scopes || [],
      pendingConnectionId: connectionId,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
    this.repo.saveOAuthState(oauthState);
    return {
      authorizationUrl: buildGitHubAuthorizeUrl(this.cfg, state),
      state,
      connection: {
        id: connectionId,
        providerId: 'github',
        providerName: 'GitHub',
        businessEntity: String(request.metadata?.businessEntity || 'HVCG'),
        accountName: 'Pending',
        mailboxType: 'n/a',
        ownerUserId: request.ownerUserId,
        authType: 'github_app',
        permissionMode: request.permissionMode,
        scopes: request.scopes || [],
        status: 'Connecting',
        environment: request.environment,
        connectedAt: nowIso(),
        requiresReauthorization: false,
        autoSyncEnabled: true,
        recordsDiscovered: 0,
        recordsImported: 0,
        resourceSelections: [],
        encryptedCredentialsRef: connectionId,
        metadata: {
          note: 'Prefer GitHub App installation token when GITHUB_APP_ID/PRIVATE_KEY configured',
          ...(request.metadata || {}),
        },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    };
  }

  async completeOAuth(code: string, stateId: string): Promise<{ connectionId: string }> {
    const state = this.repo.consumeOAuthState(stateId);
    if (!state) throw new Error('Invalid or expired OAuth state');
    const tokens = await exchangeGitHubCode(this.cfg, code);
    const user = await fetchGitHubUser(tokens.access_token);
    const connectionId = state.pendingConnectionId;
    const now = nowIso();
    const { runDiscoveryForConnection } = await import('../../discovery/discover.ts');
    this.repo.saveCredentials(connectionId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? tokenExpiresAt(tokens.expires_in) : undefined,
      tokenType: tokens.token_type,
      accountLogin: user.login,
      accountId: String(user.id),
    });
    this.repo.upsertConnection({
      id: connectionId,
      providerId: 'github',
      providerName: 'GitHub',
      businessEntity: state.businessEntity || 'HVCG',
      accountName: user.name || user.login,
      accountDisplayName: user.name || user.login,
      accountEmail: undefined,
      tenantOrOrg: user.login,
      mailboxType: 'n/a',
      ownerUserId: state.ownerUserId,
      authType: 'github_app',
      permissionMode: state.permissionMode,
      scopes: state.scopes,
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: connectionId,
      metadata: { githubUserId: user.id, login: user.login },
      createdAt: now,
      updatedAt: now,
    });
    try {
      await runDiscoveryForConnection(this.repo, connectionId);
    } catch {
      /* gaps ok */
    }
    return { connectionId };
  }

  async disconnect(connectionId: string): Promise<void> {
    this.repo.wipeCredentials(connectionId);
    this.repo.markDisconnected(connectionId);
  }

  async verifyConnection(connectionId: string): Promise<{ ok: boolean; detail: string }> {
    if (!this.cfg.github.clientId && !this.cfg.github.appId) {
      return { ok: false, detail: 'GitHub not configured' };
    }
    const creds = this.repo.getCredentials(connectionId);
    if (!creds) return { ok: false, detail: 'No credentials stored' };
    try {
      const token = await this.resolveToken(connectionId);
      await fetchGitHubUser(token);
      return { ok: true, detail: 'GitHub user verified' };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : 'Verification failed' };
    }
  }

  async refreshAuthentication(connectionId: string): Promise<TokenHealth> {
    const creds = this.repo.getCredentials(connectionId);
    if (!creds) {
      return {
        healthy: false,
        refreshSupported: false,
        requiresReauthorization: true,
      };
    }
    if (creds.installationId && this.cfg.github.appId) {
      const inst = await getGitHubInstallationToken(this.cfg, creds.installationId);
      this.repo.saveCredentials(connectionId, {
        ...creds,
        accessToken: inst.token,
        expiresAt: inst.expires_at,
      });
      return {
        healthy: true,
        expiresAt: inst.expires_at,
        lastRefreshAt: nowIso(),
        refreshSupported: true,
        requiresReauthorization: false,
      };
    }
    return {
      healthy: Boolean(creds.accessToken),
      expiresAt: creds.expiresAt,
      refreshSupported: false,
      requiresReauthorization: !creds.accessToken,
    };
  }

  async getConnectionStatus(connectionId: string) {
    return this.repo.getConnection(connectionId)?.status ?? 'Disconnected';
  }

  async listResources(request: ListResourcesRequest): Promise<{ items: ResourceDescriptor[] }> {
    const token = await this.resolveToken(request.connectionId);
    const repos = await githubFetch<Array<{ id: number; full_name: string; html_url: string }>>(
      token,
      '/user/repos?per_page=50&sort=updated',
    );
    return {
      items: repos.map((r) => ({
        resourceType: 'repository',
        resourceId: String(r.id),
        displayName: r.full_name,
        webUrl: r.html_url,
      })),
    };
  }

  async searchRecords(request: SearchRecordsRequest): Promise<{ items: CanonicalRecord[] }> {
    const token = await this.resolveToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    const q = encodeURIComponent(`${request.query} in:title`);
    const data = await githubFetch<{ items: Array<{ id: number; title: string; html_url: string; state: string }> }>(
      token,
      `/search/issues?q=${q}&per_page=${request.limit || 25}`,
    );
    return {
      items: data.items.map((issue) => this.toIssueRecord(request.connectionId, conn, issue)),
    };
  }

  async fetchRecord(request: FetchRecordRequest): Promise<CanonicalRecord> {
    const token = await this.resolveToken(request.connectionId);
    const conn = this.repo.getConnection(request.connectionId);
    if (request.resourceType === 'pullRequest') {
      const pr = await githubFetch<{ id: number; title: string; html_url: string; state: string }>(
        token,
        `/repos/${request.recordId}`,
      );
      return this.toPullRequestRecord(request.connectionId, conn, pr);
    }
    const issue = await githubFetch<{ id: number; title: string; html_url: string; state: string }>(
      token,
      `/issues/${request.recordId}`,
    );
    return this.toIssueRecord(request.connectionId, conn, issue);
  }

  async createRecord(request: MutateRecordRequest): Promise<CanonicalRecord> {
    this.ensureWritable(request.connectionId, 'createRecord');
    const mode = this.getPermissionMode(request.connectionId);
    if (mode !== 'workflow_execution' && mode !== 'elevated_administrative') {
      throw new Error('createRecord requires workflow_execution permission mode');
    }
    const token = await this.resolveToken(request.connectionId);
    const repoFull = String(request.payload.repoFullName || '');
    const title = String(request.payload.title || 'Atlas issue');
    const body = String(request.payload.body || '');
    const issue = await githubFetch<{ id: number; title: string; html_url: string; state: string }>(
      token,
      `/repos/${repoFull}/issues`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body }),
      },
    );
    const conn = this.repo.getConnection(request.connectionId);
    return this.toIssueRecord(request.connectionId, conn, issue);
  }

  async processWebhook(request: WebhookProcessRequest): Promise<{ accepted: boolean; detail: string }> {
    const sig = request.headers['x-hub-signature-256'] || request.headers['X-Hub-Signature-256'];
    const raw = request.rawBody || JSON.stringify(request.body);
    if (!verifyGitHubWebhookSignature(this.cfg.github.webhookSecret, raw, sig)) {
      return { accepted: false, detail: 'Invalid webhook signature' };
    }
    return { accepted: true, detail: 'Webhook verified' };
  }

  async syncNow(request: SyncNowRequest): Promise<SyncNowResult> {
    const conn = this.repo.getConnection(request.connectionId);
    const selections = conn?.resourceSelections.filter((s) => s.selected) || [];
    const token = await this.resolveToken(request.connectionId);
    const records: CanonicalRecord[] = [];
    for (const sel of selections.length ? selections : [{ resourceType: 'repository', resourceId: '', displayName: '', selected: true }]) {
      if (sel.resourceType !== 'repository') continue;
      const repoName = sel.displayName || sel.path;
      if (!repoName) continue;
      const issues = await githubFetch<Array<{ id: number; title: string; html_url: string; state: string }>>(
        token,
        `/repos/${repoName}/issues?state=all&per_page=50`,
      );
      for (const issue of issues) {
        records.push(this.toIssueRecord(request.connectionId, conn, issue));
      }
    }
    let imported = 0;
    let duplicates = 0;
    for (const record of records) {
      const result = this.repo.upsertSourceRecord(record);
      if (result === 'imported') imported++;
      else duplicates++;
    }
    const job = {
      id: crypto.randomUUID(),
      connectionId: request.connectionId,
      providerId: 'github' as const,
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
    return { job, records };
  }

  async getSyncHistory(connectionId: string, limit?: number) {
    return this.repo.listSyncJobs(connectionId, limit);
  }

  async getErrors(connectionId: string, limit?: number) {
    return this.repo.listSyncErrors(connectionId, limit);
  }

  private toIssueRecord(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    issue: { id: number; title: string; html_url: string; state: string },
  ): CanonicalRecord {
    const now = nowIso();
    return {
      kind: 'Issue',
      id: crypto.randomUUID(),
      title: issue.title,
      fields: { connectionId, issueId: issue.id, state: issue.state, webUrl: issue.html_url },
      provenance: {
        provider: 'github',
        sourceSystem: 'github',
        sourceAccount: connectionId,
        sourceRecordId: String(issue.id),
        sourceUrl: issue.html_url,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: contentHash(JSON.stringify(issue)),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 1,
        permissionClassification: conn?.permissionMode ?? 'read_only_discovery',
      },
    };
  }

  private toPullRequestRecord(
    connectionId: string,
    conn: ReturnType<IntegrationRepository['getConnection']>,
    pr: { id: number; title: string; html_url: string; state: string },
  ): CanonicalRecord {
    const now = nowIso();
    return {
      kind: 'PullRequest',
      id: crypto.randomUUID(),
      title: pr.title,
      fields: { connectionId, pullRequestId: pr.id, state: pr.state, webUrl: pr.html_url },
      provenance: {
        provider: 'github',
        sourceSystem: 'github',
        sourceAccount: connectionId,
        sourceRecordId: String(pr.id),
        sourceUrl: pr.html_url,
        importedAt: now,
        lastSynchronizedAt: now,
        contentHash: contentHash(JSON.stringify(pr)),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 1,
        permissionClassification: conn?.permissionMode ?? 'read_only_discovery',
      },
    };
  }
}

export function createGitHubAdapter(deps: AdapterDeps): GitHubAdapter {
  return new GitHubAdapter(deps, deps.config, deps.repo);
}
