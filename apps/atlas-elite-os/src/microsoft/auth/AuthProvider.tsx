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
  isEntraConfigured,
  microsoftConfig,
} from '../index';
import {
  DEV_OWNER_DISPLAY_NAME,
  isDevOwnerLoginAllowed,
  readDevOwnerSessionActive,
  writeDevOwnerSessionActive,
} from '../../security/devOwnerSession';

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
}

const AuthContext = createContext<AuthState | null>(null);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devOwnerActive, setDevOwnerActive] = useState(false);
  const configured = isEntraConfigured();
  const devOwnerLoginAllowed = isDevOwnerLoginAllowed();

  useEffect(() => {
    setDevOwnerActive(readDevOwnerSessionActive());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const instance = await getMsal();
        if (!instance) {
          if (!cancelled) setReady(true);
          return;
        }
        const active = getActiveAccount(instance);
        if (!cancelled) setAccount(active);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setReady(true);
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

  const displayName = account?.name || account?.username || (effectiveDevOwner ? DEV_OWNER_DISPLAY_NAME : 'Guest');

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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMicrosoftAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMicrosoftAuth requires MicrosoftAuthProvider');
  return ctx;
}
