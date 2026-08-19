import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMicrosoftAuth } from '../../microsoft/auth/AuthProvider';
import {
  acquireHubAccessTokenInteractive,
  acquireHubAccessTokenSilent,
} from '../../microsoft/auth/msal';
import { useAtlasRole } from '../../security/RoleProvider';
import type { AtlasHubAuthHeaders } from './api';

export type HubAuthBootstrapStatus =
  | 'idle'
  | 'acquiring'
  | 'ready'
  | 'interaction_required'
  | 'no_account'
  | 'error';

export type HubAuthState = AtlasHubAuthHeaders & {
  /** True after first token acquisition attempt for the current account. */
  tokenReady: boolean;
  /** True when a Hub API accessToken is available. */
  hasBearer: boolean;
  bootstrapStatus: HubAuthBootstrapStatus;
  bootstrapMessage: string | null;
  /** Explicit user-gesture Hub authorization (popup once). */
  authorizeHub: () => Promise<void>;
};

const ACQUIRE_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Hub auth for Elite OS pages.
 * Signed-out: no forged user id / no Bearer.
 * Signed-in: wait for Hub API accessToken (silent), then send Bearer + scope headers.
 * Never auto-opens MSAL popups on hard refresh.
 */
export function useHubAuth(): HubAuthState {
  const { account, ready: authReady } = useMicrosoftAuth();
  const { role } = useAtlasRole();
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [tokenReady, setTokenReady] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState<HubAuthBootstrapStatus>('idle');
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);

  const runSilent = useCallback(async () => {
    if (!authReady) return;
    if (!account) {
      setAccessToken(undefined);
      setBootstrapStatus('no_account');
      setBootstrapMessage('Microsoft sign-in required before Atlas can call Integration Hub.');
      setTokenReady(true);
      return;
    }

    setTokenReady(false);
    setBootstrapStatus('acquiring');
    setBootstrapMessage('Acquiring Integration Hub access token…');
    try {
      const result = await withTimeout(
        acquireHubAccessTokenSilent(),
        ACQUIRE_TIMEOUT_MS,
        'Hub silent token acquisition',
      );
      if (result.status === 'ok') {
        setAccessToken(result.accessToken);
        setBootstrapStatus('ready');
        setBootstrapMessage(null);
      } else if (result.status === 'interaction_required') {
        setAccessToken(undefined);
        setBootstrapStatus('interaction_required');
        setBootstrapMessage(result.message);
      } else if (result.status === 'no_account') {
        setAccessToken(undefined);
        setBootstrapStatus('no_account');
        setBootstrapMessage('No active Microsoft account in MSAL cache.');
      } else {
        setAccessToken(undefined);
        setBootstrapStatus('error');
        setBootstrapMessage(result.message);
      }
    } catch (e) {
      setAccessToken(undefined);
      setBootstrapStatus('error');
      setBootstrapMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setTokenReady(true);
    }
  }, [account, authReady]);

  useEffect(() => {
    void runSilent();
  }, [runSilent]);

  const authorizeHub = useCallback(async () => {
    setBootstrapStatus('acquiring');
    setBootstrapMessage('Waiting for Hub authorization…');
    setTokenReady(false);
    try {
      const result = await acquireHubAccessTokenInteractive();
      if (result.status === 'ok') {
        setAccessToken(result.accessToken);
        setBootstrapStatus('ready');
        setBootstrapMessage(null);
      } else if (result.status === 'interaction_required' || result.status === 'no_account') {
        setAccessToken(undefined);
        setBootstrapStatus(result.status === 'no_account' ? 'no_account' : 'interaction_required');
        setBootstrapMessage(result.status === 'no_account' ? 'Sign in required.' : result.message);
      } else {
        setAccessToken(undefined);
        setBootstrapStatus('error');
        setBootstrapMessage(result.message);
      }
    } catch (e) {
      setAccessToken(undefined);
      setBootstrapStatus('error');
      setBootstrapMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setTokenReady(true);
    }
  }, []);

  return useMemo(() => {
    if (!account) {
      return {
        userId: '',
        organizationId: 'org-hvcg',
        clientIds: [],
        roles: ['Guest'],
        tokenReady: authReady && tokenReady,
        hasBearer: false,
        bootstrapStatus: authReady ? bootstrapStatus : 'acquiring',
        bootstrapMessage,
        authorizeHub,
      };
    }
    return {
      userId: account.localAccountId || account.homeAccountId || '',
      organizationId: 'org-hvcg',
      clientIds: [],
      email: account.username,
      roles: [role === 'Unauthenticated' ? 'Guest' : role],
      accessToken,
      tokenReady,
      hasBearer: Boolean(accessToken),
      bootstrapStatus,
      bootstrapMessage,
      authorizeHub,
    };
  }, [
    account,
    role,
    accessToken,
    tokenReady,
    authReady,
    bootstrapStatus,
    bootstrapMessage,
    authorizeHub,
  ]);
}
