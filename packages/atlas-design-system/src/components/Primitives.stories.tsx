import type { Meta, StoryObj } from '@storybook/react';
import { StatusChip, SourceBadge } from './StatusChip';
import { EmptyState, LoadingState } from './EmptyState';
import { DashboardWidget, SparkBars } from './DashboardWidget';
import { GlobalAICommandPanel } from './SearchAndAI';
import { AtlasProgress, AccessDeniedState, ErrorState, FilterToolbar, SectionHeader } from './Overlays';
import { DocumentSearchRegular } from '@fluentui/react-icons';
import { Button } from '@fluentui/react-components';

const meta: Meta = { title: 'Primitives', tags: ['autodocs'] };
export default meta;

export const Chips: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusChip label="Approved" tone="success" />
      <StatusChip label="Pending" tone="warning" />
      <StatusChip label="Blocked" tone="danger" />
      <SourceBadge kind="Repository-derived" />
      <SourceBadge kind="Development sample" />
      <SourceBadge kind="Unavailable" />
    </div>
  ),
};

export const EmptyAndLoading: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <EmptyState
        title="No approvals"
        description="When items need your decision, they appear here."
        icon={<DocumentSearchRegular />}
      />
      <LoadingState rows={4} />
      <AtlasProgress value={55} label="Initiative progress" />
    </div>
  ),
};

export const SystemStates: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <SectionHeader title="System patterns" subtitle="Access denied, error, filters" />
      <FilterToolbar>
        <StatusChip label="Filters" tone="gold" />
        <Button size="small">Apply</Button>
      </FilterToolbar>
      <AccessDeniedState actions={<Button appearance="primary">Home</Button>} />
      <ErrorState actions={<Button appearance="secondary">Retry</Button>} />
    </div>
  ),
};

export const Widget: StoryObj = {
  render: () => (
    <DashboardWidget
      label="Pipeline value"
      value="Awaiting verified source"
      trend="flat"
      trendLabel="Unavailable"
      source="Unavailable"
    >
      <SparkBars values={[0, 0, 0, 0, 0, 0, 0]} />
    </DashboardWidget>
  ),
};

export const AICommand: StoryObj = {
  render: () => <GlobalAICommandPanel />,
};
