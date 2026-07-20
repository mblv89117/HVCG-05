import type { Meta, StoryObj } from '@storybook/react';
import { StatusChip, SourceBadge } from './StatusChip';
import { EmptyState, LoadingState } from './EmptyState';
import { DashboardWidget, SparkBars } from './DashboardWidget';
import { GlobalAICommandPanel } from './SearchAndAI';
import { DocumentSearchRegular } from '@fluentui/react-icons';

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
    </div>
  ),
};

export const Widget: StoryObj = {
  render: () => (
    <DashboardWidget
      label="Pipeline value"
      value="Awaiting verified data"
      trend="flat"
      trendLabel="Verification pending"
      source="Unavailable"
    >
      <SparkBars values={[0, 0, 0, 0, 0, 0, 0]} />
    </DashboardWidget>
  ),
};

export const AICommand: StoryObj = {
  render: () => <GlobalAICommandPanel />,
};
