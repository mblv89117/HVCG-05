import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  AccessDeniedState,
  ErrorState,
  EmptyState,
  LoadingState,
  PageLayout,
  AtlasCard,
} from '@hvcg/atlas-design-system';
import { Button } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, can } = useAtlasRole();
  const { activateDevOwner, devOwnerLoginAllowed, configured, signIn } = useMicrosoftAuth();

  const returnTo =
    (location.state as { from?: string } | null)?.from ||
    (typeof location.search === 'string' && new URLSearchParams(location.search).get('from')) ||
    '/';

  // If authorization was just established (e.g. Local Owner), leave the denial page.
  if (role !== 'Unauthenticated' && role !== 'Unresolved') {
    if (can('viewAdmin') && (returnTo === '/connections' || returnTo.startsWith('/connections'))) {
      return <Navigate to="/connections" replace />;
    }
    if (can('viewExecutiveHome')) {
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
    ? devOwnerLoginAllowed
      ? 'Microsoft Entra is not required for controlled Development UAT. Use Local Owner (Dev) to continue, or sign in with Microsoft if Entra is configured. Local Owner is disabled in Production/Staging.'
      : 'You must sign in with Microsoft before Atlas will show clients, portfolios, or other private data. Local Owner (Dev) is disabled in this environment (Production/Staging or not enabled). Sign in with your HVCG Entra account to continue.'
    : unresolved
      ? 'You are signed in, but your Entra token has no recognizable Atlas app role (HVCG Owner, HVCG Team Member, Client Executive, Client Team Member, Read-Only Advisor, or Administrator). There is no default Owner access.'
      : 'Your current Atlas role does not include this module. Contact an HVCG Owner to adjust Entra app role assignments.';

  return (
    <PageLayout title="Access denied" subtitle="Role matrix enforcement">
      <AccessDeniedState
        title={title}
        description={description}
        actions={
          <>
            {unauthenticated && configured ? (
              <Button appearance="primary" onClick={() => void signIn()}>
                Sign in with Microsoft
              </Button>
            ) : null}
            {unauthenticated && devOwnerLoginAllowed ? (
              <Button
                appearance="secondary"
                onClick={() => {
                  activateDevOwner();
                  navigate(returnTo === '/access-denied' ? '/connections' : returnTo, { replace: true });
                }}
              >
                Continue as Local Owner (Dev)
              </Button>
            ) : null}
            <Link to="/">
              <Button appearance="secondary">Return home</Button>
            </Link>
          </>
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
