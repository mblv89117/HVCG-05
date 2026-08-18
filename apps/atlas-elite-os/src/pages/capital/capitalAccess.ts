/**
 * Capital Hub access policy for Elite.
 * 401/403 always fail closed — never substitute synthetic/sample data.
 * This module has no Vite/MSAL imports so unit tests can load it in Node.
 */

export type CapitalFallbackKind = 'read-collection' | 'read-item' | 'mutate';

export function hubStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/** 401 and 403 are authorization failures. Never substitute synthetic data. */
export function isAuthorizationFailure(err: unknown): boolean {
  const status = hubStatus(err);
  if (status === 401 || status === 403) return true;
  const msg = String((err as Error)?.message || err || '');
  return /microsoft sign-in required|bearer token missing|invalid or expired microsoft token/i.test(msg);
}

export class CapitalAccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'CapitalAccessError';
    this.status = status;
  }
}

export function toCapitalAccessError(err: unknown): CapitalAccessError {
  const status = hubStatus(err) || (isAuthorizationFailure(err) ? 401 : 0);
  if (status === 403) {
    return new CapitalAccessError(
      403,
      'Access denied. You are signed in but not entitled to this capital data. Synthetic demonstration data is not shown.',
    );
  }
  return new CapitalAccessError(
    401,
    'Authenticated access required. Hub returned 401. Synthetic demonstration data is not shown.',
  );
}

/**
 * Synthetic fallback is opt-in demo mode for Hub outage / undeployed routes.
 * 401/403 always fail closed. Mutations never fall back. Item 404 is not-found.
 */
export function shouldUseSyntheticFallback(
  err: unknown,
  kind: CapitalFallbackKind = 'read-collection',
  allowSampleFallback = false,
): boolean {
  if (!allowSampleFallback) return false;
  if (kind === 'mutate' || kind === 'read-item') return false;
  if (isAuthorizationFailure(err)) return false;
  const status = hubStatus(err);
  if (status === 404 || status === 501 || status === 503) return true;
  const msg = String((err as Error)?.message || err || '');
  return /failed to fetch|networkerror|load failed|mixed content|err_connection|econnrefused|network request failed/i.test(
    msg,
  );
}
