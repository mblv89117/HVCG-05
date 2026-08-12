import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SOURCE_OF_TRUTH_RULES, type ProviderId } from '@hvcg/atlas-integration-core';
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
import { runDiscoveryForConnection } from '../discovery/discover.ts';
import { runClient360Ingestion, buildExecutiveDashboard } from '../client360/ingest.ts';
import { requirePrincipal } from '../middleware/auth.ts';
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
  pm: PmRepository;
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

    // GET /api/connections
    if (method === 'GET' && path === '/api/connections') {
      await requirePrincipal(req, cfg);
      // Multi-account inventory: return ALL active connections unless filtered.
      const ownerUserId = url.searchParams.get('ownerUserId') || undefined;
      const providerId = url.searchParams.get('provider') as ProviderId | null;
      const businessEntity = url.searchParams.get('businessEntity') || undefined;
      const connections = repo.listConnections({
        ownerUserId: ownerUserId || undefined,
        providerId: providerId || undefined,
        businessEntity,
      });
      send(res, 200, { connections }, origin);
      return;
    }

    // GET /api/connections/:id
    const connMatch = path.match(/^\/api\/connections\/([^/]+)$/);
    if (method === 'GET' && connMatch) {
      await requirePrincipal(req, cfg);
      const conn = repo.getConnection(connMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
      send(res, 200, { connection: conn }, origin);
      return;
    }

    // GET /api/connections/:id/health
    const healthMatch = path.match(/^\/api\/connections\/([^/]+)\/health$/);
    if (method === 'GET' && healthMatch) {
      await requirePrincipal(req, cfg);
      const health = connectionHealth(deps, healthMatch[1]);
      if (!health) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
      send(res, 200, health, origin);
      return;
    }

    // GET /api/connections/:id/resources
    const resourcesMatch = path.match(/^\/api\/connections\/([^/]+)\/resources$/);
    if (method === 'GET' && resourcesMatch) {
      await requirePrincipal(req, cfg);
      const conn = repo.getConnection(resourcesMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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
      await requirePrincipal(req, cfg);
      send(res, 200, { jobs: repo.listSyncJobs(syncJobsMatch[1]) }, origin);
      return;
    }

    // GET /api/connections/:id/errors
    const errorsMatch = path.match(/^\/api\/connections\/([^/]+)\/errors$/);
    if (method === 'GET' && errorsMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { errors: repo.listSyncErrors(errorsMatch[1]) }, origin);
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

    // GET /api/audit
    if (method === 'GET' && path === '/api/audit') {
      await requirePrincipal(req, cfg);
      const limit = Number(url.searchParams.get('limit') || 100);
      send(res, 200, { events: repo.listAudit(limit) }, origin);
      return;
    }

    // GET /api/admin/dashboard
    if (method === 'GET' && path === '/api/admin/dashboard') {
      await requirePrincipal(req, cfg);
      send(res, 200, { summary: repo.dashboardSummary(), ...repo.dashboardSummary() }, origin);
      return;
    }

    // GET /api/inventory — multi-account connection inventory for HVS/HVCG
    if (method === 'GET' && path === '/api/inventory') {
      await requirePrincipal(req, cfg);
      const connections = repo.listConnections();
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
          client360: repo.listClient360(),
          summary: repo.dashboardSummary(),
        },
        origin,
      );
      return;
    }

    // GET /api/connections/:id/discovered
    const discoveredMatch = path.match(/^\/api\/connections\/([^/]+)\/discovered$/);
    if (method === 'GET' && discoveredMatch) {
      await requirePrincipal(req, cfg);
      send(res, 200, { resources: repo.listDiscoveredResources(discoveredMatch[1]) }, origin);
      return;
    }

    // GET /api/client360
    if (method === 'GET' && path === '/api/client360') {
      await requirePrincipal(req, cfg);
      send(res, 200, { candidates: repo.listClient360() }, origin);
      return;
    }

    // GET /api/client360/executive-dashboard
    if (method === 'GET' && path === '/api/client360/executive-dashboard') {
      await requirePrincipal(req, cfg);
      send(res, 200, { dashboard: buildExecutiveDashboard(repo) }, origin);
      return;
    }

    // GET /api/client360/migration/summary — HVS link-first migration status
    if (method === 'GET' && path === '/api/client360/migration/summary') {
      await requirePrincipal(req, cfg);
      const records = repo.listAllSourceRecords(500_000).filter(
        (r) => r.fields?.migrationStatus === 'link_only',
      );
      const byClient: Record<string, number> = {};
      let restricted = 0;
      for (const r of records) {
        const name = String(r.fields.atlasClientName || 'Unknown');
        byClient[name] = (byClient[name] || 0) + 1;
        if (r.fields.sensitivityRestricted) restricted++;
      }
      send(
        res,
        200,
        {
          mode: 'link_first',
          originalsUnchanged: true,
          hvsMutated: false,
          linkedDocuments: records.length,
          restrictedDocuments: restricted,
          byClient,
        },
        origin,
      );
      return;
    }

    // GET /api/client360/:id
    const clientMatch = path.match(/^\/api\/client360\/([^/]+)$/);
    if (method === 'GET' && clientMatch) {
      await requirePrincipal(req, cfg);
      const id = decodeURIComponent(clientMatch[1]);
      const cand = repo.listClient360().find((c) => c.id === id);
      if (!cand) {
        send(res, 404, { error: 'client_not_found' }, origin);
        return;
      }
      send(res, 200, { client: cand }, origin);
      return;
    }

    // GET /api/client360/:id/documents — HVS link-first docs (restricted excluded from broad list)
    const docsMatch = path.match(/^\/api\/client360\/([^/]+)\/documents$/);
    if (method === 'GET' && docsMatch) {
      await requirePrincipal(req, cfg);
      const id = decodeURIComponent(docsMatch[1]);
      const cand = repo.listClient360().find((c) => c.id === id);
      if (!cand) {
        send(res, 404, { error: 'client_not_found' }, origin);
        return;
      }
      const includeRestricted = new URL(req.url || '', 'http://local').searchParams.get('includeRestricted') === '1';
      const docIds = new Set(cand.associations.documents);
      const hvsKeys = new Set(
        cand.sourceRefs.filter((s) => s.businessEntity === 'HVS').map((s) => s.sourceRecordId),
      );
      const records = repo.listAllSourceRecords(500_000).filter((r) => {
        if (docIds.has(r.id)) return true;
        if (hvsKeys.has(r.provenance.sourceRecordId)) return true;
        if (String(r.fields.atlasClientId || '') === id) return true;
        const name = String(r.fields.atlasClientName || '').toLowerCase();
        return name && name === (cand.displayName || '').toLowerCase();
      });
      const documents = records
        .filter((r) => includeRestricted || !r.fields.sensitivityRestricted)
        .slice(0, 500)
        .map((r) => ({
          id: r.id,
          title: r.title,
          kind: r.kind,
          webUrl: r.fields.webUrl || r.provenance.sourceUrl,
          path: r.fields.path,
          classification: r.fields.atlasClassification || r.fields.documentClass,
          sensitivityRestricted: Boolean(r.fields.sensitivityRestricted),
          sensitivityReasons: r.fields.sensitivityReasons || [],
          sourceTenant: r.fields.sourceTenant || 'highvaluesolution.com',
          sourceAccount: r.fields.accountEmail || r.provenance.sourceAccount,
          sourceRecordId: r.provenance.sourceRecordId,
          migrationStatus: r.fields.migrationStatus || 'link_only',
          modifiedAt: r.fields.occurredAt || r.provenance.originalModifiedAt,
          searchVisible: r.fields.searchVisible !== false && !r.fields.sensitivityRestricted,
        }));
      send(
        res,
        200,
        {
          clientId: id,
          displayName: cand.displayName,
          count: documents.length,
          restrictedOmitted: !includeRestricted,
          documents,
        },
        origin,
      );
      return;
    }

    // POST routes
    if (method !== 'POST') {
      send(res, 405, { error: 'method_not_allowed' }, origin);
      return;
    }

    const body = (await readJson(req)) as Record<string, unknown>;

    // POST /api/client360/ingest-microsoft — deep sync ALL Microsoft accounts, then rebuild Client 360
    if (path === '/api/client360/ingest-microsoft') {
      const principal = await requirePrincipal(req, cfg);
      const msIds = repo
        .listConnections({ providerId: 'microsoft' })
        .filter((c) => c.status === 'Connected')
        .map((c) => c.id);
      const jobs = await runBatchSync({ repo, app }, msIds);
      const candidates = runClient360Ingestion(repo);
      const dashboard = buildExecutiveDashboard(repo);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'client360_ingest_microsoft',
        outcome: 'success',
        detail: `synced ${msIds.length} microsoft connections → ${candidates.length} clients`,
      });
      send(res, 200, { jobs, candidates, dashboard, connectionIds: msIds }, origin);
      return;
    }

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
      const conn = repo.getConnection(disconnectMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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
      const conn = repo.getConnection(discoverMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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

    // POST /api/sync/all — each connection independently
    if (path === '/api/sync/all') {
      const principal = await requirePrincipal(req, cfg);
      const ids = repo.listConnections().map((c) => c.id);
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

    // POST /api/client360/rebuild
    if (path === '/api/client360/rebuild') {
      const principal = await requirePrincipal(req, cfg);
      const candidates = runClient360Ingestion(repo);
      const dashboard = buildExecutiveDashboard(repo);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'client360_rebuild',
        outcome: 'success',
        detail: `${candidates.length} candidates`,
      });
      send(res, 200, { candidates, dashboard }, origin);
      return;
    }

    // POST /api/connections/:id/reauthorize
    const reauthMatch = path.match(/^\/api\/connections\/([^/]+)\/reauthorize$/);
    if (reauthMatch) {
      const principal = await requirePrincipal(req, cfg);
      const conn = repo.getConnection(reauthMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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
      const conn = repo.getConnection(verifyMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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
      const conn = repo.getConnection(syncMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
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
      const conn = repo.getConnection(selectMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
        return;
      }
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
      await requirePrincipal(req, cfg);
      const conn = repo.getConnection(searchMatch[1]);
      if (!conn) {
        send(res, 404, { error: 'not_found' }, origin);
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
