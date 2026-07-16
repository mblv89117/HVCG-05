import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from '../components/Ui'
import { useOps } from '../state/OpsContext'
import type { ModuleId, Role } from '../types'

const links: { id: ModuleId; to: string; label: string; icon: IconName }[] = [
  { id: 'operations', to: '/', label: 'Operations', icon: 'operations' },
  { id: 'team', to: '/team', label: 'Team', icon: 'team' },
  { id: 'projects', to: '/projects', label: 'Projects', icon: 'projects' },
  { id: 'sop', to: '/sop', label: 'SOP Library', icon: 'sop' },
  { id: 'ai', to: '/ai', label: 'AI Workforce', icon: 'ai' },
  { id: 'human', to: '/human', label: 'Human Workforce', icon: 'human' },
  { id: 'notifications', to: '/notifications', label: 'Notifications', icon: 'notifications' },
]

const roles: Role[] = ['Owner', 'Operations', 'PM', 'Finance', 'Advisor', 'Assistant']

export function AppShell() {
  const { role, setRole, allowedModules, unreadCount, data } = useOps()
  const visibleLinks = links.filter((link) => allowedModules.includes(link.id))

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
          <span>Delivery workspace</span>
          <b>Internal · Mock</b>
        </div>
        <nav aria-label="Primary navigation">
          {visibleLinks.map((link) => (
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
            <input aria-label="Search operations hub" placeholder="Search teams, projects, SOPs…" />
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
          {visibleLinks.slice(0, 5).map((link) => (
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
