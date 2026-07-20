import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';
import {
  can,
  resolveAtlasRole,
  type AtlasRole,
  type Capability,
} from './rbac';

interface RoleContextValue {
  role: AtlasRole;
  can: (capability: Capability) => boolean;
  signedIn: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { account } = useMicrosoftAuth();
  const value = useMemo<RoleContextValue>(() => {
    const role = resolveAtlasRole({
      signedIn: Boolean(account),
      idTokenClaims: (account?.idTokenClaims as Record<string, unknown> | undefined) || null,
      environment: microsoftConfig.environment,
    });
    return {
      role,
      signedIn: Boolean(account),
      can: (capability: Capability) => can(role, capability),
    };
  }, [account]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useAtlasRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useAtlasRole requires RoleProvider');
  return ctx;
}
