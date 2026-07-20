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
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { PersonAvatar } from './EmptyState';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'sticky',
    top: '0',
    zIndex: 20,
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
    height: '36px',
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
    maxWidth: '420px',
    minWidth: '120px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
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
  scheme?: 'light' | 'dark';
  notificationCount?: number;
  onNotifications?: () => void;
  userName?: string;
  trailing?: ReactNode;
  className?: string;
}

export function CommandBar({
  logoSrc = '/brand/hvcg-logo.png',
  title = 'HIGH VALUE',
  subtitle = 'CAPITAL GROUP',
  searchPlaceholder = 'Search Atlas…',
  searchValue,
  onSearchChange,
  onSearchFocus,
  onToggleNav,
  onToggleTheme,
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
          <Text weight="bold" size={300}>{title}</Text>
          <Text size={200}>{subtitle}</Text>
        </div>
      </div>
      <div className={s.search}>
        <Input
          appearance="outline"
          contentBefore={<SearchRegular />}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(_, d) => onSearchChange?.(d.value)}
          onFocus={onSearchFocus}
          aria-label="Global search"
        />
      </div>
      <div className={s.actions}>
        {trailing}
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
            />
          </Tooltip>
        ) : null}
        <PersonAvatar name={userName} size={32} />
      </div>
    </header>
  );
}
