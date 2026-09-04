import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyModuleIngestHmac } from './hmac.ts';
import { handleModuleEnvelope } from './handlers.ts';
import { upsertIngest } from './store.ts';

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null): void {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export async function handleModuleIngestRoutes(opts: {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  rawBody: string;
  dataDir: string;
  moduleIngestKey: string;
  moduleIngestKeyId?: string;
  origin?: string | null;
}): Promise<boolean> {
  if (opts.path !== '/api/modules/ingest' && !opts.path.startsWith('/api/modules/')) {
    return false;
  }
  if (opts.path !== '/api/modules/ingest') {
    send(opts.res, 404, { error: 'not_found' }, opts.origin);
    return true;
  }

  if (opts.method === 'OPTIONS') {
    opts.res.writeHead(204, {
      'access-control-allow-origin': opts.origin || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers':
        'content-type,x-atlas-module-key,x-atlas-module-key-id,x-atlas-module-timestamp,x-atlas-module-signature',
    });
    opts.res.end();
    return true;
  }

  if (opts.method !== 'POST') {
    send(opts.res, 405, { error: 'method_not_allowed' }, opts.origin);
    return true;
  }

  const auth = verifyModuleIngestHmac({
    keyHeader: opts.req.headers['x-atlas-module-key'],
    keyIdHeader: opts.req.headers['x-atlas-module-key-id'],
    timestampHeader: opts.req.headers['x-atlas-module-timestamp'],
    signatureHeader: opts.req.headers['x-atlas-module-signature'],
    rawBody: opts.rawBody,
    expectedKey: opts.moduleIngestKey,
    expectedKeyId: opts.moduleIngestKeyId || 'module',
  });
  if (!auth.ok) {
    send(opts.res, auth.status, { error: auth.code, message: auth.message }, opts.origin);
    return true;
  }

  let body: unknown;
  try {
    body = opts.rawBody ? JSON.parse(opts.rawBody) : {};
  } catch {
    send(opts.res, 400, { error: 'invalid_json' }, opts.origin);
    return true;
  }

  const handled = handleModuleEnvelope(body);
  if (!handled.ok) {
    send(opts.res, handled.status, { error: handled.code, message: handled.message }, opts.origin);
    return true;
  }

  const stored = upsertIngest({
    dataDir: opts.dataDir,
    keyId: auth.keyId,
    envelope: handled.envelope,
  });

  send(
    opts.res,
    stored.replay ? 200 : 201,
    {
      ok: true,
      replay: stored.replay,
      idempotencyKey: handled.envelope.idempotencyKey,
      clientCode: handled.envelope.clientCode,
      eventType: handled.envelope.eventType,
      notes: handled.notes,
      receivedAt: stored.record.receivedAt,
    },
    opts.origin,
  );
  return true;
}
