import { makeStyles, tokens, Text, Caption1, Button } from '@fluentui/react-components';
import { PinRegular, PinFilled } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AtlasCard } from './AtlasCard';
import { StatusChip, SourceBadge, type SourceKind, type StatusTone } from './StatusChip';
import { SparkBars } from './DashboardWidget';
import { color, elevation } from '../tokens';

// Fluent `tokens` used for layout colors; HVCG `color`/`elevation` for brand accents.

const useKpi = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '148px',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '11px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  value: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '-0.03em',
    lineHeight: tokens.lineHeightHero800,
    color: tokens.colorNeutralForeground1,
    fontVariantNumeric: 'tabular-nums',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
  trendUp: { color: color.emerald },
  trendDown: { color: color.danger },
  trendFlat: { color: tokens.colorNeutralForeground2 },
  sparkWrap: {
    marginTop: 'auto',
  },
});

export interface KpiTileProps {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  tone?: StatusTone;
  source?: SourceKind;
  spark?: number[];
  icon?: ReactNode;
  animateValue?: boolean;
  children?: ReactNode;
}

function useAnimatedDisplay(value: string, enabled: boolean) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (!enabled) {
      setDisplay(value);
      return;
    }
    const numeric = value.replace(/[^0-9.-]/g, '');
    const target = Number(numeric);
    if (!Number.isFinite(target) || numeric === '' || /[a-zA-Z%]/.test(value.replace(/[$,.\s]/g, ''))) {
      setDisplay(value);
      return;
    }
    const prefix = value.startsWith('$') ? '$' : '';
    const suffix = value.includes('%') ? '%' : '';
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const frames = 18;
    const id = window.setInterval(() => {
      frame += 1;
      const t = frame / frames;
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(target * eased);
      setDisplay(`${prefix}${current.toLocaleString()}${suffix}`);
      if (frame >= frames) {
        window.clearInterval(id);
        setDisplay(value);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [value, enabled]);
  return display;
}

export function KpiTile({
  label,
  value,
  unit,
  trend,
  trendLabel,
  tone,
  source,
  spark,
  icon,
  animateValue = true,
  children,
}: KpiTileProps) {
  const s = useKpi();
  const display = useAnimatedDisplay(value, animateValue);
  return (
    <AtlasCard variant="glass" className="atlas-hover-lift">
      <div className={s.root}>
        <div className={s.top}>
          <span className={s.label}>{label}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {icon}
            {tone ? <StatusChip label={tone} tone={tone} /> : null}
          </div>
        </div>
        <div>
          <Text className={`${s.value} atlas-kpi-value`}>
            {display}
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
              {trend === 'up' ? '▲ ' : trend === 'down' ? '▼ ' : '● '}
              {trendLabel}
            </Caption1>
          ) : null}
          {source ? <SourceBadge kind={source} /> : null}
        </div>
        {spark?.length ? (
          <div className={s.sparkWrap}>
            <SparkBars values={spark} aria-label={`${label} trend`} />
          </div>
        ) : null}
        {children}
      </div>
    </AtlasCard>
  );
}

const useInsight = makeStyles({
  list: {
    margin: 0,
    paddingLeft: '18px',
    display: 'grid',
    gap: '6px',
  },
  block: {
    display: 'grid',
    gap: '6px',
    marginTop: '8px',
  },
});

export interface InsightCardProps {
  title?: string;
  subtitle?: string;
  timestampLabel?: string;
  whatChanged?: string;
  attention?: string;
  recommendations?: string[];
  risks?: string[];
  opportunities?: string[];
  decisionsAwaiting?: string[];
  children?: ReactNode;
}

export function InsightCard({
  title = 'AI Executive Brief',
  subtitle = 'Generated insights — not verified ledger data',
  timestampLabel,
  whatChanged,
  attention,
  recommendations = [],
  risks = [],
  opportunities = [],
  decisionsAwaiting = [],
  children,
}: InsightCardProps) {
  const s = useInsight();
  return (
    <AtlasCard variant="ai" title={title} subtitle={subtitle}>
      {timestampLabel ? <Caption1>{timestampLabel}</Caption1> : null}
      <div className={s.block}>
        {whatChanged ? (
          <>
            <Text weight="semibold">What changed</Text>
            <Text size={300}>{whatChanged}</Text>
          </>
        ) : null}
        {attention ? (
          <>
            <Text weight="semibold">Requires attention</Text>
            <Text size={300}>{attention}</Text>
          </>
        ) : null}
        {recommendations.length ? (
          <>
            <Text weight="semibold">Recommended actions</Text>
            <ul className={s.list}>
              {recommendations.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {risks.length ? (
          <>
            <Text weight="semibold">Material risks</Text>
            <ul className={s.list}>
              {risks.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {opportunities.length ? (
          <>
            <Text weight="semibold">Top opportunities</Text>
            <ul className={s.list}>
              {opportunities.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {decisionsAwaiting.length ? (
          <>
            <Text weight="semibold">Decisions awaiting Owner</Text>
            <ul className={s.list}>
              {decisionsAwaiting.map((r) => (
                <li key={r}>
                  <Text size={300}>{r}</Text>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {children}
      </div>
    </AtlasCard>
  );
}

export function SectionRail({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text weight="semibold" size={500}>
          {title}
        </Text>
        {action}
      </div>
      {children}
    </div>
  );
}

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  to?: string;
}

export function RecentList({
  items,
  onSelect,
}: {
  items: RecentItem[];
  onSelect?: (item: RecentItem) => void;
}) {
  if (!items.length) {
    return <Caption1>No recent items</Caption1>;
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="atlas-focus-ring"
          onClick={() => onSelect?.(item)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            padding: '8px 10px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'inherit',
          }}
        >
          <Text size={300} weight="semibold">
            {item.title}
          </Text>
          {item.subtitle ? <Caption1>{item.subtitle}</Caption1> : null}
        </button>
      ))}
    </div>
  );
}

export function FavoritePin({
  active,
  onToggle,
  label = 'Pin',
}: {
  active: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <Button
      appearance="subtle"
      size="small"
      icon={active ? <PinFilled /> : <PinRegular />}
      aria-pressed={active}
      aria-label={label}
      onClick={onToggle}
    />
  );
}

export function HeroGreeting({
  greeting,
  name,
  subtitle,
  actions,
}: {
  greeting: string;
  name: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="atlas-fade-in"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
        padding: '8px 2px 4px',
      }}
    >
      <div>
        <Caption1 style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Atlas · High Value Capital Group
        </Caption1>
        <Text
          as="h1"
          weight="semibold"
          style={{
            display: 'block',
            fontSize: 'clamp(1.75rem, 2.4vw, 2.35rem)',
            letterSpacing: '-0.03em',
            marginTop: 6,
            lineHeight: 1.15,
          }}
        >
          {greeting}, {name}
        </Text>
        {subtitle ? (
          <Text size={400} style={{ display: 'block', marginTop: 8, maxWidth: 560, opacity: 0.85 }}>
            {subtitle}
          </Text>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function PriorityList({
  items,
}: {
  items: Array<{ id: string; title: string; meta?: string; tone?: StatusTone }>;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            padding: '10px 12px',
            borderRadius: 12,
            border: `1px solid ${tokens.colorNeutralStroke2}`,
            background: tokens.colorNeutralBackground1,
            boxShadow: elevation.sm,
          }}
        >
          <div>
            <Text weight="semibold">{item.title}</Text>
            {item.meta ? <Caption1 style={{ display: 'block', marginTop: 2 }}>{item.meta}</Caption1> : null}
          </div>
          {item.tone ? <StatusChip label={item.tone} tone={item.tone} /> : null}
        </div>
      ))}
    </div>
  );
}
