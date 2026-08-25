/**
 * Optional Static Web Apps principal (/.auth/me).
 * Used only as an SSO login-hint source — never as Hub authorization.
 */

export interface SwaClientPrincipal {
  userId?: string;
  userDetails?: string;
  identityProvider?: string;
  userRoles?: string[];
  claims?: Array<{ typ: string; val: string }>;
}

export interface SwaAuthMe {
  clientPrincipal: SwaClientPrincipal | null;
}

export async function fetchSwaAuthMe(timeoutMs = 2500): Promise<SwaAuthMe> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/.auth/me', {
      credentials: 'include',
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { clientPrincipal: null };
    const data = (await res.json()) as SwaAuthMe;
    return { clientPrincipal: data?.clientPrincipal ?? null };
  } catch {
    return { clientPrincipal: null };
  } finally {
    clearTimeout(timer);
  }
}

export function swaLoginHint(principal: SwaClientPrincipal | null | undefined): string | undefined {
  if (!principal) return undefined;
  const fromClaims = principal.claims?.find(
    (c) =>
      c.typ === 'preferred_username' ||
      c.typ === 'emails' ||
      c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  )?.val;
  const hint = (fromClaims || principal.userDetails || '').trim();
  return hint || undefined;
}
