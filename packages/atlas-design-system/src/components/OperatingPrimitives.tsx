import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Caption1,
  TabList,
  Tab,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { AtlasCard } from './AtlasCard';
import { StatusChip, type StatusTone } from './StatusChip';
import { atlasStatusTone } from '../status/statusLanguage';
import { SectionRail } from './ExecutivePrimitives';
import { color } from '../tokens';

const TONE_EDGE: Record<StatusTone, string> = {
  success: color.emerald,
  warning: color.warning,
  danger: color.danger,
  info: color.azure,
  gold: color.gold,
  neutral: tokens.colorNeutralStroke2,
};

const useAttention = makeStyles({
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  reason: {
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
});

export interface AttentionCardProps {
  title: string;
  reason?: string;
  status?: string;
  tone?: StatusTone;
  dueLabel?: string;
  owner?: string;
  actions?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function AttentionCard({
  title,
  reason,
  status,
  tone,
  dueLabel,
  owner,
  actions,
  onClick,
  children,
  className,
}: AttentionCardProps) {
  const s = useAttention();
  const resolvedTone = tone || (status ? atlasStatusTone(status) : 'warning');
  const clickable = Boolean(onClick) && !actions;
  return (
    <AtlasCard
      variant="quiet"
      density="compact"
      className={className}
      interactive={clickable}
      onClick={clickable ? onClick : undefined}
      aria-label={title}
      style={{ borderLeft: `2px solid ${TONE_EDGE[resolvedTone]}` }}
      headerAction={status ? <StatusChip label={status} tone={resolvedTone} size="sm" /> : null}
      title={title}
      footer={
        actions || dueLabel || owner ? (
          <div className={s.meta}>
            {owner ? <Caption1>{owner}</Caption1> : null}
            {dueLabel ? <Caption1>{dueLabel}</Caption1> : null}
            {actions ? <div className={s.actions}>{actions}</div> : null}
          </div>
        ) : undefined
      }
    >
      {reason ? <Caption1 className={s.reason}>{reason}</Caption1> : null}
      {children}
    </AtlasCard>
  );
}

const useDecision = makeStyles({
  summary: {
    color: tokens.colorNeutralForeground2,
  },
  rec: {
    marginTop: '2px',
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginLeft: 'auto',
  },
});

export interface DecisionCardProps {
  title: string;
  summary?: string;
  status?: string;
  tone?: StatusTone;
  recommendation?: string;
  actions?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function DecisionCard({
  title,
  summary,
  status,
  tone,
  recommendation,
  actions,
  onClick,
  children,
  className,
}: DecisionCardProps) {
  const s = useDecision();
  const resolvedTone = tone || (status ? atlasStatusTone(status) : 'warning');
  const clickable = Boolean(onClick) && !actions;
  return (
    <AtlasCard
      variant="quiet"
      density="compact"
      className={className}
      interactive={clickable}
      onClick={clickable ? onClick : undefined}
      aria-label={title}
      title={title}
      headerAction={status ? <StatusChip label={status} tone={resolvedTone} size="sm" /> : null}
      footer={actions ? <div className={s.actions}>{actions}</div> : undefined}
    >
      {summary ? <Caption1 className={s.summary}>{summary}</Caption1> : null}
      {recommendation ? (
        <Caption1 className={s.rec}>Recommendation — {recommendation}</Caption1>
      ) : null}
      {children}
    </AtlasCard>
  );
}

export interface QueueTabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface QueueTabsProps {
  tabs: QueueTabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label'?: string;
  className?: string;
}

const useQueue = makeStyles({
  tabs: {
    flexWrap: 'wrap',
    rowGap: '2px',
  },
  count: {
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightRegular,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  body: {
    minWidth: 0,
  },
});

export function QueueTabs({
  tabs,
  value,
  onChange,
  'aria-label': ariaLabel = 'Work queues',
  className,
}: QueueTabsProps) {
  const s = useQueue();
  return (
    <TabList
      selectedValue={value}
      onTabSelect={(_, data) => onChange(String(data.value))}
      appearance="subtle"
      size="small"
      className={mergeClasses(s.tabs, className)}
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <Tab key={tab.id} value={tab.id} disabled={tab.disabled}>
          {tab.label}
          {tab.count != null ? (
            <Text as="span" size={200} className={s.count}>
              {` ${tab.count}`}
            </Text>
          ) : null}
        </Tab>
      ))}
    </TabList>
  );
}

export interface QueueSectionProps {
  title?: string;
  subtitle?: string;
  tabs: QueueTabItem[];
  value: string;
  onChange: (id: string) => void;
  children: ReactNode;
  actions?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

export function QueueSection({
  title,
  subtitle,
  tabs,
  value,
  onChange,
  children,
  actions,
  'aria-label': ariaLabel,
  className,
}: QueueSectionProps) {
  const s = useQueue();
  const tabsControl = (
    <QueueTabs tabs={tabs} value={value} onChange={onChange} aria-label={ariaLabel || title || 'Work queues'} />
  );
  const body = <div className={s.body}>{children}</div>;
  if (!title) {
    return (
      <section className={mergeClasses(s.stack, className)} aria-label={ariaLabel || 'Work queues'}>
        {tabsControl}
        {body}
      </section>
    );
  }
  return (
    <SectionRail title={title} subtitle={subtitle} actions={actions}>
      <div className={mergeClasses(s.stack, className)}>
        {tabsControl}
        {body}
      </div>
    </SectionRail>
  );
}
