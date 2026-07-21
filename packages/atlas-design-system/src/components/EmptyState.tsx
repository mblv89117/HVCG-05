import { Avatar, makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 28px',
    textAlign: 'center',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  icon: {
    fontSize: '32px',
    color: '#2563EB',
  },
  title: {
    margin: 0,
  },
  body: {
    maxWidth: '360px',
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
});

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, actions, className }: EmptyStateProps) {
  const s = useStyles();
  return (
    <div className={mergeClasses(s.root, 'atlas-fade-in', className)} role="status">
      {icon ? <div className={s.icon}>{icon}</div> : null}
      <Text as="h3" size={500} weight="semibold" className={s.title}>{title}</Text>
      {description ? <Caption1 className={s.body}>{description}</Caption1> : null}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  );
}

const useSkel = makeStyles({
  block: {
    display: 'block',
    width: '100%',
    height: '12px',
    borderRadius: '8px',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
});

export interface LoadingStateProps {
  rows?: number;
  className?: string;
  label?: string;
}

export function LoadingState({ rows = 4, className, label = 'Loading' }: LoadingStateProps) {
  const s = useSkel();
  return (
    <div className={mergeClasses(s.stack, className)} role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className={mergeClasses(s.block, 'atlas-skeleton')} style={{ width: `${88 - i * 8}%` }} />
      ))}
    </div>
  );
}

export interface PersonAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 20 | 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 96 | 120 | 128;
}

export function PersonAvatar({ name, imageUrl, size = 32 }: PersonAvatarProps) {
  return <Avatar name={name} image={imageUrl ? { src: imageUrl } : undefined} size={size} color="colorful" />;
}
