import { Avatar, makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { brandStyles } from '../styles/brandStyles';
import { color } from '../tokens';
import type { AtlasDensity } from './AtlasCard';

export type EmptyStateTone = 'neutral' | 'danger' | 'warning';
export type EmptyStateAlign = 'center' | 'start';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px 16px',
    textAlign: 'center',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  start: {
    alignItems: 'flex-start',
    textAlign: 'left',
    padding: '12px 0',
    border: 'none',
    backgroundColor: 'transparent',
  },
  compact: {
    gap: '6px',
    padding: '12px',
  },
  ...brandStyles({
    danger: {
      borderLeft: `2px solid ${color.danger}`,
    },
    warning: {
      borderLeft: `2px solid ${color.warning}`,
    },
  }),
  icon: {
    fontSize: '20px',
    color: tokens.colorNeutralForeground2,
    display: 'flex',
    lineHeight: 0,
  },
  title: {
    margin: 0,
  },
  body: {
    maxWidth: '420px',
    color: tokens.colorNeutralForeground2,
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '4px',
  },
  actionsStart: {
    justifyContent: 'flex-start',
  },
});

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  role?: 'status' | 'alert' | 'region';
  tone?: EmptyStateTone;
  density?: AtlasDensity;
  align?: EmptyStateAlign;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
  role = 'status',
  tone = 'neutral',
  density = 'default',
  align = 'center',
}: EmptyStateProps) {
  const s = useStyles();
  return (
    <div
      className={mergeClasses(
        s.root,
        align === 'start' && s.start,
        density === 'compact' && s.compact,
        tone === 'danger' && s.danger,
        tone === 'warning' && s.warning,
        'atlas-fade-in',
        className,
      )}
      role={role}
    >
      {icon ? (
        <div className={s.icon} aria-hidden>
          {icon}
        </div>
      ) : null}
      <Text as="h3" block size={400} weight="semibold" className={s.title}>
        {title}
      </Text>
      {description ? (
        <Caption1 as="p" block className={s.body}>
          {description}
        </Caption1>
      ) : null}
      {actions ? (
        <div className={mergeClasses(s.actions, align === 'start' && s.actionsStart)}>{actions}</div>
      ) : null}
    </div>
  );
}

const useSkel = makeStyles({
  bone: {
    display: 'block',
    backgroundColor: tokens.colorNeutralBackground3,
    animationName: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.4 },
    },
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    '@media (prefers-reduced-motion: reduce)': {
      animationName: 'none',
      opacity: 0.55,
    },
  },
  block: {
    width: '100%',
    height: '10px',
    borderRadius: '4px',
  },
  compactBlock: {
    height: '8px',
  },
  value: {
    width: '42%',
    height: '22px',
    borderRadius: '4px',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  compactStack: {
    gap: '6px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  row: {
    display: 'grid',
    gap: '8px',
    width: '100%',
  },
});

export type SkeletonVariant = 'lines' | 'card' | 'kpi' | 'table';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
  columns?: number;
  className?: string;
  label?: string;
  density?: AtlasDensity;
}

export function LoadingSkeleton({
  variant = 'lines',
  rows = 4,
  columns = 4,
  className,
  label = 'Loading',
  density = 'default',
}: LoadingSkeletonProps) {
  const s = useSkel();
  const bone = mergeClasses(s.bone, s.block, density === 'compact' && s.compactBlock);
  const bars = Array.from({ length: rows }).map((_, i) => (
    <span key={i} className={bone} style={{ width: `${88 - (i % 4) * 8}%` }} aria-hidden />
  ));

  if (variant === 'kpi') {
    return (
      <div className={mergeClasses(s.card, className)} role="status" aria-busy="true" aria-label={label}>
        <span className={bone} style={{ width: '38%' }} aria-hidden />
        <span className={mergeClasses(s.bone, s.value)} aria-hidden />
        <span className={bone} style={{ width: '24%' }} aria-hidden />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={mergeClasses(s.card, className)} role="status" aria-busy="true" aria-label={label}>
        <span className={bone} style={{ width: '32%' }} aria-hidden />
        {bars}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={mergeClasses(s.table, className)} role="status" aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className={s.row}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <span key={c} className={bone} aria-hidden />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={mergeClasses(s.stack, density === 'compact' && s.compactStack, className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {bars}
    </div>
  );
}

export interface LoadingStateProps {
  rows?: number;
  className?: string;
  label?: string;
  density?: AtlasDensity;
}

export function LoadingState({ rows = 4, className, label = 'Loading', density = 'default' }: LoadingStateProps) {
  return <LoadingSkeleton variant="lines" rows={rows} className={className} label={label} density={density} />;
}

export interface PersonAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 20 | 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 96 | 120 | 128;
}

export function PersonAvatar({ name, imageUrl, size = 32 }: PersonAvatarProps) {
  return <Avatar name={name} image={imageUrl ? { src: imageUrl } : undefined} size={size} color="colorful" />;
}
