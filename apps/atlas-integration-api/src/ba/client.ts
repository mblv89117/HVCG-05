/**
 * Hub → Business Analyst HTTP client.
 *
 * Production has no local Python subprocess fallback. If INTEGRATION_BA_BASE_URL is
 * unset, Hub still starts; /api/ba/* fail closed. PM and /health remain up.
 */
import type { AppConfig } from '../config.ts';

export type BaBridgeRequest = {
  op: string;
  principal: Record<string, unknown>;
  payload?: Record<string, unknown>;
  correlationId?: string;
};

export type BaBridgeResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  correlationId?: string;
  [key: string]: unknown;
};

export class BaClientError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'BaClientError';
    this.status = status;
    this.code = code;
  }
}

export type { BaClientSettings } from '../config.ts';

export type BaHttpConfig = Pick<AppConfig, 'isProduction' | 'ba'> & {
  baS2sToken?: AppConfig['baS2sToken'];
};

/** Production never uses a static env token. Production loadConfig wires managed identity via baS2sToken. */
export async function resolveBaS2sToken(
  cfg: BaHttpConfig,
  env: Record<string, string | undefined> = process.env,
): Promise<string | undefined> {
  if (cfg.baS2sToken) {
    return cfg.baS2sToken();
  }
  if (cfg.isProduction) {
    return undefined;
  }
  const staticTok = (env.INTEGRATION_BA_S2S_TOKEN || '').trim();
  return staticTok || undefined;
}

function isJsonObject(value: unknown): value is BaBridgeResponse {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function invokeBaDispatch(cfg: BaHttpConfig, req: BaBridgeRequest): Promise<BaBridgeResponse> {
  if (!cfg.ba.baseUrl) {
    throw new BaClientError('Business Analyst is not configured', 503, 'ba_not_configured');
  }
  const token = await resolveBaS2sToken(cfg);
  if (!token) {
    throw new BaClientError('Business Analyst authentication is not configured', 503, 'ba_auth_not_configured');
  }

  const correlationId = req.correlationId || '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.ba.timeoutMs);
  try {
    const res = await fetch(`${cfg.ba.baseUrl}/dispatch`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
      },
      body: JSON.stringify({
        op: req.op,
        principal: req.principal,
        payload: req.payload || {},
        correlationId: req.correlationId,
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BaClientError('Business Analyst returned a malformed response', 502, 'ba_malformed_response');
    }
    if (!isJsonObject(parsed)) {
      throw new BaClientError('Business Analyst returned a malformed response', 502, 'ba_malformed_response');
    }
    return parsed;
  } catch (err) {
    if (err instanceof BaClientError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new BaClientError('Business Analyst timeout', 503, 'ba_timeout');
    }
    throw new BaClientError('Business Analyst is unavailable', 503, 'ba_unavailable');
  } finally {
    clearTimeout(timer);
  }
}

export async function probeBaHealth(
  cfg: BaHttpConfig,
): Promise<{ configured: boolean; reachable: boolean | null }> {
  if (!cfg.ba.baseUrl) {
    return { configured: false, reachable: null };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.ba.healthTimeoutMs);
  try {
    const res = await fetch(`${cfg.ba.baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    return { configured: true, reachable: res.ok };
  } catch {
    return { configured: true, reachable: false };
  } finally {
    clearTimeout(timer);
  }
}

export function httpStatusForBa(result: BaBridgeResponse): number {
  const s = result.status || '';
  if (result.ok && (s === 'SUCCESS' || s === 'OK' || !s)) return 200;
  if (s === 'UNAUTHORIZED' || s === 'MISSING_CONTEXT') return 401;
  if (s === 'WRONG_CLIENT' || s === 'BLOCKED_PERMISSION' || s === 'FORBIDDEN' || s === 'RESTRICTED_MATTER')
    return 403;
  if (s === 'BLOCKED_POLICY' || s === 'PRODUCTION_GATED') return 403;
  if (s === 'NEEDS_HUMAN') return 202;
  return result.ok ? 200 : 403;
}

/** Production spawn fallback is removed. Always false. */
export function baLocalSpawnFallbackAllowed(_isProduction: boolean): false {
  return false;
}
