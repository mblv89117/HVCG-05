import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from '../components/Ui'
import { useOps } from '../state/OpsContext'
import type { ModuleId, Role } from '../types'

type NavLinkItem = { id: ModuleId; to: string; label: string; icon: IconName }
type NavGroup = { label: string; items: NavLinkItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: 'projects' },
      { id: 'executive', to: '/executive', label: 'Executive', icon: 'executive' },
      { id: 'operations', to: '/', label: 'Operations', icon: 'operations' },
      { id: 'scorecards', to: '/scorecards', label: 'Daily Scorecards', icon: 'scorecards' },
      { id: 'weekly', to: '/weekly', label: 'Weekly Reviews', icon: 'weekly' },
      { id: 'quarterly', to: '/quarterly', label: 'Quarterly Planning', icon: 'quarterly' },
      { id: 'kpis', to: '/kpis', label: 'Company KPIs', icon: 'kpis' },
    ],
  },
  {
    label: 'People & process',
    items: [
      { id: 'meetings', to: '/meetings', label: 'Meeting Center', icon: 'meetings' },
      { id: 'sop', to: '/sop', label: 'SOP Library', icon: 'sop' },
      { id: 'hr', to: '/hr', label: 'HR', icon: 'hr' },
      { id: 'hiring', to: '/hiring', label: 'Hiring', icon: 'hiring' },
      { id: 'training', to: '/training', label: 'Training', icon: 'training' },
      { id: 'team', to: '/team', label: 'Team', icon: 'team' },
      { id: 'human', to: '/human', label: 'Human Workforce', icon: 'human' },
    ],
  },
  {
    label: 'Delivery & assets',
    items: [
      { id: 'projects', to: '/projects', label: 'Projects', icon: 'projects' },
      { id: 'vendors', to: '/vendors', label: 'Vendors', icon: 'vendors' },
      { id: 'assets', to: '/assets', label: 'Assets', icon: 'assets' },
      { id: 'ai', to: '/ai', label: 'AI Workforce', icon: 'ai' },
    ],
  },
  {
    label: 'Systems',
    items: [
      { id: 'notifications', to: '/notifications', label: 'Notifications', icon: 'notifications' },
      { id: 'calendar', to: '/calendar', label: 'Calendar Arch', icon: 'calendar' },
      { id: 'docs', to: '/docs', label: 'Documentation', icon: 'docs' },
    ],
  },
]

const roles: Role[] = ['Owner', 'Operations', 'PM', 'Finance', 'Advisor', 'Assistant']

export function AppShell() {
  const { role, setRole, allowedModules, unreadCount, data } = useOps()
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowedModules.includes(item.id)) }))
    .filter((group) => group.items.length > 0)
  const mobileLinks = visibleGroups.flatMap((group) => group.items).slice(0, 5)

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Operations Hub">
        <div className="brand">
          <span className="brand-mark">HV</span>
          <div>
            <strong>HVCG</strong>
            <small>Operations Hub</small>
          </div>
        </div>
        <div className="workspace-label">
          <span>Internal operations</span>
          <b>Dev · Mock only</b>
        </div>
        <nav aria-label="Primary navigation">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((link) => (
                <NavLink
                  key={link.id}
                  to={link.to}
                  end={link.to === '/'}
                  data-testid={`nav-${link.id}`}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                  {link.id === 'notifications' && unreadCount > 0 && <b className="nav-count">{unreadCount}</b>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-context">
          <p>Current release</p>
          <strong>RC-1 · Locked</strong>
          <span>
            <i /> Track 1 frozen
          </span>
        </div>
        <footer>
          <span className="avatar">MB</span>
          <div>
            <strong>Manny Barela</strong>
            <small>{role} view</small>
          </div>
        </footer>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-brand" aria-label="Open navigation" type="button">
            <span>HV</span>
          </button>
          <label className="search">
            <Icon name="search" size={17} />
            <input aria-label="Search operations hub" placeholder="Search ops, people, SOPs, vendors…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <span className="refresh-copy">
              <i /> Mock data · {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
            <label className="role-switcher">
              <span>Role</span>
              <select aria-label="Dashboard role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {roles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <NavLink to="/notifications" className="bell-button" aria-label={`${unreadCount} unread notifications`}>
              <Icon name="notifications" />
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </NavLink>
          </div>
        </header>
        <main className="content" id="main-content">
          <Outlet />
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileLinks.map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'}>
              <Icon name={link.icon} size={19} />
              <span>{link.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
