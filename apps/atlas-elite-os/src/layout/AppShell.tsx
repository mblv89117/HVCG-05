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
  MailRegular,
  PeopleRegular,
  MoneyRegular,
  ClipboardTaskRegular,
  DocumentRegular,
  SettingsRegular,
  CheckboxCheckedRegular,
  BookRegular,
  ShieldRegular,
  PlugConnectedRegular,
  ApprovalsAppRegular,
} from '@fluentui/react-icons';
import { Button, makeStyles } from '@fluentui/react-components';
import { useMicrosoftAuth } from '../microsoft/auth/AuthProvider';
import { useAtlasRole } from '../security/RoleProvider';
import { microsoftConfig } from '../microsoft/config';
import { workspaceCatalog } from '../data/workspaces';
import { useHubAuth } from '../integrations/hub/useHubAuth';
import { searchPm } from '../integrations/hub/pmApi';

const ATLAS_SCHEME_KEY = 'atlas.colorScheme';
const ATLAS_FAVORITES_KEY = 'atlas.favorites';
const ATLAS_RECENTS_KEY = 'atlas.recents';

const useChrome = makeStyles({
  wide: {
    '@media (max-width: 639px)': {
      display: 'none',
    },
  },
  narrow: {
    display: 'none',
    '@media (max-width: 639px)': {
      display: 'inline',
    },
  },
});

const allSections: NavSection[] = [
  {
    id: 'home',
    title: 'Operate',
    items: [
      { id: 'home', label: 'Command Center', to: '/', icon: <HomeRegular /> },
      { id: 'my-work', label: 'My Work', to: '/my-work', icon: <CheckboxCheckedRegular /> },
      { id: 'tasks', label: 'Decisions', to: '/tasks', icon: <ApprovalsAppRegular /> },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    items: [
      { id: 'clients', label: 'Clients', to: '/clients', icon: <PeopleRegular /> },
      { id: 'leads', label: 'Leads', to: '/leads', icon: <MailRegular /> },
      { id: 'opportunities', label: 'Opportunities', to: '/opportunities', icon: <ApprovalsAppRegular /> },
    ],
  },
  {
    id: 'work',
    title: 'Work',
    items: [{ id: 'projects', label: 'Projects', to: '/projects', icon: <ClipboardTaskRegular /> }],
  },
  {
    id: 'capital',
    title: 'Capital',
    items: [{ id: 'capital', label: 'Capital', to: '/capital', icon: <MoneyRegular /> }],
  },
  {
    id: 'search',
    title: 'Search',
    items: [
      { id: 'knowledge', label: 'Search / Knowledge', to: '/knowledge', icon: <BookRegular /> },
      { id: 'docs', label: 'Documents', to: '/documents/operating', icon: <DocumentRegular /> },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { id: 'connections', label: 'Connections', to: '/connections', icon: <PlugConnectedRegular /> },
      { id: 'settings', label: 'Settings', to: '/settings', icon: <SettingsRegular /> },
      { id: 'admin', label: 'Administration', to: '/admin', icon: <ShieldRegular /> },
    ],
  },
];

const catalog: SearchResult[] = [
  { id: 's1', title: 'Command Center', category: 'Navigation', subtitle: 'What needs you today', to: '/' },
  { id: 's1b', title: 'My Work', category: 'Navigation', to: '/my-work' },
  { id: 's-decisions', title: 'Decisions', category: 'Navigation', subtitle: 'Approvals that need you', to: '/tasks' },
  { id: 's16', title: 'Clients', category: 'CRM', to: '/clients' },
  { id: 's16b', title: 'Leads', category: 'CRM', subtitle: 'Who needs follow-up', to: '/leads' },
  { id: 's16c', title: 'Opportunities', category: 'CRM', subtitle: 'Pipeline and activation exceptions', to: '/opportunities' },
  { id: 's12', title: 'Projects', category: 'Work', to: '/projects' },
  { id: 's8', title: 'Capital', category: 'Capital', subtitle: 'Transactions requiring attention', to: '/capital' },
  { id: 's7', title: 'Search / Knowledge', category: 'Search', to: '/knowledge' },
  { id: 's10', title: 'Documents', category: 'Search', to: '/documents/operating' },
  { id: 's14', title: 'Settings', category: 'Operations', to: '/settings' },
  { id: 's15', title: 'Connections', category: 'Operations', subtitle: 'Integrations', to: '/connections' },
  { id: 's6', title: 'Administration', category: 'Operations', to: '/admin' },
];

const KIND_LABEL: Record<string, string> = {
  client: 'Client',
  project: 'Project',
  task: 'Task',
  opportunity: 'Opportunity',
  lead: 'Lead',
  capital_opportunity: 'Capital',
  lender: 'Lender',
  document: 'Document',
  communication: 'Communication',
  meeting: 'Meeting',
  engagement: 'Engagement',
  deliverable: 'Deliverable',
  decision: 'Decision',
  vendor: 'Vendor',
};

const routeLabels: Record<string, string> = {
  '/': 'Command Center',
  '/command-center': 'Command Center',
  '/my-work': 'My Work',
  '/portfolio': 'Projects',
  '/inbox': 'Inbox',
  '/team': 'Team',
  '/executive': 'Analytics',
  '/clients': 'Clients',
  '/clients/intake': 'Lead intake',
  '/leads': 'Leads',
  '/opportunities': 'Opportunities',
  '/projects': 'Projects',
  '/tasks': 'Decisions',
  '/capital': 'Capital',
  '/procurement': 'Procurement',
  '/risk': 'Risk & Claims',
  '/growth': 'Growth',
  '/financials': 'Financials',
  '/banking': 'Banking',
  '/accounting': 'Accounting',
  '/knowledge': 'Search / Knowledge',
  '/documents': 'Documents',
  '/documents/operating': 'Documents',
  '/automations': 'Automation',
  '/ai': 'AI Agents',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/connections': 'Connections',
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
  { id: 'fav-capital', label: 'Capital', to: '/capital' },
  { id: 'fav-clients', label: 'Clients', to: '/clients' },
];

/** Hub often returns capital files as a project, client, or bare `/capital` href. Open the file. */
function hubHitTo(hit: { kind?: string; id?: string; href?: string }): string | undefined {
  const id = String(hit.id || '').trim();
  const kind = String(hit.kind || '');
  const href = String(hit.href || '');
  const capitalFile =
    kind === 'capital_opportunity' ||
    (kind === 'opportunity' &&
      Boolean(id) &&
      (/^cap-/i.test(id) || href === '/capital' || href.startsWith('/capital?')));
  if (capitalFile && id) return `/capital?opportunity=${encodeURIComponent(id)}`;
  return hit.href;
}

function isClientShortcut(item: RecentItem): boolean {
  const to = item.to || '';
  return to.startsWith('/clients/') || /client/i.test(item.subtitle || '') || /client/i.test(item.label);
}

function shortcutAllowed(
  item: RecentItem,
  can: (capability: 'viewAdmin' | 'viewFinance' | 'viewClients' | 'viewCrmLeads') => boolean,
): boolean {
  const to = item.to || '';
  const path = to.split(/[?#]/)[0];
  if (path === '/admin' || path.startsWith('/admin/')) return can('viewAdmin');
  if (
    path === '/capital' ||
    path.startsWith('/capital/') ||
    to.startsWith('/capital?') ||
    path === '/financials' ||
    path === '/banking' ||
    path === '/accounting'
  ) {
    return can('viewFinance');
  }
  if (path === '/leads' || path.startsWith('/leads/') || path === '/opportunities' || path.startsWith('/opportunities/')) {
    return can('viewCrmLeads');
  }
  if (to.startsWith('/clients') || isClientShortcut(item)) return can('viewClients');
  return true;
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
  const hubAuth = useHubAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<AtlasColorScheme>(readScheme);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hubHits, setHubHits] = useState<SearchResult[]>([]);
  const [hubSearchBusy, setHubSearchBusy] = useState(false);
  const [hubSearchError, setHubSearchError] = useState<string | null>(null);
  const [favorites] = useState<RecentItem[]>(() => readJson(ATLAS_FAVORITES_KEY, defaultFavorites));
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => readJson(ATLAS_RECENTS_KEY, []));
  const { items, push, dismiss } = useNotifications();
  const chrome = useChrome();

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)');
    const onChange = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileNav(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const nav = document.getElementById('atlas-primary-nav');
    const toggle = document.querySelector<HTMLElement>('[aria-controls="atlas-primary-nav"]');
    const focusable = () => {
      const inNav = nav
        ? Array.from(
            nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
          )
        : [];
      return [toggle, ...inNav].filter((el): el is HTMLElement => !!el && el.offsetParent !== null);
    };
    const first = focusable()[0];
    first?.focus();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusable();
      if (list.length === 0) return;
      const start = list[0];
      const end = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === start || !active || !list.includes(active))) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && (active === end || !active || !list.includes(active))) {
        e.preventDefault();
        start.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [mobileNav]);

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
    const q = query.trim();
    if (!searchOpen || !hubAuth.hasBearer || q.length < 2) {
      setHubHits([]);
      setHubSearchBusy(false);
      setHubSearchError(null);
      return;
    }
    let cancelled = false;
    setHubSearchBusy(true);
    setHubSearchError(null);
    const timer = window.setTimeout(() => {
      void searchPm(hubAuth, q)
        .then((found) => {
          if (cancelled) return;
          setHubHits(
            (found.results || []).map((hit) => ({
              id: `hub-${hit.kind}-${hit.id}`,
              title: hit.title,
              category: KIND_LABEL[hit.kind] || hit.kind,
              subtitle: hit.clientCode || undefined,
              to: hubHitTo(hit),
            })),
          );
          setHubSearchBusy(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setHubHits([]);
          setHubSearchBusy(false);
          setHubSearchError(err instanceof Error ? err.message : 'Hub search failed');
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchOpen, hubAuth.hasBearer, hubAuth.accessToken]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNav(false);
        setSearchOpen(false);
        setAiOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
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
          if (item.id === 'leads' || item.id === 'opportunities') return can('viewCrmLeads');
          return role !== 'Unauthenticated';
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [can, role]);

  const signedIn = role !== 'Unauthenticated';
  const hasNav = sections.length > 0;
  const visibleFavorites = useMemo(
    () => (signedIn ? favorites.filter((f) => shortcutAllowed(f, can)) : []),
    [signedIn, favorites, can],
  );
  const visibleRecents = useMemo(
    () => (signedIn ? recentItems.filter((r) => shortcutAllowed(r, can)) : []),
    [signedIn, recentItems, can],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = catalog.filter((r) => {
      if (!signedIn) return r.category === 'Navigation';
      if (r.to === '/admin') return can('viewAdmin');
      if (r.to === '/capital') return can('viewFinance');
      if (r.to === '/clients') return can('viewClients');
      if (r.to === '/leads' || r.to === '/opportunities') return can('viewCrmLeads');
      return true;
    });
    const nav = !q
      ? pool
      : pool.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            (r.subtitle || '').toLowerCase().includes(q),
        );
    if (!signedIn || hubHits.length === 0) return nav;
    const seen = new Set(hubHits.map((h) => h.to || h.id));
    return [...hubHits, ...nav.filter((r) => !r.to || !seen.has(r.to))];
  }, [query, signedIn, hubHits, can]);

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
            logoSrc="/brand/hvcg-logo.svg"
            scheme={scheme}
            navExpanded={hasNav && (isDesktop ? !collapsed : mobileNav)}
            onToggleNav={
              hasNav
                ? () => {
                    if (window.matchMedia('(min-width: 960px)').matches) {
                      setCollapsed((c) => !c);
                    } else {
                      setMobileNav((o) => !o);
                    }
                  }
                : undefined
            }
            onToggleTheme={() => setScheme((s) => (s === 'light' ? 'dark' : 'light'))}
            onSearchFocus={() => setSearchOpen(true)}
            onSearchChange={(v) => {
              setQuery(v);
              setSearchOpen(true);
            }}
            searchValue={query}
            searchExpanded={searchOpen}
            searchPopupId="atlas-command-palette"
            notificationCount={notificationCount}
            onNotifications={signedIn ? () => navigate('/notifications') : undefined}
            userName={signedIn ? displayName : undefined}
            trailing={
              <>
                {devOwnerActive ? (
                  <Button
                    size="small"
                    appearance="subtle"
                    aria-label="End Local Owner session"
                    onClick={() => {
                      clearDevOwner();
                      push({
                        title: 'Local session ended',
                        body: 'Sign in to continue.',
                        tone: 'info',
                      });
                    }}
                  >
                    <span className={chrome.wide}>End Local Owner</span>
                    <span className={chrome.narrow}>End</span>
                  </Button>
                ) : null}
                {devOwnerLoginAllowed && !account && !devOwnerActive ? (
                  <Button
                    size="small"
                    appearance="primary"
                    aria-label="Continue as Local Owner (Dev)"
                    onClick={() => {
                      activateDevOwner();
                      push({
                        title: 'Local Owner active',
                        body: 'Owner access for this Development session.',
                        tone: 'success',
                      });
                      if (location.pathname === '/access-denied') navigate('/');
                    }}
                  >
                    <span className={chrome.wide}>Local Owner (Dev)</span>
                    <span className={chrome.narrow}>Dev</span>
                  </Button>
                ) : null}
                {configured ? (
                  account ? (
                    <Button size="small" appearance="subtle" onClick={() => void signOutUser()}>
                      Sign out
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      appearance="secondary"
                      className={devOwnerLoginAllowed ? chrome.wide : undefined}
                      onClick={() => void signIn()}
                    >
                      <span className={chrome.wide}>Sign in with Microsoft</span>
                      <span className={chrome.narrow}>Sign in</span>
                    </Button>
                  )
                ) : !devOwnerLoginAllowed ? (
                  <Button
                    size="small"
                    appearance="secondary"
                    className={chrome.wide}
                    onClick={() =>
                      push({
                        title: 'Sign-in unavailable',
                        body: 'Microsoft sign-in is not configured in this environment.',
                        tone: 'warning',
                      })
                    }
                  >
                    Sign in unavailable
                  </Button>
                ) : null}
              </>
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
        loading={hubSearchBusy}
        emptyLabel={hubSearchError || 'No matches. Try a client, project, document, or module name.'}
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
