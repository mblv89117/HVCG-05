import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  loadConfig,
  assertQboConfigured,
  isQboConfigured,
  type AppConfig,
} from './config.ts';
import { encryptSecret, decryptSecret, redactRealmId } from './crypto/tokenVault.ts';
import { QboRepository } from './store/repository.ts';
import { parsePrincipal, assertClientAccess } from './middleware/auth.ts';
import { audit } from './audit/auditLog.ts';
import {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeAuthorizationCode,
  revokeToken,
  consentDigest,
  computeTokenStatus,
} from './qbo/oauth.ts';
import { syncConnection, toConnectionSummary } from './sync/syncService.ts';
import { startSyncScheduler } from './sync/scheduler.ts';
import { buildImportedAccountingSnapshot } from './finance/mappings.ts';
import type { QboConnectionRecord } from './store/types.ts';

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
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

function redirect(res: ServerResponse, location: string) {
  res.writeHead(302, { location, 'cache-control': 'no-store' });
  res.end();
}

function corsOrigin(req: IncomingMessage, cfg: AppConfig): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  return cfg.allowedOrigins.includes(origin) ? origin : null;
}

function requirePrincipal(req: IncomingMessage, cfg: AppConfig) {
  if (!cfg.requireAuth) {
    return {
      userId: 'dev-user',
      organizationId: 'org-hvcg',
      allowedClientIds: ['*'],
      roles: ['Admin'],
    };
  }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
  }
  const p = parsePrincipal(headers);
  if (!p) {
    audit({ action: 'auth_failure', outcome: 'denied', detail: 'missing principal headers' });
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return p;
}

function guardClient(
  principal: ReturnType<typeof requirePrincipal>,
  clientId: string,
) {
  if (principal.allowedClientIds.includes('*')) return;
  assertClientAccess(principal as never, clientId);
}

function notConfiguredBody() {
  return {
    error: 'qbo_not_configured',
    message:
      'QuickBooks credentials are not configured. Owner must set secrets per QuickBooksOwnerActions.md. No fake success.',
  };
}

export function createQboServer(options?: { enableScheduler?: boolean; listen?: boolean }) {
  const cfg = loadConfig();
  const repo = new QboRepository(cfg.dataDir);
  let scheduler: NodeJS.Timeout | null = null;

  const server = createServer(async (req, res) => {
    const origin = corsOrigin(req, cfg);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': origin || '',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers':
          'content-type,x-atlas-user-id,x-atlas-organization-id,x-atlas-client-ids,x-atlas-user-email,x-atlas-roles',
        'access-control-max-age': '86400',
      });
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const path = url.pathname;

      if (req.method === 'GET' && path === '/health') {
        send(
          res,
          200,
          {
            ok: true,
            qboConfigured: isQboConfigured(cfg),
            env: cfg.qboEnv,
            syncIntervalMs: cfg.syncIntervalMs,
            entities: [
              'Accounts',
              'Customers',
              'Vendors',
              'Invoices',
              'Bills',
              'Payments',
              'Deposits',
              'BankTransactions',
              'JournalEntries',
              'GeneralLedger',
              'ChartOfAccounts',
              'Classes',
              'Locations',
              'ProductsServices',
              'ProfitAndLoss',
              'BalanceSheet',
              'CashFlow',
            ],
          },
          origin,
        );
        return;
      }

      // OAuth callback — browser redirect from Intuit (no principal headers)
      if (req.method === 'GET' && path === '/api/qbo/oauth/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const realmId = url.searchParams.get('realmId');
        const error = url.searchParams.get('error');
        if (error || !code || !state || !realmId) {
          audit({
            action: 'oauth_callback_failure',
            outcome: 'failure',
            detail: error || 'missing_code_state_realm',
          });
          redirect(
            res,
            `${cfg.frontendErrorRedirect}?qbo=error&reason=${encodeURIComponent(error || 'callback_invalid')}`,
          );
          return;
        }
        if (!isQboConfigured(cfg)) {
          redirect(res, `${cfg.frontendErrorRedirect}?qbo=error&reason=not_configured`);
          return;
        }
        const stateRec = repo.consumeOAuthState(state);
        if (!stateRec) {
          audit({ action: 'oauth_callback_failure', outcome: 'failure', detail: 'invalid_or_expired_state' });
          redirect(res, `${cfg.frontendErrorRedirect}?qbo=error&reason=invalid_state`);
          return;
        }
        try {
          assertQboConfigured(cfg);
          const tokens = await exchangeAuthorizationCode(cfg, code);
          const now = Date.now();
          const accessExpires = new Date(now + tokens.expiresIn * 1000).toISOString();
          const refreshExpires = tokens.xRefreshTokenExpiresIn
            ? new Date(now + tokens.xRefreshTokenExpiresIn * 1000).toISOString()
            : null;

          let connectionId = stateRec.reconnectConnectionId || crypto.randomUUID();
          const existing = repo.getConnectionByRealm(stateRec.clientId, realmId);
          if (existing && stateRec.mode === 'connect') {
            connectionId = existing.id;
          }
          if (stateRec.mode === 'reconnect' && stateRec.reconnectConnectionId) {
            connectionId = stateRec.reconnectConnectionId;
          }

          const prev = repo.getConnection(connectionId);
          const companyName = prev?.companyName || 'QuickBooks Company';

          const record: QboConnectionRecord = {
            id: connectionId,
            organizationId: stateRec.organizationId,
            clientId: stateRec.clientId,
            clientCode: stateRec.clientCode,
            realmId,
            companyName,
            country: prev?.country ?? null,
            accessTokenCiphertext: encryptSecret(tokens.accessToken, cfg.tokenEncryptionKeyB64),
            refreshTokenCiphertext: encryptSecret(tokens.refreshToken, cfg.tokenEncryptionKeyB64),
            accessTokenExpiresAt: accessExpires,
            refreshTokenExpiresAt: refreshExpires,
            status: 'Connected',
            oauthStatus: 'authorized',
            tokenStatus: computeTokenStatus(accessExpires, refreshExpires),
            syncStatus: 'idle',
            consentRecordId: stateRec.consentRecordId,
            lastSyncedAt: prev?.lastSyncedAt ?? null,
            lastSuccessfulSyncAt: prev?.lastSuccessfulSyncAt ?? null,
            consecutiveFailures: 0,
            errorCode: null,
            errorMessage: null,
            syncCheckpoints: prev?.syncCheckpoints ?? {},
            syncResume: null,
            createdAt: prev?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            dataSource: 'QuickBooks',
            provenance: 'ImportedAccounting',
          };
          repo.upsertConnection(record);

          audit({
            action: 'oauth_callback_success',
            organizationId: stateRec.organizationId,
            clientId: stateRec.clientId,
            connectionId,
            realmIdRedacted: redactRealmId(realmId),
            actorId: stateRec.actorId,
            outcome: 'success',
            detail: stateRec.mode,
          });

          // Initial sync (best-effort — UI can also trigger manual)
          try {
            await syncConnection(repo, cfg, connectionId);
          } catch {
            /* connection still saved; sync status audited */
          }

          redirect(
            res,
            `${cfg.frontendSuccessRedirect}?qbo=connected&connectionId=${encodeURIComponent(connectionId)}`,
          );
        } catch (err) {
          audit({
            action: 'oauth_callback_failure',
            organizationId: stateRec.organizationId,
            clientId: stateRec.clientId,
            actorId: stateRec.actorId,
            outcome: 'failure',
            detail: err instanceof Error ? err.message.slice(0, 160) : 'exchange_failed',
          });
          redirect(res, `${cfg.frontendErrorRedirect}?qbo=error&reason=exchange_failed`);
        }
        return;
      }

      if (req.method === 'GET' && path === '/api/qbo/connections') {
        const principal = requirePrincipal(req, cfg);
        const clientId = url.searchParams.get('clientId');
        if (!clientId) {
          send(res, 400, { error: 'clientId required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        const connections = repo.listConnectionsForClient(clientId).map((c) => toConnectionSummary(repo, c));
        send(
          res,
          200,
          {
            connections,
            qboConfigured: isQboConfigured(cfg),
            oauthStatus: isQboConfigured(cfg) ? 'ready' : 'not_configured',
          },
          origin,
        );
        return;
      }

      if (req.method === 'GET' && path === '/api/qbo/accounting-snapshot') {
        const principal = requirePrincipal(req, cfg);
        const clientId = url.searchParams.get('clientId');
        const clientCode = url.searchParams.get('clientCode') || '';
        if (!clientId) {
          send(res, 400, { error: 'clientId required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        send(res, 200, buildImportedAccountingSnapshot(repo, clientId, clientCode), origin);
        return;
      }

      if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' }, origin);
        return;
      }

      const body = (await readJson(req)) as Record<string, unknown>;

      // Start OAuth
      if (path === '/api/qbo/oauth/start') {
        const principal = requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const clientCode = String(body.clientCode || '');
        const consentAcceptedAt = String(body.consentAcceptedAt || '');
        const consentVersion = String(body.consentVersion || 'atlas-qbo-consent-v1');
        const mode = body.mode === 'reconnect' ? 'reconnect' : 'connect';
        const reconnectConnectionId = body.connectionId ? String(body.connectionId) : undefined;
        if (!clientId || !consentAcceptedAt) {
          send(res, 400, { error: 'clientId and consentAcceptedAt required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        if (!isQboConfigured(cfg)) {
          send(res, 503, notConfiguredBody(), origin);
          return;
        }
        assertQboConfigured(cfg);

        const consentId = crypto.randomUUID();
        repo.saveConsent({
          id: consentId,
          organizationId: principal.organizationId,
          clientId,
          version: consentVersion,
          acceptedAt: consentAcceptedAt,
          acceptedBy: principal.userId,
          textDigest: consentDigest(consentVersion),
        });

        const state = createOAuthState();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        repo.saveOAuthState({
          state,
          organizationId: principal.organizationId,
          clientId,
          clientCode,
          actorId: principal.userId,
          consentRecordId: consentId,
          mode,
          reconnectConnectionId,
          createdAt: new Date().toISOString(),
          expiresAt,
          consumedAt: null,
        });

        const authorizeUrl = buildAuthorizeUrl(cfg, state);
        audit({
          action: mode === 'reconnect' ? 'reconnect_start' : 'oauth_start',
          organizationId: principal.organizationId,
          clientId,
          connectionId: reconnectConnectionId,
          actorId: principal.userId,
          outcome: 'success',
        });
        send(res, 200, { authorizeUrl, state, expiresAt }, origin);
        return;
      }

      // Manual sync
      if (path === '/api/qbo/sync') {
        const principal = requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const connectionId = String(body.connectionId || '');
        guardClient(principal, clientId);
        const item = repo.getConnection(connectionId);
        if (!item || item.clientId !== clientId) {
          audit({
            action: 'access_denied',
            clientId,
            connectionId,
            actorId: principal.userId,
            outcome: 'denied',
          });
          send(res, 404, { error: 'not_found' }, origin);
          return;
        }
        if (!isQboConfigured(cfg)) {
          send(res, 503, notConfiguredBody(), origin);
          return;
        }
        const entities = Array.isArray(body.entities) ? (body.entities as never[]) : undefined;
        const result = await syncConnection(repo, cfg, connectionId, {
          entities,
          resume: body.resume !== false,
        });
        send(
          res,
          200,
          {
            ok: true,
            ...result,
            connections: repo.listConnectionsForClient(clientId).map((c) => toConnectionSummary(repo, c)),
          },
          origin,
        );
        return;
      }

      // Disconnect
      if (path === '/api/qbo/disconnect') {
        const principal = requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const connectionId = String(body.connectionId || '');
        guardClient(principal, clientId);
        const item = repo.getConnection(connectionId);
        if (!item || item.clientId !== clientId) {
          send(res, 404, { error: 'not_found' }, origin);
          return;
        }
        if (isQboConfigured(cfg)) {
          try {
            const refresh = decryptSecret(item.refreshTokenCiphertext, cfg.tokenEncryptionKeyB64);
            await revokeToken(cfg, refresh);
          } catch {
            try {
              const access = decryptSecret(item.accessTokenCiphertext, cfg.tokenEncryptionKeyB64);
              await revokeToken(cfg, access);
            } catch {
              /* still disconnect locally */
            }
          }
        }
        const now = new Date().toISOString();
        let wipedAccess = 'REVOKED';
        let wipedRefresh = 'REVOKED';
        if (cfg.tokenEncryptionKeyB64) {
          wipedAccess = encryptSecret('REVOKED', cfg.tokenEncryptionKeyB64);
          wipedRefresh = encryptSecret('REVOKED', cfg.tokenEncryptionKeyB64);
        }
        repo.upsertConnection({
          ...item,
          status: 'Disconnected',
          oauthStatus: 'revoked',
          tokenStatus: 'revoked',
          syncStatus: 'idle',
          deletedAt: now,
          updatedAt: now,
          accessTokenCiphertext: wipedAccess,
          refreshTokenCiphertext: wipedRefresh,
          syncResume: null,
        });
        audit({
          action: 'disconnect',
          organizationId: item.organizationId,
          clientId,
          connectionId,
          realmIdRedacted: redactRealmId(item.realmId),
          actorId: principal.userId,
          outcome: 'success',
          detail: String(body.reason || 'user_requested'),
        });
        send(
          res,
          200,
          {
            ok: true,
            connections: repo.listConnectionsForClient(clientId).map((c) => toConnectionSummary(repo, c)),
          },
          origin,
        );
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
  });

  server.on('close', () => {
    if (scheduler) clearInterval(scheduler);
  });

  const shouldListen = options?.listen !== false;
  if (shouldListen) {
    server.listen(cfg.port, '127.0.0.1', () => {
      console.info(
        JSON.stringify({
          level: 'info',
          msg: 'atlas-qbo-api listening',
          port: cfg.port,
          qboConfigured: isQboConfigured(cfg),
          env: cfg.qboEnv,
        }),
      );
      if (options?.enableScheduler !== false && isQboConfigured(cfg)) {
        scheduler = startSyncScheduler(repo, cfg);
      }
    });
  } else if (options?.enableScheduler !== false && isQboConfigured(cfg)) {
    scheduler = startSyncScheduler(repo, cfg);
  }

  return { server, repo, cfg, startScheduler: () => {
    if (!scheduler && isQboConfigured(cfg)) {
      scheduler = startSyncScheduler(repo, cfg);
    }
  } };
}

/** Production entry — bind and optionally start scheduler */
export function startServer(options?: { enableScheduler?: boolean }) {
  return createQboServer({ ...options, listen: true });
}

if (process.env.QBO_API_DISABLE_AUTOSTART !== '1') {
  startServer();
}
