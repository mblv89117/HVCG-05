import { useEffect, useMemo, useState } from 'react';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { acquireHubBearerToken } from '../../microsoft/auth/msal';
import { useAtlasRole } from '../../security/RoleProvider';
import type { AtlasHubAuthHeaders } from './api';

export type HubAuthState = AtlasHubAuthHeaders & {
  /** True after first token acquisition attempt for the current account. */
  tokenReady: boolean;
  /** True when a Bearer is available for Hub calls. */
  hasBearer: boolean;
};

/**
 * Hub auth for Elite OS pages.
 * Signed-out: no forged user id / no Bearer (hub must 401; UI must show zero client data).
 * Signed-in: wait for Hub API accessToken, then send Bearer + scope headers.
 *
 * Callers MUST wait for `tokenReady` (and preferably `hasBearer`) before Hub requests.
 */
export function useHubAuth(): HubAuthState {
  const { account, ready: authReady } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authReady) return;
      if (!account) {
        if (!cancelled) {
          setAccessToken(undefined);
          setTokenReady(true);
        }
        return;
      }
      setTokenReady(false);
      try {
        const token = await acquireHubBearerToken();
        if (!cancelled) setAccessToken(token || undefined);
      } catch {
        if (!cancelled) setAccessToken(undefined);
      } finally {
        if (!cancelled) setTokenReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, authReady]);

  return useMemo(() => {
    if (!account) {
      return {
        userId: '',
        organizationId: 'org-hvcg',
        clientIds: [],
        roles: ['Guest'],
        tokenReady: authReady && tokenReady,
        hasBearer: false,
      };
    }
    return {
      userId: account.localAccountId || account.homeAccountId || '',
      organizationId: 'org-hvcg',
      clientIds: ['*'],
      email: account.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
      accessToken,
      tokenReady,
      hasBearer: Boolean(accessToken),
    };
  }, [account, role, accessToken, tokenReady, authReady]);
}
