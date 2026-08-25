import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import {
  getMsal,
  getActiveAccount,
  signInInteractive,
  signOut,
  trySsoSilent,
  isEntraConfigured,
  microsoftConfig,
} from '../index';
import {
  DEV_OWNER_DISPLAY_NAME,
  isDevOwnerLoginAllowed,
  readDevOwnerSessionActive,
  writeDevOwnerSessionActive,
} from '../../security/devOwnerSession';
import { fetchSwaAuthMe, swaLoginHint, type SwaClientPrincipal } from '../../startup/swaAuthMe';
import { beginSwaMicrosoftSignIn, shouldUseSwaSignInNavigation } from '../../startup/swaSignIn';

const MSAL_INIT_TIMEOUT_MS = 10000;

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

interface AuthState {
  ready: boolean;
  configured: boolean;
  account: AccountInfo | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  environmentBanner: string;
  /** True when Local Owner (Dev) session is active and allowed. */
  devOwnerActive: boolean;
  /** True when the DEV Owner login control may be shown. */
  devOwnerLoginAllowed: boolean;
  activateDevOwner: () => void;
  clearDevOwner: () => void;
  displayName: string;
  /** SWA /.auth/me principal when present (hint only). */
  swaPrincipal: SwaClientPrincipal | null;
  initStage: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devOwnerActive, setDevOwnerActive] = useState(false);
  const [swaPrincipal, setSwaPrincipal] = useState<SwaClientPrincipal | null>(null);
  const [initStage, setInitStage] = useState('boot');
  const configured = isEntraConfigured();
  const devOwnerLoginAllowed = isDevOwnerLoginAllowed();

  useEffect(() => {
    setDevOwnerActive(readDevOwnerSessionActive());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setInitStage('msal_init');
        window.__ATLAS_BOOT__?.setStage('Initializing Microsoft authentication', 'MSAL initialize…');
        const instance = await withTimeout(getMsal(), MSAL_INIT_TIMEOUT_MS, 'MSAL initialize');

        setInitStage('swa_principal');
        // Hint only — never blocks shell; short timeout; not authorization.
        const swa = await fetchSwaAuthMe();
        if (!cancelled) setSwaPrincipal(swa.clientPrincipal);

        if (!instance) {
          if (!cancelled) {
            setReady(true);
            setInitStage('ready_unconfigured');
          }
          return;
        }

        setInitStage('redirect_handled');
        let active = getActiveAccount(instance);

        if (!active) {
          setInitStage('sso_silent');
          window.__ATLAS_BOOT__?.setStage(
            'Connecting Microsoft account',
            'Attempting silent SSO when a SWA login hint is available…',
          );
          active = await trySsoSilent(swaLoginHint(swa.clientPrincipal));
        }

        if (!cancelled) {
          setAccount(active);
          setInitStage(active ? 'ready_signed_in' : 'ready_signed_out');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setInitStage('error');
          window.__ATLAS_BOOT__?.fail(
            'msal_init_failed',
            e instanceof Error ? e.message : String(e),
          );
        }
      } finally {
        if (!cancelled) {
          setReady(true);
          window.__ATLAS_REACT_MOUNTED__ = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activateDevOwner = useCallback(() => {
    if (!isDevOwnerLoginAllowed()) {
      setError('Local Owner (Dev) login is disabled in this environment.');
      return;
    }
    writeDevOwnerSessionActive(true);
    setDevOwnerActive(true);
    setError(null);
  }, []);

  const clearDevOwner = useCallback(() => {
    writeDevOwnerSessionActive(false);
    setDevOwnerActive(false);
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    writeDevOwnerSessionActive(false);
    setDevOwnerActive(false);
    // Hub authorization requires the Elite SPA MSAL client (49d20328…) and
    // api://…/access_as_user. Do not send operators through SWA Easy Auth
    // (/.auth/login/aad): this Free SWA has no invited users, so Microsoft
    // can succeed and identity.7…/.auth/login/done still returns 401.
    // SWA /.auth/me remains an optional silent SSO hint only.
    if (!configured) {
      if (shouldUseSwaSignInNavigation()) {
        beginSwaMicrosoftSignIn();
        return;
      }
      setError('Microsoft Entra is not configured for this Elite build.');
      return;
    }
    try {
      const a = await signInInteractive();
      setAccount(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [configured]);

  const signOutUser = useCallback(async () => {
    setError(null);
    try {
      writeDevOwnerSessionActive(false);
      setDevOwnerActive(false);
      await signOut();
      setAccount(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const effectiveDevOwner = devOwnerLoginAllowed && devOwnerActive && !account;

  const displayName =
    account?.name || account?.username || (effectiveDevOwner ? DEV_OWNER_DISPLAY_NAME : 'Guest');

  const environmentBanner = effectiveDevOwner
    ? `${microsoftConfig.environmentBanner} · LOCAL OWNER SESSION (DEV ONLY)`
    : microsoftConfig.environmentBanner;

  const value = useMemo(
    () => ({
      ready,
      configured,
      account,
      error,
      signIn,
      signOutUser,
      environmentBanner,
      devOwnerActive: effectiveDevOwner,
      devOwnerLoginAllowed,
      activateDevOwner,
      clearDevOwner,
      displayName,
      swaPrincipal,
      initStage,
    }),
    [
      ready,
      configured,
      account,
      error,
      signIn,
      signOutUser,
      environmentBanner,
      effectiveDevOwner,
      devOwnerLoginAllowed,
      activateDevOwner,
      clearDevOwner,
      displayName,
      swaPrincipal,
      initStage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMicrosoftAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMicrosoftAuth requires MicrosoftAuthProvider');
  return ctx;
}
