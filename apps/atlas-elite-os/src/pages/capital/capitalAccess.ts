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

const AUTH_FAILURE_MSG =
  /microsoft sign-in required|bearer token missing|invalid or expired microsoft token|unauthorized|forbidden|access denied|\b401\b|\b403\b/i;

/** 401 and 403 are authorization failures. Never substitute synthetic data. */
export function isAuthorizationFailure(err: unknown): boolean {
  const status = hubStatus(err);
  if (status === 401 || status === 403) return true;
  const msg = String((err as Error)?.message || err || '');
  return AUTH_FAILURE_MSG.test(msg);
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

const STACK_LINE = /\n\s*at\s+/;

/**
 * Operator-safe error copy. Never returns a stack trace or raw exception dump.
 */
export function operatorFacingMessage(err: unknown, fallback: string): string {
  if (err instanceof CapitalAccessError) return err.message;
  if (isAuthorizationFailure(err)) return toCapitalAccessError(err).message;
  const status = hubStatus(err);
  if (status === 404) return fallback;
  if (status === 501 || status === 503) return 'Capital operations are unavailable on Hub right now.';
  const raw = err instanceof Error ? err.message : String(err || '');
  const firstLine = raw.split('\n')[0].replace(/^Error:\s*/i, '').trim();
  if (!firstLine || STACK_LINE.test(raw) || /^\s*at\s+/.test(firstLine)) {
    return fallback;
  }
  if (
    /failed to fetch|networkerror|load failed|mixed content|err_connection|econnrefused|network request failed/i.test(
      firstLine,
    )
  ) {
    return 'Hub is unreachable. Capital data was not loaded.';
  }
  if (firstLine.length > 220) return fallback;
  return firstLine;
}

export function accessFailureKind(err: unknown): 'unauthorized' | 'forbidden' | null {
  if (!isAuthorizationFailure(err)) return null;
  const status = err instanceof CapitalAccessError ? err.status : hubStatus(err);
  return status === 403 ? 'forbidden' : 'unauthorized';
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
