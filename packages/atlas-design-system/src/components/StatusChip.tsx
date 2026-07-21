import { makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { CSSProperties, ReactNode } from 'react';

const toneStyles: Record<string, CSSProperties> = {
  success: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    color: '#047857',
    border: '1px solid rgba(5, 150, 105, 0.28)',
  },
  warning: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    color: '#B45309',
    border: '1px solid rgba(217, 119, 6, 0.28)',
  },
  danger: {
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
    color: '#B91C1C',
    border: '1px solid rgba(220, 38, 38, 0.28)',
  },
  info: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    color: '#1D4ED8',
    border: '1px solid rgba(37, 99, 235, 0.28)',
  },
  neutral: {
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    color: '#475569',
    border: '1px solid rgba(203, 213, 225, 0.95)',
  },
  gold: {
    backgroundColor: 'rgba(201, 162, 39, 0.16)',
    color: '#8A6A1C',
    border: '1px solid rgba(201, 162, 39, 0.40)',
  },
};

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase200,
    whiteSpace: 'nowrap',
  },
});

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}

export function StatusChip({ label, tone = 'neutral', icon, className }: StatusChipProps) {
  const s = useStyles();
  return (
    <span className={mergeClasses(s.root, className)} style={toneStyles[tone]} role="status">
      {icon}
      <Text size={200} weight="semibold">
        {label}
      </Text>
    </span>
  );
}

const useSource = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 8px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
});

export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live';

export interface SourceBadgeProps {
  kind: SourceKind;
  detail?: string;
}

export function SourceBadge({ kind, detail }: SourceBadgeProps) {
  const s = useSource();
  const tone: StatusTone =
    kind === 'Live'
      ? 'success'
      : kind === 'Unavailable'
        ? 'danger'
        : kind === 'Development sample'
          ? 'warning'
          : 'info';
  return (
    <span className={s.root} title={detail || kind}>
      <StatusChip label={kind} tone={tone} />
      {detail ? <Caption1>{detail}</Caption1> : null}
    </span>
  );
}
