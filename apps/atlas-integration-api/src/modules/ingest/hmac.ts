/**
 * Module → Hub HMAC auth (Wave 3 hardened). Fail closed.
 *
 * Headers (secret NEVER transmitted):
 *   x-atlas-module-key-id
 *   x-atlas-module-timestamp
 *   x-atlas-module-signature = hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))
 *
 * Secret is resolved server-side from key-id → configured secret map.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const MIN_KEY = 16;
export const MODULE_INGEST_MAX_SKEW_MS = 5 * 60 * 1000;

export type ModuleIngestAuth =
  | { ok: true; keyId: string }
  | { ok: false; status: number; code: string; message: string };

export type ModuleKeyRing = Readonly<Record<string, string>>;

function header(v: unknown): string {
  const got = Array.isArray(v) ? v[0] : v;
  return typeof got === 'string' ? got.trim() : '';
}

/** Build key-id → secret map. Unknown/blank secrets are omitted. */
export function buildModuleKeyRing(opts: {
  primaryKey?: string;
  primaryKeyId?: string;
  /** Optional JSON object string: {"gcc":"…","mri":"…"} */
  keysJson?: string;
}): ModuleKeyRing {
  const ring: Record<string, string> = {};
  const primaryId = (opts.primaryKeyId || 'module').trim() || 'module';
  const primary = (opts.primaryKey || '').trim();
  if (primary.length >= MIN_KEY) {
    ring[primaryId] = primary;
  }
  const raw = (opts.keysJson || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [id, secret] of Object.entries(parsed as Record<string, unknown>)) {
          const keyId = String(id || '').trim();
          const value = typeof secret === 'string' ? secret.trim() : '';
          if (keyId && value.length >= MIN_KEY) {
            ring[keyId] = value;
          }
        }
      }
    } catch {
      // Fail closed later if ring empty / unknown key-id.
    }
  }
  return Object.freeze(ring);
}

export function verifyModuleIngestHmac(opts: {
  keyIdHeader: unknown;
  timestampHeader: unknown;
  signatureHeader: unknown;
  rawBody: string;
  keyRing: ModuleKeyRing;
  nowMs?: number;
}): ModuleIngestAuth {
  if (Object.keys(opts.keyRing).length === 0) {
    return {
      ok: false,
      status: 503,
      code: 'MODULE_INGEST_UNAVAILABLE',
      message: 'Module ingest is not configured.',
    };
  }

  const keyId = header(opts.keyIdHeader);
  if (!keyId) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module key id required.' };
  }
  const secret = opts.keyRing[keyId];
  if (!secret) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Unknown module key id.' };
  }

  const ts = header(opts.timestampHeader);
  const now = opts.nowMs ?? Date.now();
  const tsMs = Date.parse(ts);
  if (!ts || !Number.isFinite(tsMs) || Math.abs(now - tsMs) > MODULE_INGEST_MAX_SKEW_MS) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module timestamp invalid or skewed.' };
  }

  const sig = header(opts.signatureHeader).toLowerCase();
  const expected = createHmac('sha256', secret)
    .update(`${ts}.${opts.rawBody}`, 'utf8')
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'Module signature invalid.' };
  }
  return { ok: true, keyId };
}
