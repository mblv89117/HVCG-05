import { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
  AlertRegular,
  OptionsRegular,
} from '@fluentui/react-icons';
import { Button } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';
import { notificationCatalog } from '../data/projects';

const sections: NavSection[] = [
  {
    id: 'primary',
    title: 'Executive',
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
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        to: '/notifications',
        icon: <AlertRegular />,
        badge: notificationCatalog.length,
      },
      { id: 'settings', label: 'Settings', to: '/settings', icon: <OptionsRegular /> },
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
  { id: 's6', title: 'Notifications', category: 'Navigation' },
  { id: 's7', title: 'Settings', category: 'Navigation' },
  { id: 's8', title: 'Model-driven admin app', category: 'Administration', subtitle: 'Dataverse SoR' },
];

const searchRoutes: Record<string, string> = {
  s1: '/',
  s2: '/clients/ws-ccb',
  s3: '/clients/ws-hvcg',
  s4: '/capital',
  s5: '/financials',
  s6: '/notifications',
  s7: '/settings',
  s8: '/admin',
};

export function AppShell() {
  const navigate = useNavigate();
  const { account, configured, signIn, signOutUser, environmentBanner } = useMicrosoftAuth();
  const [scheme, setScheme] = useState<AtlasColorScheme>('light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { items, push, dismiss } = useNotifications();

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

  const userName = account?.name || account?.username || 'Manny';

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
            notificationCount={notificationCatalog.length}
            onNotifications={() => navigate('/notifications')}
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
      </NavShell>
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={query}
        onQueryChange={setQuery}
        results={results}
        onSelect={(r) => {
          const path = searchRoutes[r.id];
          if (path) navigate(path);
          push({ title: `Opened ${r.title}`, body: r.category, tone: 'info' });
        }}
      />
      <NotificationStack items={items} onDismiss={dismiss} />
    </AtlasProvider>
  );
}
