import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@fluentui/react-components';
import { AccessDeniedState } from '@hvcg/atlas-design-system';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from './RoleProvider';
import type { Capability } from './rbac';

/**
 * Route guard: wait for MSAL, then require a signed-in account (or allowed Dev Owner)
 * with a resolved Atlas role. Unresolved / Unauthenticated fail closed — no private UI.
 *
 * Capability misses render AccessDenied in place. Navigating signed-in operators to
 * /access-denied can bounce them back to the typed URL (AccessDeniedPage auto-returns
 * anyone with viewExecutiveHome), which would flash module chrome instead of denying it.
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
        <Spinner size="medium" label="Checking sign-in…" />
      </div>
    );
  }

  if (!signedIn || role === 'Unauthenticated' || role === 'Unresolved') {
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
      <AccessDeniedState
        title="Access denied"
        description="Your Atlas role does not include this module."
        actions={<Link to="/">Return home</Link>}
      />
    );
  }

  return children;
}
