import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import {
  loadConfig,
  assertPlaidConfigured,
  isPlaidConfigured,
  type AppConfig,
} from './config.ts';
import { createPlaidClient, approvedProductsEnum, PLAID_COUNTRY } from './plaid/client.ts';
import { encryptSecret } from './crypto/tokenVault.ts';
import { PlaidRepository } from './store/repository.ts';
import {
  assertClientAccess,
  requireVerifiedPrincipal,
  type AtlasPrincipal,
} from './middleware/auth.ts';
import { audit } from './audit/auditLog.ts';
import { syncConnection } from './sync/syncService.ts';
import type { ConnectionSummary } from '../../../packages/atlas-plaid-contracts/src/index.ts';
import { buildVerifiedCashSnapshot } from './finance/mappings.ts';

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

function corsOrigin(req: IncomingMessage, cfg: AppConfig): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  return cfg.allowedOrigins.includes(origin) ? origin : null;
}

async function requirePrincipal(req: IncomingMessage, cfg: AppConfig): Promise<AtlasPrincipal> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
  }
  try {
    return await requireVerifiedPrincipal(headers, cfg);
  } catch (e) {
    const status = (e as { status?: number }).status || 401;
    audit({
      action: 'auth_failure',
      outcome: 'denied',
      detail: status === 401 ? 'missing_or_invalid_bearer' : 'auth_rejected',
    });
    throw e;
  }
}

function guardClient(principal: AtlasPrincipal, clientId: string) {
  if (principal.allowedClientIds.includes('*')) return;
  assertClientAccess(principal, clientId);
}

function toConnectionSummary(repo: PlaidRepository, clientId: string): ConnectionSummary[] {
  const items = repo.listItemsForClient(clientId);
  const accounts = repo.listAccountsForClient(clientId);
  return items.map((item) => ({
    connectionId: item.id,
    itemId: item.itemId,
    institution: { institutionId: item.institutionId, name: item.institutionName },
    status: item.status,
    lastSyncedAt: item.lastSyncedAt,
    consentRecordId: item.consentRecordId,
    createdAt: item.createdAt,
    accounts: accounts
      .filter((a) => a.connectionId === item.id)
      .map((a) => ({
        accountId: a.accountId,
        name: a.name,
        officialName: a.officialName,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        currentBalance: a.currentBalance,
        availableBalance: a.availableBalance,
        isoCurrencyCode: a.isoCurrencyCode,
        status: a.status,
        lastSyncedAt: a.lastSyncedAt,
        provenance: a.provenance,
      })),
  }));
}

export function startServer() {
  const cfg = loadConfig();
  const repo = new PlaidRepository(cfg.dataDir);

  const server = createServer(async (req, res) => {
    const origin = corsOrigin(req, cfg);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': origin || '',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers':
          'content-type,authorization,x-atlas-user-id,x-atlas-organization-id,x-atlas-client-ids,x-atlas-user-email,x-atlas-roles',
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
            plaidConfigured: isPlaidConfigured(cfg),
            env: cfg.plaidEnv,
            products: ['auth', 'balance', 'identity', 'liabilities', 'statements', 'transactions'],
          },
          origin,
        );
        return;
      }

      // --- GET connections (browser-safe) ---
      if (req.method === 'GET' && path === '/api/plaid/connections') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = url.searchParams.get('clientId');
        if (!clientId) {
          send(res, 400, { error: 'clientId required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        send(res, 200, { connections: toConnectionSummary(repo, clientId) }, origin);
        return;
      }

      if (req.method === 'GET' && path === '/api/plaid/cash-snapshot') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = url.searchParams.get('clientId');
        const clientCode = url.searchParams.get('clientCode') || '';
        if (!clientId) {
          send(res, 400, { error: 'clientId required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        const snap = buildVerifiedCashSnapshot(repo, clientId, clientCode);
        send(res, 200, snap, origin);
        return;
      }

      if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' }, origin);
        return;
      }

      const body = (await readJson(req)) as Record<string, unknown>;

      // --- link-token ---
      if (path === '/api/plaid/link-token') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        if (!clientId) {
          send(res, 400, { error: 'clientId required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        if (!isPlaidConfigured(cfg)) {
          send(
            res,
            503,
            {
              error: 'plaid_not_configured',
              message:
                'Plaid credentials are not configured. Owner must set secrets per OWNER_ACTIONS_PLAID.md. No fake success.',
            },
            origin,
          );
          return;
        }
        assertPlaidConfigured(cfg);
        const plaid = createPlaidClient(cfg);
        const resp = await plaid.linkTokenCreate({
          user: { client_user_id: `${principal.organizationId}:${clientId}:${principal.userId}` },
          client_name: 'HVCG Atlas',
          products: approvedProductsEnum(),
          country_codes: PLAID_COUNTRY,
          language: 'en',
          webhook: cfg.webhookUrl || undefined,
        });
        audit({
          action: 'link_token_created',
          organizationId: principal.organizationId,
          clientId,
          actorId: principal.userId,
          outcome: 'success',
        });
        // Never return secrets
        send(
          res,
          200,
          {
            linkToken: resp.data.link_token,
            expiration: resp.data.expiration,
            requestId: resp.data.request_id,
          },
          origin,
        );
        return;
      }

      // --- exchange-token ---
      if (path === '/api/plaid/exchange-token') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const publicToken = String(body.publicToken || '');
        const consentAcceptedAt = String(body.consentAcceptedAt || '');
        const consentVersion = String(body.consentVersion || 'atlas-plaid-consent-v1');
        const clientCode = String(body.clientCode || '');
        if (!clientId || !publicToken || !consentAcceptedAt) {
          send(res, 400, { error: 'clientId, publicToken, consentAcceptedAt required' }, origin);
          return;
        }
        guardClient(principal, clientId);
        if (!isPlaidConfigured(cfg)) {
          send(res, 503, { error: 'plaid_not_configured' }, origin);
          return;
        }
        assertPlaidConfigured(cfg);
        const plaid = createPlaidClient(cfg);
        try {
          const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
          const accessToken = exchange.data.access_token;
          const itemId = exchange.data.item_id;
          const accountsResp = await plaid.accountsGet({ access_token: accessToken });
          const institutionId = accountsResp.data.item.institution_id || 'unknown';
          let institutionName = institutionId;
          try {
            if (accountsResp.data.item.institution_id) {
              const inst = await plaid.institutionsGetById({
                institution_id: accountsResp.data.item.institution_id,
                country_codes: PLAID_COUNTRY,
              });
              institutionName = inst.data.institution.name;
            }
          } catch {
            /* keep id */
          }

          const dup = repo.findActiveItemForInstitution(clientId, institutionId);
          if (dup) {
            send(
              res,
              409,
              {
                error: 'duplicate_institution',
                message: 'This institution is already linked. Disconnect first or reconnect that item.',
                connectionId: dup.id,
              },
              origin,
            );
            return;
          }

          const consentId = crypto.randomUUID();
          repo.saveConsent({
            id: consentId,
            organizationId: principal.organizationId,
            clientId,
            version: consentVersion,
            acceptedAt: consentAcceptedAt,
            acceptedBy: principal.userId,
            textDigest: createHash('sha256').update(consentVersion).digest('hex'),
          });

          const connectionId = crypto.randomUUID();
          const now = new Date().toISOString();
          repo.upsertItem({
            id: connectionId,
            organizationId: principal.organizationId,
            clientId,
            clientCode,
            itemId,
            accessTokenCiphertext: encryptSecret(accessToken, cfg.tokenEncryptionKeyB64),
            institutionId,
            institutionName,
            status: 'Connected',
            products: ['auth', 'balance', 'identity', 'liabilities', 'statements', 'transactions'],
            consentRecordId: consentId,
            lastSyncedAt: null,
            syncCursor: null,
            errorCode: null,
            errorMessage: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            dataSource: 'Plaid',
          });

          // Initial sync
          await syncConnection(plaid, repo, cfg, connectionId);

          audit({
            action: 'exchange_success',
            organizationId: principal.organizationId,
            clientId,
            connectionId,
            itemId,
            actorId: principal.userId,
            outcome: 'success',
          });

          send(
            res,
            200,
            {
              connectionId,
              itemId,
              institution: { institutionId, name: institutionName },
              connections: toConnectionSummary(repo, clientId),
            },
            origin,
          );
        } catch (err) {
          audit({
            action: 'exchange_failure',
            organizationId: principal.organizationId,
            clientId,
            actorId: principal.userId,
            outcome: 'failure',
            detail: err instanceof Error ? err.message.slice(0, 200) : 'exchange_failed',
          });
          send(res, 400, { error: 'exchange_failed', message: 'Unable to exchange public token' }, origin);
        }
        return;
      }

      // --- sync ---
      if (path === '/api/plaid/sync') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const connectionId = String(body.connectionId || '');
        guardClient(principal, clientId);
        const item = repo.getItem(connectionId);
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
        if (!isPlaidConfigured(cfg)) {
          send(res, 503, { error: 'plaid_not_configured' }, origin);
          return;
        }
        const plaid = createPlaidClient(cfg);
        const result = await syncConnection(plaid, repo, cfg, connectionId);
        send(res, 200, { ok: true, ...result, connections: toConnectionSummary(repo, clientId) }, origin);
        return;
      }

      // --- disconnect ---
      if (path === '/api/plaid/disconnect') {
        const principal = await requirePrincipal(req, cfg);
        const clientId = String(body.clientId || '');
        const connectionId = String(body.connectionId || '');
        guardClient(principal, clientId);
        const item = repo.getItem(connectionId);
        if (!item || item.clientId !== clientId) {
          send(res, 404, { error: 'not_found' }, origin);
          return;
        }
        if (isPlaidConfigured(cfg)) {
          try {
            const plaid = createPlaidClient(cfg);
            const { decryptSecret } = await import('./crypto/tokenVault.ts');
            const token = decryptSecret(item.accessTokenCiphertext, cfg.tokenEncryptionKeyB64);
            await plaid.itemRemove({ access_token: token });
          } catch {
            // Still mark disconnected locally
          }
        }
        const now = new Date().toISOString();
        // Wipe ciphertext with empty encrypted marker only when key present
        let wiped = item.accessTokenCiphertext;
        if (cfg.tokenEncryptionKeyB64) {
          wiped = encryptSecret('REVOKED', cfg.tokenEncryptionKeyB64);
        } else {
          wiped = 'REVOKED';
        }
        repo.upsertItem({
          ...item,
          status: 'Disconnected',
          deletedAt: now,
          updatedAt: now,
          accessTokenCiphertext: wiped,
        });
        audit({
          action: 'disconnect',
          organizationId: item.organizationId,
          clientId,
          connectionId,
          itemId: item.itemId,
          actorId: principal.userId,
          outcome: 'success',
          detail: String(body.reason || 'user_requested'),
        });
        send(res, 200, { ok: true, connections: toConnectionSummary(repo, clientId) }, origin);
        return;
      }

      // --- webhook (idempotent) ---
      if (path === '/api/plaid/webhook') {
        const webhookType = String(body.webhook_type || body.webhookType || '');
        const webhookCode = String(body.webhook_code || body.webhookCode || '');
        const itemId = body.item_id ? String(body.item_id) : undefined;
        const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const eventId = `${webhookType}:${webhookCode}:${itemId || 'none'}:${digest.slice(0, 16)}`;
        repo.saveWebhook({
          id: eventId,
          webhookType,
          webhookCode,
          itemId,
          payloadDigest: digest,
          receivedAt: new Date().toISOString(),
          processedAt: null,
          status: 'queued',
        });
        audit({
          action: 'webhook_received',
          itemId,
          outcome: 'success',
          detail: `${webhookType}/${webhookCode}`,
        });

        if (itemId && isPlaidConfigured(cfg)) {
          const item = repo.getItemByPlaidItemId(itemId);
          if (item) {
            if (webhookCode === 'ERROR' || webhookCode === 'PENDING_EXPIRATION') {
              repo.upsertItem({
                ...item,
                status: 'NeedsReauthorization',
                updatedAt: new Date().toISOString(),
              });
              audit({
                action: 'reauth_required',
                clientId: item.clientId,
                connectionId: item.id,
                itemId,
                outcome: 'success',
              });
            } else if (
              webhookType === 'TRANSACTIONS' ||
              webhookType === 'ITEM' ||
              webhookType === 'HOLDINGS'
            ) {
              try {
                const plaid = createPlaidClient(cfg);
                await syncConnection(plaid, repo, cfg, item.id);
              } catch {
                /* queued failure audited in sync */
              }
            }
          }
        }
        repo.markWebhook(eventId, 'processed');
        audit({ action: 'webhook_processed', itemId, outcome: 'success', detail: eventId });
        send(res, 200, { received: true }, origin);
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

  server.listen(cfg.port, '127.0.0.1', () => {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'atlas-plaid-api listening',
        port: cfg.port,
        plaidConfigured: isPlaidConfigured(cfg),
        env: cfg.plaidEnv,
      }),
    );
  });

  return server;
}

startServer();
