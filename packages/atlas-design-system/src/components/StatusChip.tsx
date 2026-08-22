import { makeStyles, mergeClasses, tokens, Caption1 } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import type { AtlasStatusTone } from '../status/statusLanguage';
import { atlasStatusDisplay } from '../status/statusLanguage';
import { brandStyles } from '../styles/brandStyles';

export type StatusTone = AtlasStatusTone;
export type StatusChipSize = 'sm' | 'md';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '1px 8px',
    borderRadius: '999px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase200,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sm: {
    gap: '4px',
    padding: '0 6px',
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
  },
  ...brandStyles({
    success: {
      backgroundColor: 'rgba(5, 150, 105, 0.10)',
      color: '#047857',
      border: '1px solid rgba(5, 150, 105, 0.22)',
    },
    warning: {
      backgroundColor: 'rgba(217, 119, 6, 0.10)',
      color: '#B45309',
      border: '1px solid rgba(217, 119, 6, 0.22)',
    },
    danger: {
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      color: '#B91C1C',
      border: '1px solid rgba(220, 38, 38, 0.22)',
    },
    info: {
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
      color: '#1D4ED8',
      border: '1px solid rgba(37, 99, 235, 0.22)',
    },
    neutral: {
      backgroundColor: tokens.colorNeutralBackground3,
      color: tokens.colorNeutralForeground2,
      border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    gold: {
      backgroundColor: 'rgba(201, 162, 39, 0.12)',
      color: '#8A6A1C',
      border: '1px solid rgba(201, 162, 39, 0.32)',
    },
  }),
});

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
  /** Compact chip for tables and dense toolbars. */
  size?: StatusChipSize;
}

export function StatusChip({ label, tone = 'neutral', icon, className, size = 'md' }: StatusChipProps) {
  const s = useStyles();
  return (
    <span
      className={mergeClasses(s.root, s[tone], size === 'sm' && s.sm, className)}
    >
      {icon}
      {label}
    </span>
  );
}

const useSource = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
});

export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live';

export interface SourceBadgeProps {
  kind?: SourceKind;
  /** Display status independent of origin. When set, drives tone and default label. */
  status?: 'Live' | 'Not live' | 'Sample data' | 'Unavailable';
  /** Concise executive label. Defaults to `status` or `kind`. */
  label?: string;
  detail?: string;
}

export function SourceBadge({ kind, status, label, detail }: SourceBadgeProps) {
  const s = useSource();
  const tone: StatusTone = status
    ? status === 'Live'
      ? 'success'
      : status === 'Unavailable'
        ? 'danger'
        : status === 'Sample data'
          ? 'warning'
          : 'info'
    : kind === 'Live'
      ? 'success'
      : kind === 'Unavailable'
        ? 'danger'
        : kind === 'Development sample'
          ? 'warning'
          : 'info';
  const display = label || status || kind || 'Unavailable';
  return (
    <span className={s.root} title={detail || display} aria-label={detail ? `${display}. ${detail}` : display}>
      <StatusChip label={display} tone={tone} size="sm" />
      {detail ? <Caption1>{detail}</Caption1> : null}
    </span>
  );
}

/** Convenience chip from a Hub/Atlas status token. Unknown tokens render unchanged as neutral. */
export function AtlasStatusChip({
  status,
  size = 'md',
  className,
}: {
  status: string;
  size?: StatusChipSize;
  className?: string;
}) {
  const mapped = atlasStatusDisplay(status);
  return (
    <StatusChip
      label={mapped?.label || status}
      tone={mapped?.tone || 'neutral'}
      size={size}
      className={className}
    />
  );
}
