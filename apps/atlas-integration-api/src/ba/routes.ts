/**
 * BA routes on Integration Hub — Phase 0 Elite↔BA non-Production binding.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { assertClientAccess, requirePrincipal, type AtlasPrincipal } from '../middleware/auth.ts';
import type { AppConfig } from '../config.ts';
import { httpStatusForBa, invokeBaBridge } from './invokePython.ts';

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

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function principalPayload(p: AtlasPrincipal): Record<string, unknown> {
  return {
    userId: p.userId,
    email: p.email,
    organizationId: p.organizationId,
    allowedClientIds: p.allowedClientIds,
    roles: p.roles,
    environment: 'DEV',
  };
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

  try {
    const principal = await requirePrincipal(req, cfg);

    if (method === 'GET' && path === '/api/ba/health') {
      const result = await invokeBaBridge({
        op: 'security.ping',
        principal: principalPayload(principal),
        payload: {},
      });
      send(res, httpStatusForBa(result), result, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/ba/gates') {
      const result = await invokeBaBridge({
        op: 'gates.registry',
        principal: principalPayload(principal),
        payload: {},
      });
      send(res, httpStatusForBa(result), result, origin);
      return true;
    }

    if (method !== 'POST') {
      send(res, 405, { error: 'method_not_allowed' }, origin);
      return true;
    }

    const body = await readJson(req);
    const clientId = String(body.clientId || body.client || '');
    if (clientId) {
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
      send(res, 404, { error: 'not_found', path }, origin);
      return true;
    }

    const result = await invokeBaBridge({
      op,
      principal: principalPayload(principal),
      payload: { ...body, client: clientId || body.client, clientId },
    });
    send(res, httpStatusForBa(result), result, origin);
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    const code = (err as { code?: string }).code;
    send(
      res,
      status,
      {
        ok: false,
        status: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
        code,
        message: (err as Error).message,
        leakage: false,
      },
      origin,
    );
    return true;
  }
}
