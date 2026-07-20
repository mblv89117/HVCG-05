import type { ReactNode } from 'react';
import { PageLayout, AtlasCard, EmptyState, SectionHeader } from '@hvcg/atlas-design-system';
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
        <AtlasCard key={f.label} variant="glass" className="atlas-hover-lift">
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
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionHeader title={title} subtitle={description} actions={action} />
      {children}
    </div>
  );
}

export function WorkspaceTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace sections"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: 6,
        borderRadius: 14,
        border: '1px solid rgba(226,232,240,0.95)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className="atlas-focus-ring"
            onClick={() => onChange(tab.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: 10,
              padding: '8px 14px',
              fontWeight: selected ? 600 : 500,
              fontSize: 13,
              background: selected ? 'rgba(37,99,235,0.12)' : 'transparent',
              color: selected ? '#0B1F33' : '#64748B',
              boxShadow: selected ? 'inset 0 -2px 0 #C9A227' : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
