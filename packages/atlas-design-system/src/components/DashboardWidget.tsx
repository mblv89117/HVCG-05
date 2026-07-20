import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Caption1,
  Button,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { StatusChip, type StatusTone } from './StatusChip';
import { SourceBadge, type SourceKind } from './StatusChip';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '112px',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  value: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '-0.02em',
    lineHeight: tokens.lineHeightHero800,
    color: tokens.colorNeutralForeground1,
  },
  trendUp: { color: '#1a5c42' },
  trendDown: { color: '#8b2e2e' },
  trendFlat: { color: tokens.colorNeutralForeground2 },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
});

export interface DashboardWidgetProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  tone?: StatusTone;
  source?: SourceKind;
  action?: ReactNode;
  children?: ReactNode;
}

export function DashboardWidget({
  label,
  value,
  unit,
  trend,
  trendLabel,
  tone,
  source,
  action,
  children,
}: DashboardWidgetProps) {
  const s = useStyles();
  return (
    <div className={s.root}>
      <div className={s.top}>
        <Caption1>{label}</Caption1>
        {tone ? <StatusChip label={tone} tone={tone} /> : null}
      </div>
      <div>
        <Text className={s.value}>
          {value}
          {unit ? (
            <Text size={300} weight="regular" style={{ marginLeft: 6 }}>
              {unit}
            </Text>
          ) : null}
        </Text>
      </div>
      <div className={s.meta}>
        {trendLabel ? (
          <Caption1
            className={
              trend === 'up' ? s.trendUp : trend === 'down' ? s.trendDown : s.trendFlat
            }
          >
            {trendLabel}
          </Caption1>
        ) : null}
        {source ? <SourceBadge kind={source} /> : null}
        {action}
      </div>
      {children}
    </div>
  );
}

export interface SparkBarsProps {
  values: number[];
  'aria-label'?: string;
}

const useSpark = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '3px',
    height: '36px',
    marginTop: '4px',
  },
  bar: {
    flex: 1,
    borderRadius: '3px 3px 0 0',
    background: `linear-gradient(180deg, ${tokens.colorBrandBackgroundHover}, ${tokens.colorBrandBackground})`,
    minWidth: '4px',
  },
});

/** Lightweight theme-aware chart primitive (no chart lib dependency). */
export function SparkBars({ values, 'aria-label': ariaLabel = 'Trend chart' }: SparkBarsProps) {
  const s = useSpark();
  const max = Math.max(...values, 1);
  return (
    <div className={s.row} role="img" aria-label={ariaLabel}>
      {values.map((v, i) => (
        <span
          key={i}
          className={s.bar}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function QuickActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button appearance="primary" size="small" onClick={onClick}>
      {children}
    </Button>
  );
}
