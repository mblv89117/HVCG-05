import {
  makeStyles,
  mergeClasses,
  tokens,
  Button,
  Input,
  Tooltip,
  Text,
} from '@fluentui/react-components';
import {
  SearchRegular,
  AlertRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  NavigationRegular,
  SparkleRegular,
  MicRegular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { PersonAvatar } from './EmptyState';
import { elevation, color } from '../tokens';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: elevation.md,
    minHeight: '56px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flexShrink: 0,
  },
  logo: {
    height: '34px',
    width: 'auto',
    display: 'block',
  },
  brandText: {
    display: 'none',
    flexDirection: 'column',
    lineHeight: 1.1,
    '@media (min-width: 960px)': {
      display: 'flex',
    },
  },
  search: {
    flex: 1,
    maxWidth: '460px',
    minWidth: '120px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
  },
  kbd: {
    fontSize: '11px',
    opacity: 0.65,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '6px',
    padding: '1px 6px',
    marginLeft: '8px',
  },
});

export interface CommandBarProps {
  logoSrc?: string;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchFocus?: () => void;
  onToggleNav?: () => void;
  onToggleTheme?: () => void;
  onOpenAI?: () => void;
  scheme?: 'light' | 'dark';
  notificationCount?: number;
  onNotifications?: () => void;
  userName?: string;
  trailing?: ReactNode;
  className?: string;
}

export function CommandBar({
  logoSrc = '/brand/hvcg-logo.png',
  title = 'ATLAS',
  subtitle = 'HIGH VALUE CAPITAL GROUP',
  searchPlaceholder = 'Search Atlas…',
  searchValue,
  onSearchChange,
  onSearchFocus,
  onToggleNav,
  onToggleTheme,
  onOpenAI,
  scheme = 'light',
  notificationCount = 0,
  onNotifications,
  userName = 'Manny',
  trailing,
  className,
}: CommandBarProps) {
  const s = useStyles();
  return (
    <header className={mergeClasses(s.root, className)} role="banner">
      {onToggleNav ? (
        <Tooltip content="Toggle navigation" relationship="label">
          <Button
            appearance="subtle"
            icon={<NavigationRegular />}
            aria-label="Toggle navigation"
            onClick={onToggleNav}
          />
        </Tooltip>
      ) : null}
      <div className={s.brand}>
        <img src={logoSrc} alt="High Value Capital Group" className={s.logo} />
        <div className={s.brandText}>
          <Text weight="bold" size={300} style={{ letterSpacing: '0.04em', color: color.navy }}>
            {title}
          </Text>
          <Text size={100} style={{ letterSpacing: '0.06em', opacity: 0.75 }}>
            {subtitle}
          </Text>
        </div>
      </div>
      <div className={s.search}>
        <Input
          appearance="outline"
          contentBefore={<SearchRegular />}
          contentAfter={<span className={s.kbd}>⌘K</span>}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(_, d) => onSearchChange?.(d.value)}
          onFocus={onSearchFocus}
          aria-label="Global search"
        />
      </div>
      <div className={s.actions}>
        {trailing}
        {onOpenAI ? (
          <Tooltip content="Executive Copilot (⌘J)" relationship="label">
            <Button
              appearance="subtle"
              icon={<SparkleRegular />}
              aria-label="Open Executive Copilot"
              onClick={onOpenAI}
            />
          </Tooltip>
        ) : null}
        {onToggleTheme ? (
          <Tooltip content={scheme === 'dark' ? 'Light mode' : 'Dark mode'} relationship="label">
            <Button
              appearance="subtle"
              icon={scheme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              aria-label="Toggle color scheme"
              onClick={onToggleTheme}
            />
          </Tooltip>
        ) : null}
        {onNotifications ? (
          <Tooltip content="Notifications" relationship="label">
            <Button
              appearance="subtle"
              icon={<AlertRegular />}
              aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ''}`}
              onClick={onNotifications}
              style={{ position: 'relative' }}
            >
              {notificationCount > 0 ? (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: color.azure,
                  }}
                />
              ) : null}
            </Button>
          </Tooltip>
        ) : null}
        <Tooltip content="Voice-ready (coming soon)" relationship="label">
          <Button appearance="subtle" icon={<MicRegular />} aria-label="Voice input ready" disabled />
        </Tooltip>
        <PersonAvatar name={userName} size={32} />
      </div>
    </header>
  );
}
