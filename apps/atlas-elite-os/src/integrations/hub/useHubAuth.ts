import { useEffect, useMemo, useState } from 'react';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import { acquireHubBearerToken } from '../../microsoft/auth/msal';
import { useAtlasRole } from '../../security/RoleProvider';
import type { AtlasHubAuthHeaders } from './api';

/**
 * Hub auth for Elite OS pages.
 * Signed-out: no forged user id / no Bearer (hub must 401; UI must show zero client data).
 * Signed-in: MSAL Bearer + scope headers after identity is proven server-side.
 */
export function useHubAuth(): AtlasHubAuthHeaders {
  const { account } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const [accessToken, setAccessToken] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account) {
        if (!cancelled) setAccessToken(undefined);
        return;
      }
      try {
        const token = await acquireHubBearerToken();
        if (!cancelled) setAccessToken(token || undefined);
      } catch {
        if (!cancelled) setAccessToken(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  return useMemo(() => {
    if (!account) {
      return {
        userId: '',
        organizationId: 'org-hvcg',
        clientIds: [],
        roles: ['Guest'],
      };
    }
    return {
      userId: account.localAccountId || account.homeAccountId || '',
      organizationId: 'org-hvcg',
      clientIds: ['*'],
      email: account.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
      accessToken,
    };
  }, [account, role, accessToken]);
}
