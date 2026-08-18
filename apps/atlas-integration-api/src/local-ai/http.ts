/**
 * Optional Local AI routes — mounted at /api/local-ai/*.
 * Always registered. Fail soft when disabled or when Ollama is absent.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import type { LocalAiAdapter } from './adapter.ts';

type ErrLike = Error & { status?: number; code?: string };

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
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('Request body must be a JSON object') as ErrLike;
      err.status = 400;
      err.code = 'malformed_json';
      throw err;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if ((err as ErrLike).status === 400) throw err;
    const bad = new Error('Request body is not valid JSON') as ErrLike;
    bad.status = 400;
    bad.code = 'malformed_json';
    throw bad;
  }
}

export async function handleLocalAiRoutes(opts: {
  cfg: AppConfig;
  localAi: LocalAiAdapter;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, localAi, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/local-ai')) return false;

  try {
    if (method === 'GET' && path === '/api/local-ai/health') {
      await requirePrincipal(req, cfg);
      const status = await localAi.health({ probe: true });
      send(res, 200, { ok: true, localAi: status }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/local-ai/flags') {
      await requirePrincipal(req, cfg);
      send(res, 200, { flags: localAi.getFlags(), localAi: localAi.snapshot() }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/local-ai/complete') {
      await requirePrincipal(req, cfg);
      const body = await readJson(req);
      const result = await localAi.complete({
        operation: String(body.operation || ''),
        sourceContent: String(body.sourceContent || ''),
        sourceRecordType: body.sourceRecordType ? String(body.sourceRecordType) : undefined,
        sourceRecordId: body.sourceRecordId ? String(body.sourceRecordId) : undefined,
        jobId: body.jobId ? String(body.jobId) : undefined,
      });
      send(res, result.status, result.body, origin);
      return true;
    }

    send(res, 404, { error: 'not_found' }, origin);
    return true;
  } catch (err) {
    const e = err as ErrLike;
    const status = typeof e.status === 'number' ? e.status : 500;
    send(
      res,
      status,
      {
        error: e.code || (status === 401 ? 'unauthorized' : 'local_ai_error'),
        message: status < 500 ? e.message : 'Internal error',
      },
      origin,
    );
    return true;
  }
}
