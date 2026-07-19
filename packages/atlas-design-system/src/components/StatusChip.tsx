import { makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { CSSProperties, ReactNode } from 'react';

const toneStyles: Record<string, CSSProperties> = {
  success: {
    backgroundColor: 'rgba(26, 92, 66, 0.12)',
    color: '#1a5c42',
    border: '1px solid rgba(26, 92, 66, 0.28)',
  },
  warning: {
    backgroundColor: 'rgba(176, 138, 60, 0.16)',
    color: '#8a6a2c',
    border: '1px solid rgba(176, 138, 60, 0.35)',
  },
  danger: {
    backgroundColor: 'rgba(139, 46, 46, 0.12)',
    color: '#8b2e2e',
    border: '1px solid rgba(139, 46, 46, 0.28)',
  },
  info: {
    backgroundColor: 'rgba(42, 90, 122, 0.12)',
    color: '#2a5a7a',
    border: '1px solid rgba(42, 90, 122, 0.28)',
  },
  neutral: {
    backgroundColor: 'rgba(228, 235, 230, 0.8)',
    color: '#5a675f',
    border: '1px solid rgba(207, 200, 186, 0.9)',
  },
  gold: {
    backgroundColor: 'rgba(176, 138, 60, 0.2)',
    color: '#6b5224',
    border: '1px solid rgba(176, 138, 60, 0.45)',
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
      <Text size={200} weight="semibold">{label}</Text>
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
    kind === 'Live' ? 'success' : kind === 'Unavailable' ? 'danger' : kind === 'Development sample' ? 'warning' : 'info';
  return (
    <span className={s.root} title={detail || kind}>
      <StatusChip label={kind} tone={tone} />
      {detail ? <Caption1>{detail}</Caption1> : null}
    </span>
  );
}
