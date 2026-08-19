import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Caption1,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RecentList, type RecentItem } from './ExecutivePrimitives';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: ReactNode;
  badge?: string | number;
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
}

const useStyles = makeStyles({
  skipLink: {
    position: 'fixed',
    left: '12px',
    top: '8px',
    zIndex: 100,
    padding: '8px 14px',
    minHeight: '44px',
    minWidth: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    border: `2px solid ${tokens.colorStrokeFocus2}`,
    borderRadius: tokens.borderRadiusMedium,
    textDecoration: 'none',
    fontWeight: tokens.fontWeightSemibold,
    transform: 'translateY(-250%)',
    ':focus': {
      transform: 'none',
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
    ':focus-visible': {
      transform: 'none',
    },
  },
  shell: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto auto 1fr',
    gridTemplateAreas: `"banner" "bar" "main"`,
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'relative',
    '@media (min-width: 960px)': {
      gridTemplateColumns: '272px 1fr',
      gridTemplateRows: 'auto auto 1fr',
      gridTemplateAreas: `"banner banner" "bar bar" "nav main"`,
    },
  },
  shellCollapsed: {
    '@media (min-width: 960px)': {
      gridTemplateColumns: '72px 1fr',
    },
  },
  shellNoNav: {
    '@media (min-width: 960px)': {
      gridTemplateColumns: '1fr',
      gridTemplateAreas: `"banner" "bar" "main"`,
    },
  },
  bar: {
    gridArea: 'bar',
  },
  navHidden: {
    display: 'none',
  },
  nav: {
    display: 'none',
    flexDirection: 'column',
    gap: '2px',
    padding: '12px 10px 20px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    overflowY: 'auto',
    '@media (min-width: 960px)': {
      display: 'flex',
      gridArea: 'nav',
    },
  },
  navOpenMobile: {
    display: 'flex',
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    top: '56px',
    zIndex: 30,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sectionTitle: {
    margin: 0,
    padding: '14px 10px 6px',
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    minHeight: '44px',
    minWidth: '44px',
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '1px',
    },
  },
  linkIcon: {
    display: 'inline-flex',
    flexShrink: 0,
  },
  linkActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    boxShadow: 'inset 3px 0 0 #C9A227',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    '@media (min-width: 960px)': {
      gridArea: 'main',
    },
    ':focus': {
      outline: 'none',
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '-2px',
    },
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    '@media (min-width: 960px)': {
      padding: '28px 32px',
    },
  },
  banner: {
    gridArea: 'banner',
    padding: '8px 16px',
    backgroundColor: '#0B1F33',
    color: '#F1F5F9',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
  },
  sideBlock: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export interface NavShellProps {
  sections: NavSection[];
  commandBar: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  mobileNavOpen?: boolean;
  environmentBanner?: string;
  className?: string;
  favorites?: RecentItem[];
  recentItems?: RecentItem[];
  onSelectShortcut?: (item: RecentItem) => void;
}

export function NavShell({
  sections,
  commandBar,
  children,
  collapsed = false,
  mobileNavOpen = false,
  environmentBanner = 'DEVELOPMENT / UAT — NO LIVE CLIENT ACTIONS',
  className,
  favorites,
  recentItems,
  onSelectShortcut,
}: NavShellProps) {
  const s = useStyles();
  const hasNav = sections.some((section) => section.items.length > 0);
  return (
    <div className={mergeClasses(s.shell, collapsed && hasNav && s.shellCollapsed, !hasNav && s.shellNoNav, className)}>
      <a
        className={s.skipLink}
        href="#atlas-main-content"
        onClick={(event) => {
          const main = document.getElementById('atlas-main-content');
          if (!main) return;
          event.preventDefault();
          main.focus();
        }}
      >
        Skip to main content
      </a>
      <div className={s.banner} role="status">
        {environmentBanner}
      </div>
      <div className={s.bar}>{commandBar}</div>
      <nav
        id="atlas-primary-nav"
        className={mergeClasses(s.nav, hasNav && mobileNavOpen && s.navOpenMobile, !hasNav && s.navHidden)}
        aria-label="Primary"
        hidden={!hasNav}
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            role="group"
            aria-labelledby={section.title && !collapsed ? `atlas-nav-${section.id}` : undefined}
          >
            {section.title && !collapsed ? (
              <p className={s.sectionTitle} id={`atlas-nav-${section.id}`}>
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
              const accessibleName =
                item.badge != null ? `${item.label}, ${item.badge}` : item.label;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => mergeClasses(s.link, isActive && s.linkActive)}
                  title={item.label}
                  aria-label={collapsed || item.badge != null ? accessibleName : undefined}
                >
                  {item.icon ? (
                    <span className={s.linkIcon} aria-hidden>
                      {item.icon}
                    </span>
                  ) : null}
                  {!collapsed ? <Text size={300}>{item.label}</Text> : null}
                  {!collapsed && item.badge != null ? (
                    <Caption1 style={{ marginLeft: 'auto' }} aria-hidden>
                      {item.badge}
                    </Caption1>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
        {!collapsed && favorites && favorites.length > 0 ? (
          <div className={s.sideBlock} role="group" aria-labelledby="atlas-nav-favorites">
            <p className={s.sectionTitle} id="atlas-nav-favorites">
              Favorites
            </p>
            <RecentList items={favorites} onSelect={onSelectShortcut} />
          </div>
        ) : null}
        {!collapsed && recentItems && recentItems.length > 0 ? (
          <div className={s.sideBlock} role="group" aria-labelledby="atlas-nav-recent">
            <p className={s.sectionTitle} id="atlas-nav-recent">
              Recent
            </p>
            <RecentList items={recentItems} onSelect={onSelectShortcut} />
          </div>
        ) : null}
      </nav>
      <main className={s.main} id="atlas-main-content" tabIndex={-1} inert={mobileNavOpen || undefined}>
        <div className={mergeClasses(s.content, 'atlas-page')}>{children}</div>
      </main>
    </div>
  );
}

const useLayout = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1480px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    '@media (min-width: 640px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    flex: '1 1 220px',
    width: '100%',
    '& .fui-Text': {
      display: 'block',
      width: '100%',
    },
  },
  title: {
    display: 'block',
    margin: 0,
    width: '100%',
  },
  subtitle: {
    display: 'block',
    width: '100%',
  },
  grid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: '1fr',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    '@media (min-width: 960px)': {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    },
    '@media (min-width: 1280px)': {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    },
  },
  gridDense: {
    '@media (min-width: 960px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  span2: {
    '@media (min-width: 960px)': {
      gridColumn: 'span 2',
    },
  },
  spanFull: {
    gridColumn: '1 / -1',
  },
});

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const s = useLayout();
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.titleBlock}>
          <Text as="h1" size={700} weight="semibold" block className={s.title}>
            {title}
          </Text>
          {subtitle ? (
            <Caption1 as="p" block className={s.subtitle}>
              {subtitle}
            </Caption1>
          ) : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function ResponsiveGrid({
  children,
  dense,
  className,
}: {
  children: ReactNode;
  dense?: boolean;
  className?: string;
}) {
  const s = useLayout();
  return <div className={mergeClasses(s.grid, dense && s.gridDense, className)}>{children}</div>;
}

export function GridSpan({
  children,
  span = 1,
}: {
  children: ReactNode;
  span?: 1 | 2 | 'full';
}) {
  const s = useLayout();
  return (
    <div className={span === 'full' ? s.spanFull : span === 2 ? s.span2 : undefined}>{children}</div>
  );
}
