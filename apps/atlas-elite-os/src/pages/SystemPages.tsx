import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  AccessDeniedState,
  ErrorState,
  EmptyState,
  LoadingState,
  PageLayout,
  AtlasCard,
} from '@hvcg/atlas-design-system';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import type { Capability } from '../security/rbac';

/** Same-origin path only. Query `from` must not bounce operators onto a foreign URL. */
function safeReturnTo(raw: string | null | undefined): string {
  if (!raw) return '/';
  const path = raw.split('#')[0];
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

function capabilityForPath(pathname: string): Capability | null {
  const path = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/admin' || path === '/connections' || path.startsWith('/connections/')) return 'viewAdmin';
  if (
    path === '/capital' ||
    path.startsWith('/capital/') ||
    path === '/financials' ||
    path === '/revenue' ||
    path === '/enterprise-value' ||
    path === '/banking' ||
    path === '/accounting'
  ) {
    return 'viewFinance';
  }
  if (path.startsWith('/clients/') && path !== '/clients/intake') return 'viewClientDetail';
  if (path === '/clients' || path === '/clients/intake') return 'viewClients';
  if (path === '/') return 'viewExecutiveHome';
  return null;
}

function canOpenReturnTo(returnTo: string, can: (capability: Capability) => boolean): boolean {
  const needed = capabilityForPath(returnTo);
  if (!needed) return true;
  return can(needed);
}

export function AccessDeniedPage() {
  const location = useLocation();
  const { role, can } = useAtlasRole();
  const { configured, signIn, error } = useMicrosoftAuth();

  const returnTo = safeReturnTo(
    (location.state as { from?: string } | null)?.from ||
      (typeof location.search === 'string' && new URLSearchParams(location.search).get('from')) ||
      '/',
  );

  // Bounce only when the destination is now allowed (e.g. Local Owner just activated).
  // Do not send a signed-in role back to /admin or /capital when they still lack the capability —
  // that loop would either spin or flash operational chrome.
  if (role !== 'Unauthenticated' && role !== 'Unresolved') {
    if (canOpenReturnTo(returnTo, can)) {
      return <Navigate to={returnTo === '/access-denied' ? '/' : returnTo} replace />;
    }
  }

  const unauthenticated = role === 'Unauthenticated';
  const unresolved = role === 'Unresolved';

  const title = unauthenticated
    ? 'Sign-in required'
    : unresolved
      ? 'No authorized Atlas role'
      : 'Insufficient Atlas permissions';

  const description = unauthenticated
    ? 'Sign in with Microsoft so Atlas can acquire a Hub access token (Elite SPA / MSAL). Local Owner only paints chrome — it does not authorize Hub, and it is not a certification session.'
    : unresolved
      ? 'You are signed in, but your Entra token has no recognizable Atlas app role (HVCG Owner, HVCG Team Member, Client Executive, Client Team Member, Read-Only Advisor, or Administrator). There is no default Owner access.'
      : 'Your current Atlas role does not include this module. Contact an HVCG Owner to adjust Entra app role assignments.';

  return (
    <PageLayout
      title={title}
      subtitle={unauthenticated ? 'Sign in to operate Atlas' : 'This role cannot open this module'}
    >
      {error ? (
        <MessageBar intent="error" style={{ marginBottom: 12 }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}
      <AccessDeniedState
        title={unauthenticated ? 'Choose a session' : title}
        description={description}
        actions={
          <>
            {unauthenticated && configured ? (
              <Button appearance="primary" onClick={() => void signIn()}>
                Sign in with Microsoft
              </Button>
            ) : null}
            {unauthenticated ? null : (
            <Link to="/">
              <Button appearance="secondary">Return home</Button>
            </Link>
            )}
          </>
        }
      />
    </PageLayout>
  );
}

export function NotFoundPage() {
  return (
    <PageLayout title="Page not found" subtitle="This route is not part of Atlas">
      <ErrorState
        title="Page not found"
        description="This address is not a live Atlas module. Return to Command Center, or sign in if you followed a private link."
        actions={
          <Link to="/">
            <Button appearance="primary">Command Center</Button>
          </Link>
        }
      />
    </PageLayout>
  );
}

export function ErrorPage() {
  return (
    <PageLayout title="Error" subtitle="Recoverable failure state">
      <ErrorState
        actions={
          <>
            <Button appearance="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Link to="/">
              <Button appearance="secondary">Executive Home</Button>
            </Link>
          </>
        }
      />
    </PageLayout>
  );
}

export function EmptyDemoPage() {
  return (
    <PageLayout title="Empty state" subtitle="Design-system empty pattern">
      <AtlasCard>
        <EmptyState
          title="Nothing to show yet"
          description="When verified records connect, this area fills with actionable rows."
          actions={
            <Link to="/">
              <Button appearance="primary">Back home</Button>
            </Link>
          }
        />
      </AtlasCard>
    </PageLayout>
  );
}

export function LoadingDemoPage() {
  return (
    <PageLayout title="Loading" subtitle="Skeleton pattern while Microsoft services resolve">
      <AtlasCard title="Connecting">
        <LoadingState rows={8} label="Loading executive modules" />
      </AtlasCard>
    </PageLayout>
  );
}
