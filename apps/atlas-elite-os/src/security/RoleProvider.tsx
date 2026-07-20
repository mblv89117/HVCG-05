import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import * as graph from '../microsoft/adapters/graph';
import {
  normalizeProductRole,
  resolveRoleFromGroupIds,
  setResolvedAtlasRole,
  type AtlasProductRole,
} from '../security/rbac';

interface RoleContextValue {
  role: AtlasProductRole;
  source: 'entra-groups' | 'env-override' | 'default';
  resolving: boolean;
  error?: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { account } = useMicrosoftAuth();
  const envRole = normalizeProductRole(import.meta.env.VITE_ATLAS_ROLE as string | undefined);
  const [role, setRole] = useState<AtlasProductRole>(envRole);
  const [source, setSource] = useState<RoleContextValue['source']>(
    import.meta.env.VITE_ATLAS_ROLE ? 'env-override' : 'default',
  );
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setResolvedAtlasRole(role);
    return () => {
      if (cancelled) setResolvedAtlasRole(null);
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account) {
        const fallback = normalizeProductRole(import.meta.env.VITE_ATLAS_ROLE as string | undefined);
        if (!cancelled) {
          setRole(fallback);
          setSource(import.meta.env.VITE_ATLAS_ROLE ? 'env-override' : 'default');
          setResolvedAtlasRole(fallback);
        }
        return;
      }
      // Dev override wins only when explicitly set
      if (import.meta.env.VITE_ATLAS_ROLE && import.meta.env.VITE_ATLAS_ROLE_FORCE === 'true') {
        const forced = normalizeProductRole(import.meta.env.VITE_ATLAS_ROLE as string);
        if (!cancelled) {
          setRole(forced);
          setSource('env-override');
          setResolvedAtlasRole(forced);
        }
        return;
      }
      setResolving(true);
      setError(undefined);
      try {
        const groups = await graph.listMyMemberGroupIds();
        const resolved = resolveRoleFromGroupIds(groups.data);
        if (!cancelled) {
          if (resolved) {
            setRole(resolved);
            setSource('entra-groups');
            setResolvedAtlasRole(resolved);
          } else if (import.meta.env.VITE_ATLAS_ROLE) {
            const fallback = normalizeProductRole(import.meta.env.VITE_ATLAS_ROLE as string);
            setRole(fallback);
            setSource('env-override');
            setResolvedAtlasRole(fallback);
          } else {
            setRole('HVCG Owner');
            setSource('default');
            setResolvedAtlasRole('HVCG Owner');
            setError('No Entra group mapping matched — defaulting to HVCG Owner until Security configures group IDs.');
          }
        }
      } catch (e) {
        if (!cancelled) {
          const fallback = normalizeProductRole(
            (import.meta.env.VITE_ATLAS_ROLE as string | undefined) || 'HVCG Owner',
          );
          setRole(fallback);
          setSource(import.meta.env.VITE_ATLAS_ROLE ? 'env-override' : 'default');
          setResolvedAtlasRole(fallback);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  const value = useMemo(
    () => ({ role, source, resolving, error }),
    [role, source, resolving, error],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useAtlasRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: normalizeProductRole(import.meta.env.VITE_ATLAS_ROLE as string | undefined),
      source: import.meta.env.VITE_ATLAS_ROLE ? 'env-override' : 'default',
      resolving: false,
    };
  }
  return ctx;
}
