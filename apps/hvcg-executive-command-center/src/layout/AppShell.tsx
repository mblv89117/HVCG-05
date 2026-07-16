import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from '../components/Dashboard'
import { useDashboard } from '../state/DashboardContext'
import type { DashboardId, Role } from '../types'

const links: { id: DashboardId; to: string; label: string; icon: IconName }[] = [
  { id: 'overview', to: '/', label: "Today's Overview", icon: 'overview' },
  { id: 'revenue', to: '/revenue', label: 'Revenue', icon: 'revenue' },
  { id: 'clients', to: '/clients', label: 'Clients', icon: 'clients' },
  { id: 'operations', to: '/operations', label: 'Operations', icon: 'operations' },
  { id: 'financial', to: '/financial', label: 'Financial', icon: 'financial' },
  { id: 'ai', to: '/ai', label: 'AI Intelligence', icon: 'ai' },
  { id: 'notifications', to: '/notifications', label: 'Notifications', icon: 'notifications' },
]

const roles: Role[] = ['Owner', 'Executive', 'Advisor', 'Operations', 'Finance', 'Assistant']

export function AppShell() {
  const { role, setRole, allowedDashboards, unreadCount, data } = useDashboard()
  const visibleLinks = links.filter((link) => allowedDashboards.includes(link.id))

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Executive Command Center">
        <div className="brand">
          <span className="brand-mark">HV</span>
          <div><strong>HVCG</strong><small>Command Center</small></div>
        </div>
        <div className="workspace-label"><span>Leadership workspace</span><b>Internal · Mock</b></div>
        <nav aria-label="Primary navigation">
          {visibleLinks.map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'} data-testid={`nav-${link.id}`} className={({ isActive }) => isActive ? 'active' : undefined}>
              <Icon name={link.icon} />
              <span>{link.label}</span>
              {link.id === 'notifications' && unreadCount > 0 && <b className="nav-count">{unreadCount}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-context">
          <p>Current release</p>
          <strong>RC-1 · Locked</strong>
          <span><i /> Track 1 frozen</span>
        </div>
        <footer><span className="avatar">MB</span><div><strong>Manny Barela</strong><small>{role} view</small></div></footer>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-brand" aria-label="Open navigation"><span>HV</span></button>
          <label className="search">
            <Icon name="search" size={17} />
            <input aria-label="Search command center" placeholder="Search clients, deals, tasks…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <span className="refresh-copy"><i /> Mock data · {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <label className="role-switcher">
              <span>Role</span>
              <select aria-label="Dashboard role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {roles.map((item) => <option key={item}>{item}</option>)}
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
          {visibleLinks.slice(0, 5).map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'}>
              <Icon name={link.icon} size={19} /><span>{link.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
