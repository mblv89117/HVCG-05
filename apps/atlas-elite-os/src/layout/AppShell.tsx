import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AtlasProvider,
  CommandBar,
  NavShell,
  GlobalSearch,
  AICommandDrawer,
  NotificationStack,
  useNotifications,
  type NavSection,
  type SearchResult,
  type AtlasColorScheme,
  type RecentItem,
} from '@hvcg/atlas-design-system';
import {
  HomeRegular,
  PeopleRegular,
  MoneyRegular,
  ClipboardTaskRegular,
  DocumentRegular,
  SettingsRegular,
  DataBarVerticalRegular,
  CheckboxCheckedRegular,
  BuildingBankRegular,
  CalculatorRegular,
  BookRegular,
  BotRegular,
  DocumentDataRegular,
  BoardRegular,
  SparkleRegular,
  ShieldRegular,
  PlugConnectedRegular,
  FlashRegular,
} from '@fluentui/react-icons';
import { Button, Caption1, Dropdown, Option } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { microsoftConfig } from '../microsoft/config';
import { useAtlasRole } from '../security/RoleProvider';
import { useWorkspaceContext } from '../state/WorkspaceContext';
import { workspaceCatalog } from '../data/workspaces';
import { ATLAS_BUILD } from '../buildInfo';

const ATLAS_SCHEME_KEY = 'atlas.colorScheme';
const ATLAS_FAVORITES_KEY = 'atlas.favorites';
const ATLAS_RECENTS_KEY = 'atlas.recents';

const allSections: NavSection[] = [
  {
    id: 'executive',
    title: 'Executive',
    items: [
      { id: 'home', label: 'Command Center', to: '/', icon: <HomeRegular /> },
      { id: 'my-work', label: 'My Work', to: '/my-work', icon: <CheckboxCheckedRegular /> },
      { id: 'portfolio', label: 'Portfolio', to: '/portfolio', icon: <BoardRegular /> },
      { id: 'projects', label: 'Projects', to: '/projects', icon: <ClipboardTaskRegular /> },
      { id: 'inbox', label: 'Universal Inbox', to: '/inbox', icon: <FlashRegular /> },
      { id: 'team', label: 'Team & Agents', to: '/team', icon: <PeopleRegular /> },
      { id: 'clients', label: 'Clients', to: '/clients', icon: <PeopleRegular /> },
      { id: 'tasks', label: 'Approvals', to: '/tasks', icon: <CheckboxCheckedRegular /> },
      { id: 'executive', label: 'Analytics', to: '/executive', icon: <DataBarVerticalRegular /> },
      { id: 'capital', label: 'Capital Advisory', to: '/capital', icon: <MoneyRegular /> },
      { id: 'procurement', label: 'Procurement', to: '/procurement', icon: <ClipboardTaskRegular /> },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      { id: 'financials', label: 'Financial Intelligence', to: '/financials', icon: <DataBarVerticalRegular /> },
      { id: 'banking', label: 'Banking', to: '/banking', icon: <BuildingBankRegular /> },
      { id: 'accounting', label: 'Accounting', to: '/accounting', icon: <CalculatorRegular /> },
      { id: 'reports', label: 'Reports', to: '/reports', icon: <DocumentDataRegular /> },
    ],
  },
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      { id: 'knowledge', label: 'Knowledge', to: '/knowledge', icon: <BookRegular /> },
      { id: 'docs', label: 'Documents', to: '/documents', icon: <DocumentRegular /> },
      { id: 'automations', label: 'Automation', to: '/automations', icon: <BotRegular /> },
      { id: 'ai', label: 'AI Agents', to: '/ai', icon: <SparkleRegular /> },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'admin', label: 'Administration', to: '/admin', icon: <ShieldRegular /> },
      { id: 'connections', label: 'Connections', to: '/connections', icon: <PlugConnectedRegular /> },
      { id: 'settings', label: 'Settings', to: '/settings', icon: <SettingsRegular /> },
    ],
  },
];

const catalog: SearchResult[] = [
  { id: 's1', title: 'Command Center', category: 'Navigation', to: '/' },
  { id: 's1b', title: 'My Work', category: 'Navigation', to: '/my-work' },
  { id: 's1c', title: 'Portfolio', category: 'Navigation', to: '/portfolio' },
  { id: 's1d', title: 'Universal Inbox', category: 'Navigation', to: '/inbox' },
  { id: 's4', title: 'Banking', category: 'Navigation', to: '/banking' },
  { id: 's5', title: 'Financial Intelligence', category: 'Navigation', to: '/financials' },
  { id: 's6', title: 'Administration', category: 'Administration', subtitle: 'Dataverse SoR', to: '/admin' },
  { id: 's7', title: 'Knowledge', category: 'Navigation', to: '/knowledge' },
  { id: 's8', title: 'Capital Advisory', category: 'Navigation', to: '/capital' },
  { id: 's8b', title: 'Procurement', category: 'Navigation', to: '/procurement' },
  { id: 's9', title: 'AI Agents', category: 'Navigation', to: '/ai' },
  { id: 's10', title: 'Documents', category: 'Navigation', to: '/documents' },
  { id: 's11', title: 'Accounting', category: 'Navigation', to: '/accounting' },
  { id: 's12', title: 'Projects', category: 'Navigation', to: '/projects' },
  { id: 's13', title: 'Reports', category: 'Navigation', to: '/reports' },
  { id: 's14', title: 'Settings', category: 'Navigation', to: '/settings' },
  { id: 's15', title: 'Connections Center', category: 'Administration', subtitle: 'Integrations', to: '/connections' },
  { id: 's16', title: 'Clients', category: 'Navigation', to: '/clients' },
];

const routeLabels: Record<string, string> = {
  '/': 'Command Center',
  '/command-center': 'Command Center',
  '/my-work': 'My Work',
  '/portfolio': 'Portfolio',
  '/inbox': 'Universal Inbox',
  '/team': 'Team & Agents',
  '/executive': 'Analytics',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/tasks': 'Approvals',
  '/capital': 'Capital Advisory',
  '/procurement': 'Contract Procurement',
  '/financials': 'Financial Intelligence',
  '/banking': 'Banking',
  '/accounting': 'Accounting',
  '/knowledge': 'Knowledge',
  '/documents': 'Documents',
  '/automations': 'Automation',
  '/ai': 'AI Agents',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/connections': 'Connections Center',
  '/admin': 'Administration',
};

function readScheme(): AtlasColorScheme {
  try {
    const v = localStorage.getItem(ATLAS_SCHEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const defaultFavorites: RecentItem[] = [
  { id: 'fav-banking', label: 'Banking', subtitle: 'Module', to: '/banking' },
];

function isClientShortcut(item: RecentItem): boolean {
  const to = item.to || '';
  return to.startsWith('/clients/') || /client/i.test(item.subtitle || '') || /client/i.test(item.label);
}

export function AppShell() {
  const {
    account,
    configured,
    signIn,
    signOutUser,
    environmentBanner,
    displayName,
    devOwnerActive,
    devOwnerLoginAllowed,
    activateDevOwner,
    clearDevOwner,
  } = useMicrosoftAuth();
  const { role, can } = useAtlasRole();
  const { workspaceId, setWorkspaceId, workspaceName } = useWorkspaceContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<AtlasColorScheme>(readScheme);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [favorites] = useState<RecentItem[]>(() => readJson(ATLAS_FAVORITES_KEY, defaultFavorites));
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => readJson(ATLAS_RECENTS_KEY, []));
  const { items, push, dismiss } = useNotifications();

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(ATLAS_SCHEME_KEY, scheme);
    } catch {
      /* ignore */
    }
  }, [scheme]);

  useEffect(() => {
    const path = location.pathname;
    const base = Object.keys(routeLabels).find((k) => k === path) || (path.startsWith('/clients/') ? path : null);
    if (!base) return;
    const label =
      routeLabels[base] ||
      (base.startsWith('/clients/') ? workspaceCatalog.find((w) => `/clients/${w.id}` === base)?.name || 'Client' : base);
    const entry: RecentItem = {
      id: `recent-${base}`,
      label,
      subtitle: base.startsWith('/clients/') ? 'Client workspace' : 'Navigation',
      to: base,
    };
    setRecentItems((prev) => {
      const next = [entry, ...prev.filter((r) => r.to !== entry.to)].slice(0, 6);
      try {
        localStorage.setItem(ATLAS_RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sections = useMemo(() => {
    const financeIds = new Set(['financials', 'banking', 'accounting', 'capital']);
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.id === 'admin') return can('viewAdmin');
          if (financeIds.has(item.id)) return can('viewFinance');
          if (item.id === 'clients') return can('viewClients');
          return role !== 'Unauthenticated';
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [can, role]);

  const signedIn = role !== 'Unauthenticated';
  const visibleFavorites = useMemo(
    () => (signedIn ? favorites.filter((f) => !isClientShortcut(f) || can('viewClients')) : []),
    [signedIn, favorites, can],
  );
  const visibleRecents = useMemo(
    () => (signedIn ? recentItems.filter((r) => !isClientShortcut(r) || can('viewClients')) : []),
    [signedIn, recentItems, can],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = signedIn ? catalog : catalog.filter((r) => r.category === 'Navigation' || r.category === 'Administration');
    if (!q) return pool;
    return pool.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.subtitle || '').toLowerCase().includes(q),
    );
  }, [query, signedIn]);

  const userName = displayName;
  const notificationCount = items.length;

  const goShortcut = (item: RecentItem) => {
    if (item.to) navigate(item.to);
  };

  return (
    <AtlasProvider scheme={scheme}>
      <div data-atlas-shell="true">
      <NavShell
        sections={sections}
        collapsed={collapsed}
        mobileNavOpen={mobileNav}
        environmentBanner={environmentBanner}
        favorites={visibleFavorites}
        recentItems={visibleRecents}
        onSelectShortcut={goShortcut}
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
            onOpenAI={() => setAiOpen(true)}
            onSearchFocus={() => setSearchOpen(true)}
            onSearchChange={(v) => {
              setQuery(v);
              setSearchOpen(true);
            }}
            searchValue={query}
            notificationCount={notificationCount}
            onNotifications={() => navigate('/notifications')}
            userName={userName}
            trailing={
              <>
                {signedIn ? (
                <Dropdown
                  aria-label="Client workspace"
                  placeholder="Client workspace"
                  value={workspaceName}
                  selectedOptions={[workspaceId]}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) setWorkspaceId(data.optionValue);
                  }}
                  style={{ minWidth: 200 }}
                  title="Switches client workspace. Does not change integration accounts."
                >
                  {workspaceCatalog.map((w) => (
                    <Option key={w.id} value={w.id} text={w.name}>
                      {w.name}
                    </Option>
                  ))}
                </Dropdown>
                ) : null}
                {devOwnerActive ? (
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={() => {
                      clearDevOwner();
                      push({
                        title: 'Local Owner session ended',
                        body: 'You are Unauthenticated again until you sign in.',
                        tone: 'info',
                      });
                    }}
                  >
                    End Local Owner
                  </Button>
                ) : null}
                {devOwnerLoginAllowed && !account && !devOwnerActive ? (
                  <Button
                    size="small"
                    appearance="primary"
                    onClick={() => {
                      activateDevOwner();
                      push({
                        title: 'Local Owner (Dev) active',
                        body: 'HVCG Owner capabilities for local UAT. Disabled in production/staging.',
                        tone: 'success',
                      });
                      if (location.pathname === '/access-denied') navigate('/');
                    }}
                  >
                    Local Owner (Dev)
                  </Button>
                ) : null}
                {configured ? (
                  account ? (
                    <Button size="small" appearance="subtle" onClick={() => void signOutUser()}>
                      Sign out
                    </Button>
                  ) : (
                    <Button size="small" appearance="secondary" onClick={() => void signIn()}>
                      Sign in with Microsoft
                    </Button>
                  )
                ) : !devOwnerLoginAllowed ? (
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
                ) : null}
              </>
            }
          />
        }
      >
        <Outlet />
        <div style={{ padding: '8px 0 0', opacity: 0.7 }}>
          <Caption1>
            Atlas Integration · {ATLAS_BUILD.environment} · SHA {ATLAS_BUILD.sha} · built {ATLAS_BUILD.builtAt} ·
            role {role}
            {signedIn ? ` · client ${workspaceName}` : ''}
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
          if (r.to) navigate(r.to);
          else push({ title: `Opened ${r.title}`, body: r.category, tone: 'info' });
        }}
      />
      <AICommandDrawer
        open={aiOpen}
        onOpenChange={setAiOpen}
        onNavigateHint={(path) => {
          setAiOpen(false);
          navigate(path);
        }}
        onSubmit={(prompt) =>
          push({ title: 'AI Command Center', body: `Queued: ${prompt}`, tone: 'info' })
        }
      />
      <NotificationStack items={items} onDismiss={dismiss} />
      </div>
    </AtlasProvider>
  );
}
