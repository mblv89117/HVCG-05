/**
 * Module → Hub HMAC auth (Wave 3). Fail closed.
 * Headers: x-atlas-module-key, x-atlas-module-key-id, x-atlas-module-timestamp,
 *          x-atlas-module-signature = hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MIN_KEY = 16;
export const MODULE_INGEST_MAX_SKEW_MS = 5 * 60 * 1000;

export type ModuleIngestAuth =
  | { ok: true; keyId: string }
  | { ok: false; status: number; code: string; message: string };

function header(v: unknown): string {
  const got = Array.isArray(v) ? v[0] : v;
  return typeof got === 'string' ? got.trim() : '';
}

export function verifyModuleIngestHmac(opts: {
  keyHeader: unknown;
  keyIdHeader: unknown;
  timestampHeader: unknown;
  signatureHeader: unknown;
  rawBody: string;
  expectedKey: string;
  expectedKeyId: string;
  nowMs?: number;
}): ModuleIngestAuth {
  if (opts.expectedKey.trim().length < MIN_KEY) {
    return {
      ok: false,
      status: 503,
      code: 'MODULE_INGEST_UNAVAILABLE',
      message: 'Module ingest is not configured.',
    };
  }
  const key = header(opts.keyHeader);
  if (!key) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module intake key required.' };
  }
  const a = createHash('sha256').update(key, 'utf8').digest();
  const b = createHash('sha256').update(opts.expectedKey, 'utf8').digest();
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module intake key required.' };
  }
  const keyId = header(opts.keyIdHeader);
  if (!keyId || keyId !== opts.expectedKeyId.trim()) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module key id mismatch.' };
  }
  const ts = header(opts.timestampHeader);
  const now = opts.nowMs ?? Date.now();
  const tsMs = Date.parse(ts);
  if (!ts || !Number.isFinite(tsMs) || Math.abs(now - tsMs) > MODULE_INGEST_MAX_SKEW_MS) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module timestamp invalid or skewed.' };
  }
  const sig = header(opts.signatureHeader).toLowerCase();
  const expected = createHmac('sha256', opts.expectedKey)
    .update(`${ts}.${opts.rawBody}`, 'utf8')
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module signature invalid.' };
  }
  return { ok: true, keyId };
}
