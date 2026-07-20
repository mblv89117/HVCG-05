import { makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { ReactNode, CSSProperties } from 'react';
import { elevation, color } from '../tokens';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '18px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: elevation.md,
    transitionProperty: 'box-shadow, transform, border-color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
    minHeight: 0,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: elevation.glow,
  },
  quiet: {
    boxShadow: elevation.sm,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  accent: {
    boxShadow: elevation.glow,
    border: `1px solid rgba(201, 162, 39, 0.45)`,
    backgroundImage: `linear-gradient(135deg, rgba(201, 162, 39, 0.08), transparent 55%)`,
  },
  ai: {
    boxShadow: elevation.ai,
    border: `1px solid rgba(37, 99, 235, 0.28)`,
    backgroundImage: `linear-gradient(135deg, rgba(37, 99, 235, 0.10), transparent 60%)`,
  },
  interactive: {
    cursor: 'pointer',
            ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: elevation.lg,
      border: `1px solid ${color.gold}`,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '4px',
  },
});

export type CardVariant = 'default' | 'glass' | 'quiet' | 'accent' | 'ai';

export interface AtlasCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  variant?: CardVariant;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  'aria-label'?: string;
}

export function AtlasCard({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  variant = 'default',
  interactive,
  className,
  style,
  onClick,
  'aria-label': ariaLabel,
}: AtlasCardProps) {
  const s = useStyles();
  const clickable = Boolean(interactive || onClick);
  return (
    <section
      className={mergeClasses(
        s.root,
        variant === 'glass' && s.glass,
        variant === 'quiet' && s.quiet,
        variant === 'accent' && s.accent,
        variant === 'ai' && s.ai,
        clickable && s.interactive,
        'atlas-fade-in',
        className,
      )}
      style={style}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel || title}
    >
      {(title || headerAction) && (
        <div className={s.header}>
          <div className={s.titleBlock}>
            {title ? (
              <Text weight="semibold" size={400}>
                {title}
              </Text>
            ) : null}
            {subtitle ? <Caption1>{subtitle}</Caption1> : null}
          </div>
          {headerAction}
        </div>
      )}
      <div className={s.body}>{children}</div>
      {footer ? <div className={s.footer}>{footer}</div> : null}
    </section>
  );
}
