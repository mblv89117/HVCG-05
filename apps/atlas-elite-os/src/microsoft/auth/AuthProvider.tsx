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

interface AuthState {
  ready: boolean;
  configured: boolean;
  account: AccountInfo | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  environmentBanner: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isEntraConfigured();

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

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const a = await signInInteractive();
      setAccount(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      setAccount(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const value = useMemo(
    () => ({
      ready,
      configured,
      account,
      error,
      signIn,
      signOutUser,
      environmentBanner: microsoftConfig.environmentBanner,
    }),
    [ready, configured, account, error, signIn, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMicrosoftAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMicrosoftAuth requires MicrosoftAuthProvider');
  return ctx;
}
