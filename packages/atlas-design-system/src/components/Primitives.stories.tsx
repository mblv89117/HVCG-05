import type { Meta, StoryObj } from '@storybook/react';
import { StatusChip, SourceBadge, AtlasStatusChip } from './StatusChip';
import { EmptyState, LoadingState, LoadingSkeleton } from './EmptyState';
import { DashboardWidget, SparkBars } from './DashboardWidget';
import { GlobalAICommandPanel } from './SearchAndAI';
import { AttentionCard, DecisionCard, QueueTabs } from './OperatingPrimitives';
import { AtlasCard } from './AtlasCard';
import { ErrorState, AccessDeniedState } from './Overlays';
import { ATLAS_STATUS, atlasStatusTone } from '../status/statusLanguage';
import { DocumentSearchRegular } from '@fluentui/react-icons';
import { Button } from '@fluentui/react-components';
import { useState } from 'react';

const meta: Meta = { title: 'Primitives', tags: ['autodocs'] };
export default meta;

export const Chips: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatusChip label="Approved" tone="success" />
        <StatusChip label="Pending" tone="warning" />
        <StatusChip label="Blocked" tone="danger" />
        <StatusChip label="In Review" tone="info" />
        <StatusChip label="Unverified" tone="neutral" />
        <StatusChip label="Compliance Review" tone="gold" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatusChip label="Approved" tone="success" size="sm" />
        <StatusChip label="Pending" tone="warning" size="sm" />
        <StatusChip label="Blocked" tone="danger" size="sm" />
        <SourceBadge kind="Repository-derived" />
        <SourceBadge kind="Development sample" />
        <SourceBadge kind="Unavailable" />
        <SourceBadge status="Live" />
      </div>
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
      <EmptyState
        title="No rows in this queue"
        description="Filters returned an empty set."
        density="compact"
        align="start"
      />
      <ErrorState title="Capital Command Center could not load" description="Try again. Stack traces are never shown here." />
      <AccessDeniedState layout="inline" density="compact" />
      <LoadingState rows={4} />
      <LoadingSkeleton variant="card" rows={3} />
      <LoadingSkeleton variant="kpi" />
      <LoadingSkeleton variant="table" rows={5} columns={4} density="compact" />
    </div>
  ),
};

export const Cards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <AtlasCard title="Default" subtitle="Hairline panel">
        Operating surface. No lift, no glow.
      </AtlasCard>
      <AtlasCard variant="quiet" title="Quiet" density="compact">
        Compact density for queues and workbenches.
      </AtlasCard>
      <AtlasCard variant="glass" title="Glass">
        Quiet frost — not glassmorphism.
      </AtlasCard>
      <AtlasCard variant="accent" title="Accent">
        Gold rail for featured, verified content.
      </AtlasCard>
      <AtlasCard variant="ai" title="AI insight" density="compact">
        Azure rail. Unverified output stays labeled elsewhere.
      </AtlasCard>
    </div>
  ),
};

export const StatusLanguage: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        ATLAS_STATUS.needsAction,
        ATLAS_STATUS.needsManny,
        ATLAS_STATUS.waiting,
        ATLAS_STATUS.overdue,
        ATLAS_STATUS.blocked,
        ATLAS_STATUS.atRisk,
        ATLAS_STATUS.ready,
        ATLAS_STATUS.verified,
        ATLAS_STATUS.unverified,
        ATLAS_STATUS.complete,
        ATLAS_STATUS.funded,
        ATLAS_STATUS.complianceReview,
      ].map((label) => (
        <StatusChip key={label} label={label} tone={atlasStatusTone(label)} />
      ))}
      <AtlasStatusChip status="rfi_overdue" />
      <AtlasStatusChip status="needs-manny" size="sm" />
    </div>
  ),
};

export const OperatingCards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <AttentionCard
        title="RFI overdue — Harbor Logistics"
        reason="Lender questionnaire sitting 6 days past due."
        status={ATLAS_STATUS.overdue}
        owner="HVCG"
        dueLabel="Due 6 days ago"
      />
      <DecisionCard
        title="Approve shortlist — Northshore refinance"
        summary="Three lenders cleared compliance review. Owner decision required before outreach."
        status={ATLAS_STATUS.needsManny}
        recommendation="Proceed with first-lien term sheet A"
        actions={
          <>
            <Button size="small" appearance="primary">
              Approve
            </Button>
            <Button size="small">Revise</Button>
          </>
        }
      />
    </div>
  ),
};

export const Queues: StoryObj = {
  render: function QueuesStory() {
    const [value, setValue] = useState('needs-action');
    return (
      <QueueTabs
        value={value}
        onChange={setValue}
        tabs={[
          { id: 'needs-action', label: ATLAS_STATUS.needsAction, count: 4 },
          { id: 'needs-manny', label: ATLAS_STATUS.needsManny, count: 2 },
          { id: 'waiting', label: ATLAS_STATUS.waiting, count: 7 },
          { id: 'ready', label: ATLAS_STATUS.ready, count: 1 },
        ]}
      />
    );
  },
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
