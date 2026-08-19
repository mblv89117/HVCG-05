import { makeStyles, mergeClasses, tokens, Text, Caption1 } from '@fluentui/react-components';
import type { ReactNode, CSSProperties } from 'react';
import { brandStyles } from '../styles/brandStyles';
import { color } from '../tokens';

export type AtlasDensity = 'default' | 'compact';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: 'none',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '160ms',
    transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
  },
  compact: {
    gap: '6px',
    padding: '10px 12px',
  },
  ...brandStyles({
    glass: {
      backgroundColor: 'rgba(248, 250, 252, 0.88)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      border: `1px solid ${color.line}`,
      boxShadow: 'none',
    },
    ai: {
      borderLeft: `2px solid ${color.azure}`,
      boxShadow: 'none',
    },
    quiet: {
      boxShadow: 'none',
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      backgroundColor: tokens.colorNeutralBackground1,
      padding: '12px',
    },
    accent: {
      borderLeftWidth: '2px',
      borderLeftStyle: 'solid',
      borderLeftColor: color.gold,
    },
    interactive: {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: tokens.colorNeutralBackground2,
      },
      ':focus-visible': {
        outline: `2px solid ${tokens.colorStrokeFocus2}`,
        outlineOffset: '2px',
      },
    },
  }),
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    '& .fui-Text': {
      display: 'block',
      width: '100%',
    },
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '2px',
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
  /** Tighter padding and gaps. Default preserves current Elite card rhythm. */
  density?: AtlasDensity;
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
  density = 'default',
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
        density === 'compact' && s.compact,
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
              <Text block weight="semibold" size={density === 'compact' ? 300 : 400}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Caption1 as="p" block>
                {subtitle}
              </Caption1>
            ) : null}
          </div>
          {headerAction}
        </div>
      )}
      <div className={s.body}>{children}</div>
      {footer ? <div className={s.footer}>{footer}</div> : null}
    </section>
  );
}
