import { NavLink, Outlet } from 'react-router-dom'
import { Icon, type IconName } from '../components/Dashboard'
import { useDashboard } from '../state/DashboardContext'
import type { DashboardId } from '../types'

const links: { id: DashboardId; to: string; label: string; icon: IconName }[] = [
  { id: 'overview', to: '/', label: 'Executive Home', icon: 'overview' },
  { id: 'approvals', to: '/approvals', label: 'Approval Inbox', icon: 'notifications' },
  { id: 'agents', to: '/agents', label: 'Agent Control', icon: 'ai' },
  { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: 'operations' },
  { id: 'revenue', to: '/revenue', label: 'Revenue', icon: 'revenue' },
  { id: 'engineering', to: '/engineering', label: 'Engineering', icon: 'briefcase' },
  { id: 'brief', to: '/brief', label: 'Morning Brief', icon: 'calendar' },
]

export function AppShell() {
  const { approvals, data } = useDashboard()
  const pendingCount = approvals.filter((item) => item.state === 'Pending').length

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Executive Command Center">
        <div className="brand">
          <span className="brand-mark">HV</span>
          <div><strong>HVCG</strong><small>Command Center</small></div>
        </div>
        <div className="workspace-label"><span>Leadership workspace</span><b>Development / UAT</b></div>
        <nav aria-label="Primary navigation">
          {links.map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'} data-testid={`nav-${link.id}`} className={({ isActive }) => isActive ? 'active' : undefined}>
              <Icon name={link.icon} />
              <span>{link.label}</span>
              {link.id === 'approvals' && pendingCount > 0 && <b className="nav-count">{pendingCount}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-context">
          <p>Production posture</p>
          <strong>No live actions</strong>
          <span><i /> Track 1 frozen</span>
        </div>
        <footer><span className="avatar">MB</span><div><strong>Manny Barela</strong><small>Owner view</small></div></footer>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-brand" aria-label="Open navigation"><span>HV</span></button>
          <div className="environment-banner"><strong>Development / UAT</strong><span>Read-only aggregation · no live execution</span></div>
          <div className="topbar-actions">
            <span className="refresh-copy"><i /> Repository snapshot · {new Date(data.generatedAt).toLocaleDateString()}</span>
            <NavLink to="/approvals" className="bell-button" aria-label={`${pendingCount} pending approvals`}>
              <Icon name="notifications" />
              {pendingCount > 0 && <span>{pendingCount}</span>}
            </NavLink>
          </div>
        </header>
        <main className="content" id="main-content">
          <Outlet />
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.slice(0, 5).map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'}>
              <Icon name={link.icon} size={19} /><span>{link.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
