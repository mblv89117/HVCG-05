import { Link } from 'react-router-dom';
import {
  AccessDeniedState,
  ErrorState,
  EmptyState,
  LoadingState,
  PageLayout,
  AtlasCard,
} from '@hvcg/atlas-design-system';
import { Button } from '@fluentui/react-components';

export function AccessDeniedPage() {
  return (
    <PageLayout title="Access denied" subtitle="Role-aware gate">
      <AccessDeniedState
        actions={
          <Link to="/">
            <Button appearance="primary">Return to Executive Home</Button>
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
