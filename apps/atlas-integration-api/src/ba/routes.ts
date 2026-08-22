/**
 * BA routes on Integration Hub.
 * Elite/browser -> Hub /api/ba/* -> authenticated Hub-to-BA HTTP. Production does not start a local Python subprocess.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { assertClientAccess, requirePrincipal, type AtlasPrincipal } from '../middleware/auth.ts';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import type { AppConfig } from '../config.ts';
import { BaClientError, httpStatusForBa, invokeBaDispatch } from './client.ts';

const MAX_BA_BODY_BYTES = 65_536;

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null, correlationId?: string) {
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
  if (correlationId) headers['x-correlation-id'] = correlationId;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJsonBounded(req: IncomingMessage, maxBytes: number): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    const buf = c as Buffer;
    size += buf.length;
    if (size > maxBytes) {
      const err = new Error('request body too large') as Error & { status: number; code: string };
      err.status = 413;
      err.code = 'payload_too_large';
      throw err;
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const err = new Error('malformed json') as Error & { status: number; code: string };
    err.status = 400;
    err.code = 'malformed_json';
    throw err;
  }
}

export function projectedBaEnvironment(cfg: AppConfig, env: NodeJS.ProcessEnv = process.env): string {
  if (cfg.isProduction) return 'production';
  const raw = (env.ATLAS_ENV || env.BA_ATLAS_ENV || 'development').trim().toLowerCase();
  if (raw === 'staging' || raw === 'stage') return 'staging';
  if (raw === 'test') return 'test';
  return 'development';
}

function principalPayload(p: AtlasPrincipal, cfg: AppConfig, correlationId: string): Record<string, unknown> {
  return {
    userId: p.userId,
    email: p.email,
    organizationId: p.organizationId,
    allowedClientIds: p.allowedClientIds.filter((id) => id !== '*'),
    roles: p.roles,
    environment: projectedBaEnvironment(cfg),
    correlationId,
  };
}

function correlationFrom(req: IncomingMessage): string {
  const header = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw && String(raw).trim()) return String(raw).trim().slice(0, 128);
  return `CORR-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

export async function handleBaRoutes(opts: {
  req: IncomingMessage;
  res: ServerResponse;
  cfg: AppConfig;
  path: string;
  method: string;
  origin: string | null;
}): Promise<boolean> {
  const { req, res, cfg, path, method, origin } = opts;
  if (!path.startsWith('/api/ba')) return false;
  const correlationId = correlationFrom(req);

  try {
    const principal = await requirePrincipal(req, cfg);

    if (method === 'GET' && path === '/api/ba/health') {
      const result = await invokeBaDispatch(cfg, {
        op: 'security.ping',
        principal: principalPayload(principal, cfg, correlationId),
        payload: {},
        correlationId,
      });
      send(res, httpStatusForBa(result), result, origin, correlationId);
      return true;
    }

    if (method === 'GET' && path === '/api/ba/gates') {
      const result = await invokeBaDispatch(cfg, {
        op: 'gates.registry',
        principal: principalPayload(principal, cfg, correlationId),
        payload: {},
        correlationId,
      });
      send(res, httpStatusForBa(result), result, origin, correlationId);
      return true;
    }

    if (method !== 'POST') {
      send(res, 405, { error: 'method_not_allowed' }, origin, correlationId);
      return true;
    }

    const body = await readJsonBounded(req, MAX_BA_BODY_BYTES);
    const clientId = String(body.clientId || body.client || '');
    if (clientId) {
      if (!principal.allowedClientIds.includes('*') && !isCanonicalClientCode(clientId)) {
        const err = new Error('Access denied: client not in principal scope') as Error & {
          status: number;
          code: string;
        };
        err.status = 403;
        err.code = 'forbidden';
        throw err;
      }
      assertClientAccess(principal, clientId);
    }

    const opMap: Record<string, string> = {
      '/api/ba/documents/access': 'doc.access',
      '/api/ba/documents/upload': 'doc.upload',
      '/api/ba/owner-support/access': 'owner.access',
      '/api/ba/ai/orchestrate': 'ai.orchestrate',
      '/api/ba/executive/intelligence': 'exec.intelligence',
      '/api/ba/blc1/block': 'blc1.block',
      '/api/ba/leads/create': 'lead.create',
      '/api/ba/leads/list': 'lead.list',
      '/api/ba/leads/get': 'lead.get',
      '/api/ba/leads/blc1': 'lead.blc1',
      '/api/ba/freefit/definition': 'freefit.definition',
      '/api/ba/freefit/complete': 'freefit.complete',
      '/api/ba/freefit/get': 'freefit.get',
      '/api/ba/freefit/by-lead': 'freefit.by_lead',
      '/api/ba/freefit/owner-decision': 'freefit.owner_decision',
      '/api/ba/freefit/blc1': 'freefit.blc1',
    };
    const op = opMap[path];
    if (!op) {
      send(res, 404, { error: 'not_found', path }, origin, correlationId);
      return true;
    }

    const result = await invokeBaDispatch(cfg, {
      op,
      principal: principalPayload(principal, cfg, correlationId),
      payload: { ...body, client: clientId || body.client, clientId },
      correlationId,
    });
    send(res, httpStatusForBa(result), result, origin, correlationId);
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code;
    if (err instanceof BaClientError || status === 503 || status === 502 || status === 413 || status === 400) {
      const baStatus =
        status === 413
          ? 'FORBIDDEN'
          : status === 400
            ? 'FORBIDDEN'
            : status === 502
              ? 'BA_BAD_GATEWAY'
              : 'BA_UNAVAILABLE';
      send(
        res,
        status,
        {
          ok: false,
          status: baStatus,
          code,
          message: (err as Error).message,
          leakage: false,
          correlationId,
        },
        origin,
        correlationId,
      );
      return true;
    }
    send(
      res,
      status,
      {
        ok: false,
        status: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        code,
        message: (err as Error).message,
        leakage: false,
        correlationId,
      },
      origin,
      correlationId,
    );
    return true;
  }
}
