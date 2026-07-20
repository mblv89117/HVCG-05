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
      { id: 'home', label: 'Executive Home', to: '/', icon: <HomeRegular /> },
      { id: 'executive', label: 'Executive Dashboard', to: '/executive', icon: <BoardRegular /> },
      { id: 'clients', label: 'Clients', to: '/clients', icon: <PeopleRegular /> },
      { id: 'projects', label: 'Projects', to: '/projects', icon: <ClipboardTaskRegular /> },
      { id: 'tasks', label: 'Tasks', to: '/tasks', icon: <CheckboxCheckedRegular /> },
      { id: 'capital', label: 'Capital Advisory', to: '/capital', icon: <MoneyRegular /> },
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
      { id: 'settings', label: 'Settings', to: '/settings', icon: <SettingsRegular /> },
    ],
  },
];

const catalog: SearchResult[] = [
  { id: 's1', title: 'Executive Home', category: 'Navigation', to: '/' },
  { id: 's2', title: 'Colorado Craft Beef', category: 'Clients', subtitle: 'Client workspace', to: '/clients/ws-ccb' },
  { id: 's3', title: 'High Value Capital Group', category: 'Clients', subtitle: 'Internal workspace', to: '/clients/ws-hvcg' },
  { id: 's4', title: 'Banking', category: 'Navigation', to: '/banking' },
  { id: 's5', title: 'Financial Intelligence', category: 'Navigation', to: '/financials' },
  { id: 's6', title: 'Administration', category: 'Administration', subtitle: 'Dataverse SoR', to: '/admin' },
  { id: 's7', title: 'Knowledge', category: 'Navigation', to: '/knowledge' },
  { id: 's8', title: 'Capital Advisory', category: 'Navigation', to: '/capital' },
  { id: 's9', title: 'AI Agents', category: 'Navigation', to: '/ai' },
  { id: 's10', title: 'Documents', category: 'Navigation', to: '/documents' },
  { id: 's11', title: 'Accounting', category: 'Navigation', to: '/accounting' },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
  const [scheme, setScheme] = useState<AtlasColorScheme>(() =>
    readJson<AtlasColorScheme>(ATLAS_SCHEME_KEY, 'light'),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [favorites] = useState<RecentItem[]>(() =>
    readJson(ATLAS_FAVORITES_KEY, [
      { id: 'fav-ccb', title: 'Colorado Craft Beef', subtitle: 'Client', to: '/clients/ws-ccb' },
      { id: 'fav-fin', title: 'Financial Intelligence', subtitle: 'Module', to: '/financials' },
    ]),
  );
  const [recents, setRecents] = useState<RecentItem[]>(() => readJson(ATLAS_RECENTS_KEY, []));
  const { items, push, dismiss } = useNotifications();

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(ATLAS_SCHEME_KEY, JSON.stringify(scheme));
  }, [scheme]);

  useEffect(() => {
    const label =
      allSections.flatMap((s) => s.items).find((i) => i.to === location.pathname)?.label ||
      location.pathname;
    const item: RecentItem = {
      id: `recent-${location.pathname}`,
      title: label,
      subtitle: 'Recent',
      to: location.pathname,
    };
    setRecents((prev) => {
      const next = [item, ...prev.filter((r) => r.to !== item.to)].slice(0, 6);
      localStorage.setItem(ATLAS_RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sections = useMemo(() => {
    const financeIds = new Set(['financials', 'banking', 'accounting', 'capital', 'reports']);
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.id === 'admin') return can('viewAdmin');
          if (financeIds.has(item.id)) return role === 'Unauthenticated' || can('viewFinance');
          if (item.id === 'clients') return role === 'Unauthenticated' || can('viewClients');
          return true;
        }),
      }))
      .filter((s) => s.items.length > 0);
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

  const userName = displayName;
  const notificationCount = items.length;

  const goRecent = (item: RecentItem) => {
    if (item.to) navigate(item.to);
  };

  return (
    <AtlasProvider scheme={scheme}>
      <NavShell
        sections={sections}
        collapsed={collapsed}
        mobileNavOpen={mobileNav}
        environmentBanner={environmentBanner}
        favorites={favorites}
        recents={recents}
        onSelectRecent={goRecent}
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
                <Dropdown
                  aria-label="Client workspace"
                  placeholder="Client"
                  value={workspaceName}
                  selectedOptions={[workspaceId]}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue) setWorkspaceId(data.optionValue);
                  }}
                  style={{ minWidth: 180 }}
                >
                  {workspaceCatalog.map((w) => (
                    <Option key={w.id} value={w.id} text={w.name}>
                      {w.name}
                    </Option>
                  ))}
                </Dropdown>
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
        <div style={{ padding: '8px 16px 16px', opacity: 0.75 }}>
          <Caption1>
            Atlas Elite · {ATLAS_BUILD.environment} · SHA {ATLAS_BUILD.sha} · built {ATLAS_BUILD.builtAt} · role{' '}
            {role} · client {workspaceName}
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
          else {
            const routes: Record<string, string> = {
              s1: '/',
              s2: '/clients/ws-ccb',
              s3: '/clients/ws-hvcg',
              s4: '/banking',
              s5: '/financials',
              s6: '/admin',
              s7: '/knowledge',
              s8: '/capital',
              s9: '/ai',
              s10: '/documents',
              s11: '/accounting',
            };
            const to = routes[r.id];
            if (to) navigate(to);
            else push({ title: `Opened ${r.title}`, body: r.category, tone: 'info' });
          }
        }}
      />
      <AICommandDrawer open={aiOpen} onOpenChange={setAiOpen} />
      <NotificationStack items={items} onDismiss={dismiss} />
    </AtlasProvider>
  );
}
