import { Link } from 'react-router-dom';
import { PageLayout, AtlasCard, EmptyState, StatusChip } from '@hvcg/atlas-design-system';
import { Button, Caption1, Text } from '@fluentui/react-components';

export type DeferredBoundaryProps = {
  title: string;
  subtitle?: string;
  description: string;
  notAtlasSor: string;
  atlasFallback?: string;
};

/** Honest fail-closed surface for routes that are not Atlas V1 SoR. No metrics, no coming-soon CTA. */
export function DeferredBoundaryPage({
  title,
  subtitle = 'Deferred · not Atlas system of record',
  description,
  notAtlasSor,
  atlasFallback,
}: DeferredBoundaryProps) {
  return (
    <PageLayout title={title} subtitle={subtitle}>
      <AtlasCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <StatusChip label="Deferred" tone="warning" />
          <StatusChip label="Not Atlas SoR" tone="neutral" />
        </div>
        <EmptyState title={`${title} is deferred`} />
        <Text size={300} style={{ display: 'block', marginTop: 16 }}>
          {description}
        </Text>
        <Caption1 style={{ display: 'block', marginTop: 16 }}>System of record</Caption1>
        <Text size={300} style={{ display: 'block', marginTop: 4 }}>
          {notAtlasSor}
        </Text>
        {atlasFallback ? (
          <Text size={300} style={{ display: 'block', marginTop: 12 }}>
            {atlasFallback}
          </Text>
        ) : null}
        <Link to="/">
          <Button appearance="secondary" style={{ marginTop: 16 }}>
            Return to Command Center
          </Button>
        </Link>
      </AtlasCard>
    </PageLayout>
  );
}

export function PlaceholderModule({ title }: { title: string }) {
  return (
    <DeferredBoundaryPage
      title={title}
      description={`${title} is not an Atlas Version 1 system of record. This route stays fail-closed. It is not a preview of Growth Command Center, 360 Growth, Agent Copilot, EVA, or Microsoft 365.`}
      notAtlasSor="Outside Atlas. Atlas V1 SoR is SharePoint HVCG_* for clients, projects, tasks, and HVCG finance operations only."
      atlasFallback="Use Command Center, Clients, Projects, or Capital for live Atlas work."
    />
  );
}
