import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SOURCE_OF_TRUTH_RULES, type ConnectionRecord, type ProviderId } from '@hvcg/atlas-integration-core';
import { audit } from '../audit/auditLog.ts';
import type { AppConfig } from '../config.ts';
import {
  assertProviderConfigured,
  isGitHubConfigured,
  isGoogleConfigured,
  isMicrosoftConfigured,
} from '../config.ts';
import type { AppRegistry } from '../connectors/registry.ts';
import { completeOAuthForProvider, getProviderAdapter } from '../connectors/registry.ts';
import {
  CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION,
  CONNECTOR_SYNC_DISABLED_IN_PRODUCTION,
  isConnectorSearchDisabled,
  isConnectorSyncDisabled,
} from '../connectors/contentPolicy.ts';
import { getOwnedConnection } from '../connectors/ownership.ts';
import { runDiscoveryForConnection } from '../discovery/discover.ts';
import { CLIENT360_UNMAPPED_CODE } from '../client360/access.ts';
import { assertAdministrator, requirePrincipal } from '../middleware/auth.ts';
import type { IntegrationRepository } from '../store/repository.ts';
import type { PmRepository } from '../pm/repository.ts';
import { runBatchSync, runSyncForConnection } from '../sync/orchestrator.ts';
import { handlePmRoutes } from '../pm/http.ts';
import { handleBaRoutes } from '../ba/routes.ts';
import type { LocalAiAdapter } from '../local-ai/adapter.ts';
import { handleLocalAiRoutes } from '../local-ai/http.ts';

export interface RouterDeps {
  cfg: AppConfig;
  repo: IntegrationRepository;
  app: AppRegistry;
  pm: PmRepository | null;
  localAi: LocalAiAdapter;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function corsOrigin(req: IncomingMessage, cfg: AppConfig): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  return cfg.allowedOrigins.includes(origin) ? origin : null;
}

function parseProvider(pathSegment: string): ProviderId | null {
  if (pathSegment === 'microsoft' || pathSegment === 'google' || pathSegment === 'github') {
    return pathSegment;
  }
  return null;
}

function sendOwnedOrNull(
  res: ServerResponse,
  origin: string | null,
  repo: IntegrationRepository,
  connectionId: string,
  principalUserId: string,
): ConnectionRecord | undefined {
  const conn = getOwnedConnection(repo, connectionId, principalUserId);
  if (!conn) {
    send(res, 404, { error: 'not_found' }, origin);
    return undefined;
  }
  return conn;
}

function connectionHealth(deps: RouterDeps, connectionId: string) {
  const conn = deps.repo.getConnection(connectionId);
  if (!conn) return null;
  const creds = deps.repo.getCredentials(connectionId);
  return {
    connectionId,
    providerId: conn.providerId,
    status: conn.status,
    tokenHealth: {
      healthy: Boolean(creds?.accessToken),
      expiresAt: creds?.expiresAt,
      lastRefreshAt: conn.lastTokenRefreshAt,
      refreshSupported: Boolean(creds?.refreshToken || creds?.installationId),
      requiresReauthorization: conn.requiresReauthorization,
    },
    lastSuccessfulSyncAt: conn.lastSuccessfulSyncAt,
    nextScheduledSyncAt: conn.nextScheduledSyncAt,
    webhookStatus: conn.providerId === 'github' ? 'active' : 'unsupported',
    recordsImported: deps.repo.countSourceRecordsForConnection(connectionId),
    recordsSkipped: 0,
    duplicatesPrevented: 0,
    openErrorCount: deps.repo.countOpenErrors(connectionId),
  };
}

export async function handleRequest(
  deps: RouterDeps,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { cfg, repo, app } = deps;
  const origin = corsOrigin(req, cfg);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': origin || '',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-headers':
        'content-type,authorization,x-atlas-user-id,x-atlas-organization-id,x-atlas-client-ids,x-atlas-user-email,x-atlas-roles,x-hub-signature-256',
      'access-control-max-age': '86400',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  try {
    if (path.startsWith('/api/ba')) {
      const handled = await handleBaRoutes({
        req,
        res,
        cfg,
        path,
        method,
        origin,
      });
      if (handled) return;
    }

    if (path.startsWith('/api/pm')) {
      const handled = await handlePmRoutes({
        cfg,
        repo,
        pm: deps.pm,
        req,
        res,
        method,
        path,
        origin,
      });
      if (handled) return;
    }

    if (path.startsWith('/api/local-ai')) {
      const handled = await handleLocalAiRoutes({
        cfg,
        localAi: deps.localAi,
        req,
        res,
        method,
        path,
        origin,
      });
      if (handled) return;
    }

    // GET /health
    if (method === 'GET' && path === '/health') {
      const localAi = deps.localAi.snapshot();
      send(
        res,
        200,
        {
          ok: true,
          providers: {
            microsoft: isMicrosoftConfigured(cfg),
            google: isGoogleConfigured(cfg),
            github: isGitHubConfigured(cfg) || Boolean(cfg.github.clientId),
          },
          localAi: {
            enabled: localAi.enabled,
            available: localAi.available,
            availability: localAi.availability,
            reason: localAi.reason,
          },
          port: cfg.port,
          authRequired: cfg.requireAuth,
          insecureDevAuth: cfg.insecureDevAuth,
          pmBackend: {
            mode: cfg.pmBackend.mode,
            classification: cfg.pmBackend.classification,
          },
        },
        origin,
      );
      return;
    }

    // GET /api/integrations/registry
    if (method === 'GET' && path === '/api/integrations/registry') {
      await requirePrincipal(req, cfg);
      send(res, 200, { providers: app.registry.list() }, origin);
      return;
    }

    // GET /api/integrations/source-of-truth
    if (method === 'GET' && path === '/api/integrations/source-of-truth') {
      await requirePrincipal(req, cfg);
      send(res, 200, { rules: SOURCE_OF_TRUTH_RULES }, origin);
      return;
    }

    // GET /api/connections — owner-scoped. Query ownerUserId cannot broaden.
    if (method === 'GET' && path === '/api/connections') {
      const principal = await requirePrincipal(req, cfg);
      const providerId = url.searchParams.get('provider') as ProviderId | null;
      const businessEntity = url.searchParams.get('businessEntity') || undefined;
      const connections = repo.listConnections({
        ownerUserId: principal.userId,
        providerId: providerId || undefined,
        businessEntity,
      });
      send(res, 200, { connections }, origin);
      return;
    }

    // GET /api/connections/:id
    const connMatch = path.match(/^\/api\/connections\/([^/]+)$/);
    if (method === 'GET' && connMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, connMatch[1], principal.userId);
      if (!conn) return;
      send(res, 200, { connection: conn }, origin);
      return;
    }

    // GET /api/connections/:id/health
    const healthMatch = path.match(/^\/api\/connections\/([^/]+)\/health$/);
    if (method === 'GET' && healthMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, healthMatch[1], principal.userId);
      if (!conn) return;
      const health = connectionHealth(deps, conn.id);
      send(res, 200, health, origin);
      return;
    }

    // GET /api/connections/:id/resources
    const resourcesMatch = path.match(/^\/api\/connections\/([^/]+)\/resources$/);
    if (method === 'GET' && resourcesMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, resourcesMatch[1], principal.userId);
      if (!conn) return;
      const adapter = app.registry.getAdapter(conn.providerId);
      if (!adapter) {
        send(res, 503, { error: 'adapter_missing' }, origin);
        return;
      }
      const listed = await adapter.listResources({
        connectionId: conn.id,
        resourceType: url.searchParams.get('resourceType') || undefined,
        cursor: url.searchParams.get('cursor') || undefined,
        limit: Number(url.searchParams.get('limit') || 50),
      });
      send(res, 200, listed, origin);
      return;
    }

    // GET /api/connections/:id/sync-jobs
    const syncJobsMatch = path.match(/^\/api\/connections\/([^/]+)\/sync-jobs$/);
    if (method === 'GET' && syncJobsMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, syncJobsMatch[1], principal.userId);
      if (!conn) return;
      send(res, 200, { jobs: repo.listSyncJobs(conn.id) }, origin);
      return;
    }

    // GET /api/connections/:id/errors
    const errorsMatch = path.match(/^\/api\/connections\/([^/]+)\/errors$/);
    if (method === 'GET' && errorsMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, errorsMatch[1], principal.userId);
      if (!conn) return;
      send(res, 200, { errors: repo.listSyncErrors(conn.id) }, origin);
      return;
    }

    // GET /api/oauth/:provider/callback
    const oauthCallbackMatch = path.match(/^\/api\/oauth\/([^/]+)\/callback$/);
    if (method === 'GET' && oauthCallbackMatch) {
      const provider = parseProvider(oauthCallbackMatch[1]);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!provider || !code || !state) {
        send(res, 400, { error: 'code and state required' }, origin);
        return;
      }
      try {
        const result = await completeOAuthForProvider(app, provider, code, state);
        audit({
          repo,
          action: 'oauth_callback',
          providerId: provider,
          connectionId: result.connectionId,
          outcome: 'success',
        });
        send(res, 200, { ok: true, connectionId: result.connectionId }, origin);
      } catch (err) {
        audit({
          repo,
          action: 'oauth_callback',
          providerId: provider,
          outcome: 'failure',
          detail: err instanceof Error ? err.message : 'callback_failed',
        });
        send(res, 400, { error: 'oauth_callback_failed' }, origin);
      }
      return;
    }

    // GET /api/audit — own actor events only. Records include connectionId
    // and sourceAccount; global listing would leak other users' connector metadata.
    if (method === 'GET' && path === '/api/audit') {
      const principal = await requirePrincipal(req, cfg);
      const limit = Number(url.searchParams.get('limit') || 100);
      const events = repo.listAudit(limit, { actorUserId: principal.userId });
      send(res, 200, { events }, origin);
      return;
    }

    // GET /api/admin/dashboard
    if (method === 'GET' && path === '/api/admin/dashboard') {
      const principal = await requirePrincipal(req, cfg);
      assertAdministrator(principal);
      send(res, 200, { summary: repo.dashboardSummary(), ...repo.dashboardSummary() }, origin);
      return;
    }

    // GET /api/inventory — owner-scoped connections/resources only
    if (method === 'GET' && path === '/api/inventory') {
      const principal = await requirePrincipal(req, cfg);
      const connections = repo.listConnections({ ownerUserId: principal.userId });
      send(
        res,
        200,
        {
          connections: connections.map((c) => ({
            id: c.id,
            businessEntity: c.businessEntity,
            provider: c.providerId,
            accountEmail: c.accountEmail,
            accountDisplayName: c.accountDisplayName || c.accountName,
            tenantOrOrg: c.tenantOrOrg,
            domain: c.domain,
            mailboxType: c.mailboxType,
            ownerUserId: c.ownerUserId,
            authType: c.authType,
            scopes: c.scopes,
            status: c.status,
            lastSuccessfulSyncAt: c.lastSuccessfulSyncAt,
            recordsDiscovered: c.recordsDiscovered,
            recordsImported: c.recordsImported,
            errors: c.errorState,
            requiresReauthorization: c.requiresReauthorization,
            discoveryCompletedAt: c.discoveryCompletedAt,
          })),
          discoveredByConnection: Object.fromEntries(
            connections.map((c) => [c.id, repo.listDiscoveredResources(c.id)]),
          ),
        },
        origin,
      );
      return;
    }

    // GET /api/connections/:id/discovered
    const discoveredMatch = path.match(/^\/api\/connections\/([^/]+)\/discovered$/);
    if (method === 'GET' && discoveredMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, discoveredMatch[1], principal.userId);
      if (!conn) return;
      send(res, 200, { resources: repo.listDiscoveredResources(conn.id) }, origin);
      return;
    }

    // Client 360: no trusted UUID → ClientCode mapping. Fail closed without
    // loading entities (avoids IDOR and existence leaks).
    if (path === '/api/client360' || path.startsWith('/api/client360/')) {
      await requirePrincipal(req, cfg);
      send(res, 403, { error: 'forbidden', code: CLIENT360_UNMAPPED_CODE }, origin);
      return;
    }

    // POST routes
    if (method !== 'POST') {
      send(res, 405, { error: 'method_not_allowed' }, origin);
      return;
    }

    const body = (await readJson(req)) as Record<string, unknown>;

    // POST /api/connections/:provider/connect
    const connectMatch = path.match(/^\/api\/connections\/([^/]+)\/connect$/);
    if (connectMatch) {
      const principal = await requirePrincipal(req, cfg);
      const provider = parseProvider(connectMatch[1]);
      if (!provider) {
        send(res, 400, { error: 'invalid_provider' }, origin);
        return;
      }
      try {
        assertProviderConfigured(provider, cfg);
      } catch (err) {
        const status = (err as { status?: number }).status || 503;
        send(
          res,
          status,
          {
            error: (err as { code?: string }).code || 'not_configured',
            message: err instanceof Error ? err.message : 'Provider not configured',
            authorizationUrl: null,
          },
          origin,
        );
        return;
      }
      const adapter = app.registry.getAdapter(provider);
      if (!adapter) {
        send(res, 503, { error: 'adapter_missing' }, origin);
        return;
      }
      const permissionMode =
        (body.permissionMode as 'read_only_discovery') || 'read_only_discovery';
      const result = await adapter.connect({
        ownerUserId: principal.userId,
        environment: 'local',
        permissionMode,
        redirectUri: cfg.publicBaseUrl + `/api/oauth/${provider}/callback`,
        scopes: body.scopes as string[] | undefined,
        metadata: {
          ...((body.metadata as Record<string, unknown>) || {}),
          businessEntity: body.businessEntity || (body.metadata as { businessEntity?: string })?.businessEntity,
          accountLabel: body.accountLabel,
          mailboxType: body.mailboxType,
        },
      });
      if (result.connection) {
        repo.upsertConnection({ ...result.connection, status: 'Connecting' });
      }
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'connect_started',
        providerId: provider,
        connectionId: result.connection?.id,
        outcome: 'success',
      });
      send(
        res,
        200,
        {
          authorizationUrl: result.authorizationUrl,
          state: result.state,
          connectionId: result.connection?.id,
        },
        origin,
      );
      return;
    }

    // POST /api/connections/:id/disconnect
    const disconnectMatch = path.match(/^\/api\/connections\/([^/]+)\/disconnect$/);
    if (disconnectMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, disconnectMatch[1], principal.userId);
      if (!conn) return;
      const adapter = app.registry.getAdapter(conn.providerId);
      await adapter?.disconnect(conn.id);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'disconnect',
        connectionId: conn.id,
        providerId: conn.providerId,
        sourceAccount: conn.accountEmail || conn.accountName,
        businessEntity: String(conn.businessEntity || ''),
        outcome: 'success',
      });
      send(res, 200, { ok: true }, origin);
      return;
    }

    // POST /api/connections/:id/discover
    const discoverMatch = path.match(/^\/api\/connections\/([^/]+)\/discover$/);
    if (discoverMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, discoverMatch[1], principal.userId);
      if (!conn) return;
      try {
        const resources = await runDiscoveryForConnection(repo, conn.id);
        audit({
          repo,
          actorUserId: principal.userId,
          action: 'discover',
          connectionId: conn.id,
          providerId: conn.providerId,
          sourceAccount: conn.accountEmail || conn.accountName,
          businessEntity: String(conn.businessEntity || ''),
          outcome: 'success',
          detail: `discovered ${resources.length} resources`,
        });
        send(res, 200, { resources, count: resources.length }, origin);
      } catch (err) {
        send(
          res,
          500,
          { error: 'discover_failed', message: err instanceof Error ? err.message : 'failed' },
          origin,
        );
      }
      return;
    }

    // POST /api/sync/all — owned connections only; disabled in production
    if (path === '/api/sync/all') {
      const principal = await requirePrincipal(req, cfg);
      if (isConnectorSyncDisabled(cfg.isProduction)) {
        send(
          res,
          403,
          { error: 'forbidden', code: CONNECTOR_SYNC_DISABLED_IN_PRODUCTION },
          origin,
        );
        return;
      }
      const ids = repo.listConnections({ ownerUserId: principal.userId }).map((c) => c.id);
      const jobs = await runBatchSync({ repo, app }, ids);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'sync_all',
        outcome: 'success',
        detail: `synced ${ids.length} connections`,
      });
      send(res, 200, { jobs }, origin);
      return;
    }

    // POST /api/connections/:id/reauthorize
    const reauthMatch = path.match(/^\/api\/connections\/([^/]+)\/reauthorize$/);
    if (reauthMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, reauthMatch[1], principal.userId);
      if (!conn) return;
      const adapter = app.registry.getAdapter(conn.providerId);
      if (!adapter) {
        send(res, 503, { error: 'adapter_missing' }, origin);
        return;
      }
      const result = await adapter.connect({
        ownerUserId: conn.ownerUserId,
        environment: conn.environment,
        permissionMode: conn.permissionMode,
        redirectUri: cfg.publicBaseUrl + `/api/oauth/${conn.providerId}/callback`,
        scopes: conn.scopes,
        metadata: {
          businessEntity: conn.businessEntity,
          reauthorizeOf: conn.id,
        },
      });
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'reauthorize',
        connectionId: conn.id,
        providerId: conn.providerId,
        sourceAccount: conn.accountEmail || conn.accountName,
        businessEntity: String(conn.businessEntity || ''),
        outcome: 'success',
      });
      send(
        res,
        200,
        {
          authorizationUrl: result.authorizationUrl,
          state: result.state,
          connectionId: result.connection?.id || conn.id,
        },
        origin,
      );
      return;
    }

    // POST /api/connections/:id/verify
    const verifyMatch = path.match(/^\/api\/connections\/([^/]+)\/verify$/);
    if (verifyMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, verifyMatch[1], principal.userId);
      if (!conn) return;
      const adapter = app.registry.getAdapter(conn.providerId);
      const result = await adapter!.verifyConnection(conn.id);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'verify_connection',
        connectionId: conn.id,
        providerId: conn.providerId,
        outcome: result.ok ? 'success' : 'failure',
        detail: result.detail,
      });
      send(res, 200, result, origin);
      return;
    }

    // POST /api/connections/:id/sync
    const syncMatch = path.match(/^\/api\/connections\/([^/]+)\/sync$/);
    if (syncMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, syncMatch[1], principal.userId);
      if (!conn) return;
      if (isConnectorSyncDisabled(cfg.isProduction)) {
        send(
          res,
          403,
          { error: 'forbidden', code: CONNECTOR_SYNC_DISABLED_IN_PRODUCTION },
          origin,
        );
        return;
      }
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'sync_started',
        connectionId: conn.id,
        providerId: conn.providerId,
        outcome: 'info',
      });
      const job = await runSyncForConnection({ repo, app }, conn.id, 'manual');
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'sync_completed',
        connectionId: conn.id,
        providerId: conn.providerId,
        outcome: job.status === 'failed' ? 'failure' : 'success',
      });
      send(res, 200, { job }, origin);
      return;
    }

    // POST /api/connections/:id/resources/select
    const selectMatch = path.match(/^\/api\/connections\/([^/]+)\/resources\/select$/);
    if (selectMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, selectMatch[1], principal.userId);
      if (!conn) return;
      const selections = body.selections as Array<{
        resourceType: string;
        resourceId: string;
        displayName: string;
        path?: string;
        selected: boolean;
      }>;
      repo.upsertConnection({
        ...conn,
        resourceSelections: selections || [],
        updatedAt: new Date().toISOString(),
      });
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'resource_select',
        connectionId: conn.id,
        providerId: conn.providerId,
        outcome: 'success',
      });
      send(res, 200, { ok: true, selections: selections || [] }, origin);
      return;
    }

    // POST /api/connections/:id/search
    const searchMatch = path.match(/^\/api\/connections\/([^/]+)\/search$/);
    if (searchMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = sendOwnedOrNull(res, origin, repo, searchMatch[1], principal.userId);
      if (!conn) return;
      if (isConnectorSearchDisabled(cfg.isProduction)) {
        send(
          res,
          403,
          { error: 'forbidden', code: CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION },
          origin,
        );
        return;
      }
      const adapter = app.registry.getAdapter(conn.providerId);
      const query = String(body.query || '');
      if (!query) {
        send(res, 400, { error: 'query required' }, origin);
        return;
      }
      const result = await adapter!.searchRecords({
        connectionId: conn.id,
        query,
        resourceTypes: body.resourceTypes as string[] | undefined,
        limit: Number(body.limit || 25),
      });
      send(res, 200, result, origin);
      return;
    }

    // POST /api/webhooks/:provider
    const webhookMatch = path.match(/^\/api\/webhooks\/([^/]+)$/);
    if (webhookMatch) {
      const provider = parseProvider(webhookMatch[1]);
      if (!provider) {
        send(res, 400, { error: 'invalid_provider' }, origin);
        return;
      }
      const rawBody = await readRawBody(req);
      let parsed: unknown = {};
      try {
        parsed = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsed = {};
      }
      const digest = createHash('sha256').update(rawBody).digest('hex');
      const eventId = `${provider}:${digest.slice(0, 16)}`;
      const saved = repo.saveWebhook({
        id: eventId,
        providerId: provider,
        eventType: String((parsed as Record<string, unknown>).action || 'unknown'),
        payloadDigest: digest,
        receivedAt: new Date().toISOString(),
        status: 'queued',
      });
      audit({
        repo,
        action: 'webhook_received',
        providerId: provider,
        outcome: 'success',
        detail: eventId,
      });
      const adapter = getProviderAdapter(app, provider);
      if (adapter && 'processWebhook' in adapter) {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === 'string') headers[k] = v;
        }
        const result = await adapter.processWebhook({
          headers,
          body: parsed,
          rawBody,
        });
        repo.markWebhook(eventId, result.accepted ? 'processed' : 'failed');
        send(res, 200, result, origin);
        return;
      }
      if (!saved) {
        send(res, 200, { accepted: true, detail: 'duplicate' }, origin);
        return;
      }
      repo.markWebhook(eventId, 'processed');
      send(res, 200, { accepted: true }, origin);
      return;
    }

    send(res, 404, { error: 'not_found' }, origin);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    send(
      res,
      status,
      {
        error: status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'server_error',
        message: status < 500 ? (err as Error).message : 'Internal error',
      },
      origin,
    );
  }
}
