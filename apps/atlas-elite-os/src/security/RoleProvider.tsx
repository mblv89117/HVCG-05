import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';
import {
  can,
  resolveAtlasRole,
  type AtlasRole,
  type Capability,
} from './rbac';
import { resolveDevOwnerRole } from './devOwnerSession';

interface RoleContextValue {
  role: AtlasRole;
  can: (capability: Capability) => boolean;
  signedIn: boolean;
  /** True when authorization comes from Local Owner (Dev), not Entra. */
  usingDevOwner: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { account, devOwnerActive } = useMicrosoftAuth();
  const value = useMemo<RoleContextValue>(() => {
    const usingDevOwner = Boolean(devOwnerActive) && !account;
    const role = resolveAtlasRole({
      signedIn: Boolean(account) || usingDevOwner,
      idTokenClaims: (account?.idTokenClaims as Record<string, unknown> | undefined) || null,
      environment: microsoftConfig.environment,
      devOwnerSession: usingDevOwner,
      devOwnerRole: usingDevOwner ? resolveDevOwnerRole() : undefined,
    });
    return {
      role,
      signedIn: Boolean(account) || usingDevOwner,
      usingDevOwner,
      can: (capability: Capability) => can(role, capability),
    };
  }, [account, devOwnerActive]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useAtlasRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useAtlasRole requires RoleProvider');
  return ctx;
}
