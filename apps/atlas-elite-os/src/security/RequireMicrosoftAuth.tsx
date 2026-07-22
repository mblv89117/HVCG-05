import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from './RoleProvider';
import type { Capability } from './rbac';

/**
 * Route guard: wait for MSAL, then require a signed-in account (or allowed Dev Owner).
 * Does not render private page content while auth is unresolved or when signed out.
 */
export function RequireMicrosoftAuth({
  children,
  capability,
}: {
  children: ReactNode;
  /** Optional capability check after sign-in. */
  capability?: Capability;
}) {
  const location = useLocation();
  const { ready } = useMicrosoftAuth();
  const { signedIn, can, role } = useAtlasRole();

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <Spinner size="medium" label="Checking Microsoft sign-in…" />
      </div>
    );
  }

  if (!signedIn || role === 'Unauthenticated') {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (capability && !can(capability)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
