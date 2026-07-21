import { makeStyles, mergeClasses, tokens, Text, Caption1, Button } from '@fluentui/react-components';
import { StarRegular, StarFilled, SparkleRegular, ChevronRightRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { AtlasCard } from './AtlasCard';
import { StatusChip, type StatusTone } from './StatusChip';
import { SparkBars } from './DashboardWidget';

const useKpi = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '120px',
  },
  label: {
    color: tokens.colorNeutralForeground2,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
  },
  value: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '-0.03em',
    lineHeight: tokens.lineHeightHero800,
    color: tokens.colorNeutralForeground1,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
  up: { color: '#059669' },
  down: { color: '#DC2626' },
  flat: { color: tokens.colorNeutralForeground2 },
});

export interface KpiTileProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  tone?: StatusTone;
  sparkValues?: number[];
  footer?: ReactNode;
  onClick?: () => void;
}

export function KpiTile({
  label,
  value,
  unit,
  trend,
  trendLabel,
  tone,
  sparkValues,
  footer,
  onClick,
}: KpiTileProps) {
  const s = useKpi();
  return (
    <AtlasCard variant="glass" interactive={Boolean(onClick)} onClick={onClick} aria-label={label}>
      <div className={s.root}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Caption1 className={s.label}>{label}</Caption1>
          {tone ? <StatusChip label={tone} tone={tone} /> : null}
        </div>
        <Text className={s.value}>
          {value}
          {unit ? (
            <Text size={300} weight="regular" style={{ marginLeft: 6 }}>
              {unit}
            </Text>
          ) : null}
        </Text>
        <div className={s.meta}>
          {trendLabel ? (
            <Caption1 className={trend === 'up' ? s.up : trend === 'down' ? s.down : s.flat}>
              {trendLabel}
            </Caption1>
          ) : null}
        </div>
        {sparkValues?.length ? <SparkBars values={sparkValues} aria-label={`${label} trend`} /> : null}
        {footer}
      </div>
    </AtlasCard>
  );
}

const useInsight = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    color: '#2563EB',
    display: 'flex',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
});

export interface InsightCardProps {
  title: string;
  body: string;
  actions?: ReactNode;
  className?: string;
}

export function InsightCard({ title, body, actions, className }: InsightCardProps) {
  const s = useInsight();
  return (
    <AtlasCard variant="ai" className={className} title={undefined}>
      <div className={s.root}>
        <div className={s.head}>
          <span className={s.icon} aria-hidden>
            <SparkleRegular fontSize={18} />
          </span>
          <Text weight="semibold" size={400}>
            {title}
          </Text>
        </div>
        <Caption1>{body}</Caption1>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
    </AtlasCard>
  );
}

const useRail = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
});

export function SectionRail({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const s = useRail();
  return (
    <section className={mergeClasses(s.root, 'atlas-fade-in')} aria-label={title}>
      <div className={s.head}>
        <div>
          <Text as="h2" size={500} weight="semibold">
            {title}
          </Text>
          {subtitle ? <Caption1>{subtitle}</Caption1> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export interface RecentItem {
  id: string;
  label: string;
  subtitle?: string;
  to?: string;
}

const useList = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    color: tokens.colorNeutralForeground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '1px',
    },
  },
  text: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  empty: {
    padding: '8px 10px',
    color: tokens.colorNeutralForeground2,
  },
});

export function RecentList({
  items,
  onSelect,
  emptyLabel = 'No recent items',
}: {
  items: RecentItem[];
  onSelect?: (item: RecentItem) => void;
  emptyLabel?: string;
}) {
  const s = useList();
  if (!items.length) {
    return (
      <Caption1 className={s.empty} role="status">
        {emptyLabel}
      </Caption1>
    );
  }
  return (
    <ul className={s.list}>
      {items.map((item) => (
        <li key={item.id}>
          <button type="button" className={s.item} onClick={() => onSelect?.(item)}>
            <div className={s.text}>
              <Text size={300} weight="semibold">
                {item.label}
              </Text>
              {item.subtitle ? <Caption1>{item.subtitle}</Caption1> : null}
            </div>
            <ChevronRightRegular fontSize={14} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FavoritePin({
  active,
  onToggle,
  label = 'Favorite',
}: {
  active: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <Button
      appearance="subtle"
      size="small"
      icon={active ? <StarFilled /> : <StarRegular />}
      aria-label={label}
      aria-pressed={active}
      onClick={onToggle}
      style={active ? { color: '#C9A227' } : undefined}
    />
  );
}
