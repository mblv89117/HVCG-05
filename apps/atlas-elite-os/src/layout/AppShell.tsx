import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AtlasProvider,
  CommandBar,
  NavShell,
  GlobalSearch,
  NotificationStack,
  useNotifications,
  type NavSection,
  type SearchResult,
  type AtlasColorScheme,
} from '@hvcg/atlas-design-system';
import {
  HomeRegular,
  SparkleRegular,
  PeopleRegular,
  MoneyRegular,
  ClipboardTaskRegular,
  DocumentRegular,
  SettingsRegular,
  DataBarVerticalRegular,
  DataPieRegular,
  ArrowTrendingRegular,
  CheckboxCheckedRegular,
} from '@fluentui/react-icons';
import { Button, Caption1 } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';
import { useAtlasRole } from '../security/RoleProvider';
import { ATLAS_BUILD } from '../buildInfo';

const allSections: NavSection[] = [
  {
    id: 'primary',
    title: 'Atlas',
    items: [
      { id: 'home', label: 'Home', to: '/', icon: <HomeRegular /> },
      { id: 'financials', label: 'Financials', to: '/financials', icon: <DataBarVerticalRegular /> },
      { id: 'revenue', label: 'Revenue', to: '/revenue', icon: <DataPieRegular /> },
      { id: 'clients', label: 'Clients', to: '/clients', icon: <PeopleRegular /> },
      { id: 'projects', label: 'Projects', to: '/projects', icon: <ClipboardTaskRegular /> },
      { id: 'tasks', label: 'Tasks', to: '/tasks', icon: <CheckboxCheckedRegular /> },
      { id: 'capital', label: 'Capital', to: '/capital', icon: <MoneyRegular /> },
      { id: 'ev', label: 'Enterprise Value', to: '/enterprise-value', icon: <ArrowTrendingRegular /> },
      { id: 'docs', label: 'Documents', to: '/documents', icon: <DocumentRegular /> },
      { id: 'ai', label: 'AI Insights', to: '/ai', icon: <SparkleRegular /> },
      { id: 'admin', label: 'Administration', to: '/admin', icon: <SettingsRegular /> },
    ],
  },
];

const catalog: SearchResult[] = [
  { id: 's1', title: 'Executive Home', category: 'Navigation' },
  { id: 's2', title: 'Colorado Craft Beef', category: 'Clients', subtitle: 'Client workspace' },
  { id: 's3', title: 'High Value Capital Group', category: 'Clients', subtitle: 'Internal workspace' },
  { id: 's4', title: 'Capital Advisory', category: 'Navigation' },
  { id: 's5', title: 'Financial Performance', category: 'Navigation' },
  { id: 's6', title: 'Model-driven admin app', category: 'Administration', subtitle: 'Dataverse SoR' },
];

export function AppShell() {
  const { account, configured, signIn, signOutUser, environmentBanner } = useMicrosoftAuth();
  const { role, can } = useAtlasRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<AtlasColorScheme>('light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { items, push, dismiss } = useNotifications();

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  const sections = useMemo(() => {
    const financeIds = new Set(['financials', 'revenue', 'capital', 'ev']);
    const items = allSections[0].items.filter((item) => {
      if (item.id === 'admin') return can('viewAdmin');
      if (financeIds.has(item.id)) return role === 'Unauthenticated' || can('viewFinance');
      if (item.id === 'clients') return role === 'Unauthenticated' || can('viewClients');
      if (item.id === 'home') return true;
      return true;
    });
    return [{ ...allSections[0], items }];
  }, [can, role]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q),
    );
  }, [query]);

  const userName = account?.name || account?.username || 'Guest';
  const notificationCount = items.length;

  return (
    <AtlasProvider scheme={scheme}>
      <NavShell
        sections={sections}
        collapsed={collapsed}
        mobileNavOpen={mobileNav}
        environmentBanner={environmentBanner}
        commandBar={
          <CommandBar
            logoSrc="/brand/hvcg-logo.png"
            scheme={scheme}
            onToggleNav={() => {
              if (window.matchMedia('(min-width: 960px)').matches) {
                setCollapsed((c) => !c);
              } else {
                setMobileNav((o) => !o);
              }
            }}
            onToggleTheme={() => setScheme((s) => (s === 'light' ? 'dark' : 'light'))}
            onSearchFocus={() => setSearchOpen(true)}
            onSearchChange={(v) => {
              setQuery(v);
              setSearchOpen(true);
            }}
            searchValue={query}
            notificationCount={notificationCount}
            onNotifications={() =>
              push({
                title: account ? 'Open Tasks & Approvals' : 'Sign in required',
                body: account
                  ? 'Review owner decisions in Tasks.'
                  : configured
                    ? 'Sign in with your HVCG Microsoft account to load Dataverse.'
                    : 'Owner must register the Entra SPA app (see Microsoft architecture docs).',
                tone: account ? 'warning' : 'info',
              })
            }
            userName={userName}
            trailing={
              configured ? (
                account ? (
                  <Button size="small" appearance="subtle" onClick={() => void signOutUser()}>
                    Sign out
                  </Button>
                ) : (
                  <Button size="small" appearance="primary" onClick={() => void signIn()}>
                    Sign in
                  </Button>
                )
              ) : (
                <Button
                  size="small"
                  appearance="secondary"
                  onClick={() =>
                    push({
                      title: 'Entra SPA client ID missing',
                      body: 'Set VITE_ENTRA_CLIENT_ID after app registration in HVCG tenant.',
                      tone: 'warning',
                    })
                  }
                >
                  {microsoftConfig.environment}
                </Button>
              )
            }
          />
        }
      >
        <Outlet />
        <div style={{ padding: '8px 16px 16px', opacity: 0.75 }}>
          <Caption1>
            Atlas Elite OS · {ATLAS_BUILD.environment} · SHA {ATLAS_BUILD.sha} · built {ATLAS_BUILD.builtAt} · role{' '}
            {role}
          </Caption1>
        </div>
      </NavShell>
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={query}
        onQueryChange={setQuery}
        results={results}
        onSelect={(r) => {
          setSearchOpen(false);
          const routes: Record<string, string> = {
            s1: '/',
            s2: '/clients/ws-ccb',
            s3: '/clients/ws-hvcg',
            s4: '/capital',
            s5: '/financials',
            s6: '/admin',
          };
          const to = routes[r.id];
          if (to) navigate(to);
          else push({ title: `Opened ${r.title}`, body: r.category, tone: 'info' });
        }}
      />
      <NotificationStack items={items} onDismiss={dismiss} />
    </AtlasProvider>
  );
}
