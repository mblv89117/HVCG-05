import { makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { ReactNode, CSSProperties } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: '0 4px 14px rgba(11, 31, 51, 0.06)',
    transitionProperty: 'box-shadow, transform, border-color, background-color',
    transitionDuration: '200ms',
    transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: '0 0 0 1px rgba(201, 162, 39, 0.12), 0 8px 28px rgba(11, 31, 51, 0.08)',
  },
  quiet: {
    boxShadow: 'none',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '16px',
  },
  accent: {
    borderTop: '3px solid #C9A227',
  },
  ai: {
    border: '1px solid rgba(37, 99, 235, 0.28)',
    boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.10), 0 8px 24px rgba(37, 99, 235, 0.08)',
  },
  interactive: {
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 12px 36px rgba(11, 31, 51, 0.10)',
      border: '1px solid rgba(201, 162, 39, 0.40)',
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
