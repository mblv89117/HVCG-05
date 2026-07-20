import { Link, Navigate, useNavigate } from 'react-router-dom';
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
  const { role, can } = useAtlasRole();
  const { activateDevOwner, devOwnerLoginAllowed, configured, signIn } = useMicrosoftAuth();

  // If authorization was just established (e.g. Local Owner), leave the denial page.
  if (role !== 'Unauthenticated' && role !== 'Unresolved' && can('viewExecutiveHome')) {
    return <Navigate to="/" replace />;
  }

  const unauthenticated = role === 'Unauthenticated';
  const unresolved = role === 'Unresolved';

  const title = unauthenticated
    ? 'Sign-in required'
    : unresolved
      ? 'No authorized Atlas role'
      : 'Insufficient Atlas permissions';

  const description = unauthenticated
    ? 'You are browsing as Unauthenticated. Finance, Administration, and other gated modules require an Atlas role. For local Owner UAT, use Local Owner (Dev). For shared environments, sign in with Microsoft and ensure your Entra account has HVCG Owner or Administrator app roles.'
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
            {unauthenticated && devOwnerLoginAllowed ? (
              <Button
                appearance="primary"
                onClick={() => {
                  activateDevOwner();
                  navigate('/');
                }}
              >
                Continue as Local Owner (Dev)
              </Button>
            ) : null}
            {unauthenticated && configured ? (
              <Button appearance="secondary" onClick={() => void signIn()}>
                Sign in with Microsoft
              </Button>
            ) : null}
            <Link to="/">
              <Button appearance={unauthenticated ? 'secondary' : 'primary'}>Return to Executive Home</Button>
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
