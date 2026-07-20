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
import { color, elevation } from '../tokens';

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
  shell: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (min-width: 960px)': {
      gridTemplateColumns: '280px 1fr',
      gridTemplateRows: 'auto 1fr',
      gridTemplateAreas: `"bar bar" "nav main"`,
      padding: '0 12px 12px 12px',
      gap: '12px',
      boxSizing: 'border-box',
    },
  },
  shellCollapsed: {
    '@media (min-width: 960px)': {
      gridTemplateColumns: '84px 1fr',
    },
  },
  bar: {
    gridColumn: '1 / -1',
    '@media (min-width: 960px)': {
      gridArea: 'bar',
      position: 'sticky',
      top: '0',
      zIndex: 40,
      paddingTop: '10px',
    },
  },
  nav: {
    display: 'none',
    flexDirection: 'column',
    gap: '2px',
    padding: '14px 12px 20px',
    borderRadius: '20px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: elevation.md,
    overflowY: 'auto',
    '@media (min-width: 960px)': {
      display: 'flex',
      gridArea: 'nav',
      position: 'sticky',
      top: '76px',
      maxHeight: 'calc(100vh - 96px)',
      alignSelf: 'start',
    },
  },
  navOpenMobile: {
    display: 'flex',
    position: 'fixed',
    inset: '64px 12px 12px 12px',
    zIndex: 30,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sectionTitle: {
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
    borderRadius: '12px',
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: '140ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':focus-visible': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
  },
  linkActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    color: color.navy,
    fontWeight: tokens.fontWeightSemibold,
    boxShadow: `inset 3px 0 0 ${color.gold}`,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    '@media (min-width: 960px)': {
      gridArea: 'main',
      borderRadius: '20px',
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      backgroundColor: tokens.colorNeutralBackground1,
      boxShadow: elevation.sm,
      overflow: 'hidden',
    },
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    '@media (min-width: 960px)': {
      padding: '28px',
    },
  },
  banner: {
    padding: '8px 16px',
    background: `linear-gradient(90deg, ${color.navyDeep}, ${color.navySoft})`,
    color: '#F8FAFC',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
  },
  favorites: {
    marginTop: '12px',
    paddingTop: '10px',
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
  favorites?: RecentItem[];
  recents?: RecentItem[];
  onSelectRecent?: (item: RecentItem) => void;
  className?: string;
}

export function NavShell({
  sections,
  commandBar,
  children,
  collapsed = false,
  mobileNavOpen = false,
  environmentBanner = 'DEVELOPMENT / UAT — NO LIVE CLIENT ACTIONS',
  favorites = [],
  recents = [],
  onSelectRecent,
  className,
}: NavShellProps) {
  const s = useStyles();
  return (
    <div className={mergeClasses(s.shell, collapsed && s.shellCollapsed, 'atlas-atmosphere', className)}>
      <div className={s.banner} role="status">
        {environmentBanner}
      </div>
      <div className={s.bar}>{commandBar}</div>
      <nav
        className={mergeClasses(s.nav, mobileNavOpen && s.navOpenMobile)}
        aria-label="Primary"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        {sections.map((section) => (
          <div key={section.id}>
            {section.title && !collapsed ? <div className={s.sectionTitle}>{section.title}</div> : null}
            {section.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                className={({ isActive }) => mergeClasses(s.link, isActive && s.linkActive)}
                title={item.label}
              >
                {item.icon}
                {!collapsed ? <Text size={300}>{item.label}</Text> : null}
                {!collapsed && item.badge != null ? (
                  <Caption1 style={{ marginLeft: 'auto' }}>{item.badge}</Caption1>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
        {!collapsed && (favorites.length > 0 || recents.length > 0) ? (
          <div className={s.favorites}>
            {favorites.length ? (
              <>
                <div className={s.sectionTitle}>Favorites</div>
                <RecentList items={favorites} onSelect={onSelectRecent} />
              </>
            ) : null}
            {recents.length ? (
              <>
                <div className={s.sectionTitle}>Recent</div>
                <RecentList items={recents} onSelect={onSelectRecent} />
              </>
            ) : null}
          </div>
        ) : null}
      </nav>
      <main className={s.main}>
        <div className={mergeClasses(s.content, 'atlas-page-enter')}>{children}</div>
      </main>
    </div>
  );
}

const useLayout = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    maxWidth: '1520px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    '@media (min-width: 1280px)': {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
  hideTitle,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  hideTitle?: boolean;
}) {
  const s = useLayout();
  return (
    <div className={s.page}>
      {!hideTitle ? (
        <div
          className={s.header}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <Text as="h1" size={700} weight="semibold">
              {title}
            </Text>
            {subtitle ? <Caption1>{subtitle}</Caption1> : null}
          </div>
          {actions}
        </div>
      ) : actions ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{actions}</div>
      ) : null}
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
