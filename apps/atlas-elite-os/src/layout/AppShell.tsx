import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
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
} from '@fluentui/react-icons';
import { Button } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';

const sections: NavSection[] = [
  {
    id: 'primary',
    title: 'Operate',
    items: [
      { id: 'home', label: 'Executive Dashboard', to: '/', icon: <HomeRegular /> },
      { id: 'ai', label: 'AI Command Center', to: '/ai', icon: <SparkleRegular />, badge: 'Soon' },
      { id: 'clients', label: 'Client Workspace', to: '/clients', icon: <PeopleRegular />, badge: 'Soon' },
      { id: 'capital', label: 'Capital Advisory', to: '/capital', icon: <MoneyRegular />, badge: 'Soon' },
      { id: 'projects', label: 'Project Workspace', to: '/projects', icon: <ClipboardTaskRegular />, badge: 'Soon' },
      { id: 'docs', label: 'Documents', to: '/documents', icon: <DocumentRegular />, badge: 'Soon' },
      {
        id: 'admin',
        label: 'Administration',
        to: '/admin',
        icon: <SettingsRegular />,
      },
    ],
  },
];

const catalog: SearchResult[] = [
  { id: 's1', title: 'Executive Dashboard', category: 'Navigation' },
  { id: 's2', title: 'Approve Atlas Command Center UAT', category: 'Approvals', subtitle: 'Pending' },
  { id: 's3', title: 'Sample Client — Apex Holdings', category: 'Clients', subtitle: 'Active' },
  { id: 's4', title: 'Funding pipeline', category: 'Capital', subtitle: 'Development sample' },
  {
    id: 's5',
    title: 'Model-driven admin app',
    category: 'Administration',
    subtitle: 'Dataverse SoR',
  },
];

export function AppShell() {
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
            notificationCount={account ? 4 : 0}
            onNotifications={() =>
              push({
                title: account ? '4 approvals waiting' : 'Sign in required',
                body: account
                  ? 'Open My Approvals on the Executive Dashboard.'
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
      </NavShell>
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        query={query}
        onQueryChange={setQuery}
        results={results}
        onSelect={(r) => push({ title: `Opened ${r.title}`, body: r.category, tone: 'info' })}
      />
      <NotificationStack items={items} onDismiss={dismiss} />
    </AtlasProvider>
  );
}
