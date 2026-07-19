import {
  makeStyles,
  mergeClasses,
  tokens,
  Text,
  Caption1,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

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
      gridTemplateColumns: '260px 1fr',
      gridTemplateRows: 'auto 1fr',
      gridTemplateAreas: `"bar bar" "nav main"`,
    },
  },
  shellCollapsed: {
    '@media (min-width: 960px)': {
      gridTemplateColumns: '72px 1fr',
    },
  },
  bar: {
    gridColumn: '1 / -1',
    '@media (min-width: 960px)': {
      gridArea: 'bar',
    },
  },
  nav: {
    display: 'none',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 10px',
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
    inset: '56px 0 0 0',
    zIndex: 30,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sectionTitle: {
    padding: '12px 10px 6px',
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: tokens.fontSizeBase100,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    transitionProperty: 'background-color, color',
    transitionDuration: '120ms',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  linkActive: {
    backgroundColor: 'rgba(176, 138, 60, 0.18)',
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  collapsedLabel: {
    '@media (min-width: 960px)': {
      // parent controls collapsed via data attribute
    },
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    '@media (min-width: 960px)': {
      gridArea: 'main',
    },
  },
  content: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    '@media (min-width: 960px)': {
      padding: '24px',
    },
  },
  banner: {
    padding: '8px 16px',
    background: 'linear-gradient(90deg, #0f3d2c, #1a5c42)',
    color: '#f2eee6',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
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
}

export function NavShell({
  sections,
  commandBar,
  children,
  collapsed = false,
  mobileNavOpen = false,
  environmentBanner = 'DEVELOPMENT / UAT — NO LIVE CLIENT ACTIONS',
  className,
}: NavShellProps) {
  const s = useStyles();
  return (
    <div className={mergeClasses(s.shell, collapsed && s.shellCollapsed, className)}>
      <div className={s.banner} role="status">{environmentBanner}</div>
      <div className={s.bar}>{commandBar}</div>
      <nav
        className={mergeClasses(s.nav, mobileNavOpen && s.navOpenMobile)}
        aria-label="Primary"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        {sections.map((section) => (
          <div key={section.id}>
            {section.title && !collapsed ? (
              <div className={s.sectionTitle}>{section.title}</div>
            ) : null}
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
      </nav>
      <main className={s.main}>
        <div className={s.content}>{children}</div>
      </main>
    </div>
  );
}

const useLayout = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1440px',
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
      <div className={s.header} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <Text as="h1" size={700} weight="semibold">{title}</Text>
          {subtitle ? <Caption1>{subtitle}</Caption1> : null}
        </div>
        {actions}
      </div>
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
    <div className={span === 'full' ? s.spanFull : span === 2 ? s.span2 : undefined}>
      {children}
    </div>
  );
}
