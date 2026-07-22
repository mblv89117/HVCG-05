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
        setInitStage('swa_principal');
        window.__ATLAS_BOOT__?.setStage('Checking Static Web Apps session', 'Reading /.auth/me…');
        const swa = await fetchSwaAuthMe();
        if (!cancelled) setSwaPrincipal(swa.clientPrincipal);

        setInitStage('msal_init');
        window.__ATLAS_BOOT__?.setStage('Initializing Microsoft authentication', 'MSAL initialize…');
        const instance = await getMsal();
        if (!instance) {
          if (!cancelled) {
            setReady(true);
            setInitStage('ready_unconfigured');
            window.__ATLAS_BOOT__?.hide();
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
          // Hide boot splash once auth state is resolved; React shell is visible.
          window.__ATLAS_BOOT__?.hide();
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
    try {
      writeDevOwnerSessionActive(false);
      setDevOwnerActive(false);
      const a = await signInInteractive();
      setAccount(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
