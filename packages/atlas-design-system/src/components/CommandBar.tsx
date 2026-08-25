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
} from '@fluentui/react-icons';
import type { KeyboardEvent, ReactNode } from 'react';
import { PersonAvatar } from './EmptyState';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: '8px 12px',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: '0',
    zIndex: 20,
    minHeight: '56px',
    maxWidth: '100%',
    '@media (max-width: 639px)': {
      gap: '6px',
      padding: '8px 10px',
    },
  },
  iconBtn: {
    minWidth: '44px',
    minHeight: '44px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flexShrink: 0,
    '@media (max-width: 639px)': {
      display: 'none',
    },
  },
  logo: {
    height: '36px',
    width: 'auto',
    display: 'block',
  },
  brandFallback: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0B1F33, #2563EB)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#E0B93A',
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.04em',
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
    flex: '1 1 auto',
    maxWidth: '420px',
    minWidth: 0,
    borderRadius: tokens.borderRadiusMedium,
    '@media (max-width: 639px)': {
      display: 'none',
    },
    ':focus-within': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },
  searchField: {
    width: '100%',
    minHeight: '44px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  desktopOnly: {
    '@media (max-width: 639px)': {
      display: 'none',
    },
  },
  searchIcon: {
    display: 'none',
    '@media (max-width: 639px)': {
      display: 'inline-flex',
    },
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
  /** When the command palette dialog is open (AppShell already owns ⌘K). */
  searchExpanded?: boolean;
  /** id of the command-palette surface; omit when the palette is not in the tree. */
  searchPopupId?: string;
  onToggleNav?: () => void;
  navExpanded?: boolean;
  onToggleTheme?: () => void;
  scheme?: 'light' | 'dark';
  notificationCount?: number;
  onNotifications?: () => void;
  onOpenAI?: () => void;
  userName?: string;
  trailing?: ReactNode;
  className?: string;
}

export function CommandBar({
  logoSrc = '/brand/hvcg-logo.png',
  title = 'HIGH VALUE',
  subtitle = 'CAPITAL GROUP',
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  onSearchFocus,
  searchExpanded,
  searchPopupId,
  onToggleNav,
  navExpanded,
  onToggleTheme,
  scheme = 'light',
  notificationCount = 0,
  onNotifications,
  onOpenAI,
  userName,
  trailing,
  className,
}: CommandBarProps) {
  const s = useStyles();
  return (
    <header className={mergeClasses(s.root, className)}>
      {onToggleNav ? (
        <Tooltip content="Toggle navigation" relationship="label">
          <Button
            appearance="subtle"
            className={s.iconBtn}
            icon={<NavigationRegular />}
            aria-label="Toggle navigation"
            aria-controls="atlas-primary-nav"
            aria-expanded={navExpanded}
            onClick={onToggleNav}
          />
        </Tooltip>
      ) : null}
      <div className={s.brand}>
        <img
          src={logoSrc}
          alt="High Value Capital Group"
          className={s.logo}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className={s.brandFallback} style={{ display: 'none' }} role="img" aria-label="High Value Capital Group">
          HV
        </div>
        <div className={s.brandText}>
          <Text weight="bold" size={300}>
            {title}
          </Text>
          <Text size={200}>{subtitle}</Text>
        </div>
      </div>
      {onSearchFocus ? (
        <Tooltip content="Search Atlas" relationship="label">
          <Button
            appearance="subtle"
            className={mergeClasses(s.iconBtn, s.searchIcon)}
            icon={<SearchRegular />}
            aria-label="Global search"
            aria-haspopup="dialog"
            aria-expanded={searchExpanded}
            aria-controls={searchPopupId}
            aria-keyshortcuts="Meta+K Control+K"
            onClick={onSearchFocus}
          />
        </Tooltip>
      ) : null}
      <div className={s.search} role="search" aria-label="Atlas">
        <Input
          className={s.searchField}
          type="search"
          appearance="outline"
          contentBefore={<SearchRegular aria-hidden />}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(_, d) => onSearchChange?.(d.value)}
          onFocus={onSearchFocus}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' || event.key === 'ArrowDown') {
              event.preventDefault();
              onSearchFocus?.();
            }
          }}
          aria-label="Global search"
          aria-haspopup={onSearchFocus ? 'dialog' : undefined}
          aria-expanded={searchExpanded}
          aria-controls={searchPopupId}
          aria-keyshortcuts="Meta+K Control+K"
          autoComplete="off"
        />
      </div>
      <div className={s.actions}>
        {trailing}
        {onOpenAI ? (
          <Tooltip content="AI Command Center" relationship="label">
            <Button
              appearance="subtle"
              className={mergeClasses(s.iconBtn, s.desktopOnly)}
              icon={<SparkleRegular />}
              aria-label="Open AI Command Center"
              aria-haspopup="dialog"
              onClick={onOpenAI}
            />
          </Tooltip>
        ) : null}
        {onToggleTheme ? (
          <Tooltip content={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} relationship="label">
            <Button
              appearance="subtle"
              className={mergeClasses(s.iconBtn, s.desktopOnly)}
              icon={scheme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              aria-label={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={scheme === 'dark'}
              onClick={onToggleTheme}
            />
          </Tooltip>
        ) : null}
        {onNotifications ? (
          <Tooltip content="Notifications" relationship="label">
            <Button
              appearance="subtle"
              className={mergeClasses(s.iconBtn, s.desktopOnly)}
              icon={<AlertRegular />}
              aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ''}`}
              onClick={onNotifications}
            />
          </Tooltip>
        ) : null}
        {userName ? (
          <span className={s.desktopOnly}>
            <PersonAvatar name={userName} size={32} />
          </span>
        ) : null}
      </div>
    </header>
  );
}
