import type { ReactNode } from 'react';
import { PageLayout, AtlasCard, EmptyState, SectionRail } from '@hvcg/atlas-design-system';
import { MessageBar, MessageBarBody, MessageBarTitle, Text, Caption1 } from '@fluentui/react-components';
import type { DataAvailability } from '../../data/workspaces';

export function PendingBanner({
  title = 'Verified financial data not yet connected',
  body = 'Fields show pending labels only. No fabricated figures are displayed.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <MessageBar intent="warning">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {body}
      </MessageBarBody>
    </MessageBar>
  );
}

export function AvailabilityLine({ availability }: { availability: DataAvailability }) {
  return <Caption1>Source: {availability}</Caption1>;
}

export function ModuleScaffold({
  title,
  subtitle,
  actions,
  children,
  emptyTitle,
  emptyDescription,
  showPendingBanner = true,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  showPendingBanner?: boolean;
}) {
  return (
    <PageLayout title={title} subtitle={subtitle} actions={actions}>
      {showPendingBanner ? <PendingBanner /> : null}
      <div className="atlas-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
      {emptyTitle ? (
        <AtlasCard variant="quiet">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </AtlasCard>
      ) : null}
    </PageLayout>
  );
}

export function FieldGrid({
  fields,
}: {
  fields: Array<{ label: string; value: string; availability?: DataAvailability }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 14,
      }}
    >
      {fields.map((f) => (
        <AtlasCard key={f.label} variant="glass">
          <Caption1
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {f.label}
          </Caption1>
          <Text weight="semibold" size={400} style={{ display: 'block', marginTop: 8 }}>
            {f.value}
          </Text>
          {f.availability ? <AvailabilityLine availability={f.availability} /> : null}
        </AtlasCard>
      ))}
    </div>
  );
}

export function ModuleSection({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <SectionRail title={title} subtitle={subtitle} actions={actions}>
      {children}
    </SectionRail>
  );
}
