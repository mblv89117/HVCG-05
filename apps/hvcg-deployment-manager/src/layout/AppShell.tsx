import { NavLink, Outlet } from 'react-router-dom'
import { useDeployment } from '../state/DeploymentContext'
import type { PageId, Role } from '../types'

const links: { id: PageId; to: string; label: string }[] = [
  { id: 'dashboard', to: '/', label: 'Release Dashboard' },
  { id: 'queue', to: '/queue', label: 'Deployment Queue' },
  { id: 'promotion', to: '/promotion', label: 'Environment Promotion' },
  { id: 'approvals', to: '/approvals', label: 'Approval Workflow' },
  { id: 'evidence', to: '/evidence', label: 'Release Evidence' },
  { id: 'rollback', to: '/rollback', label: 'Rollback Dashboard' },
  { id: 'environments', to: '/environments', label: 'Environment Status' },
  { id: 'calendar', to: '/calendar', label: 'Deployment Calendar' },
  { id: 'incidents', to: '/incidents', label: 'Incident Dashboard' },
  { id: 'audit', to: '/audit', label: 'Audit Trail' },
]

const roles: Role[] = ['Owner', 'MasterPM', 'QA', 'Engineer', 'Viewer']

export function AppShell() {
  const { role, setRole, allowedPages, data } = useDeployment()
  const visible = links.filter((l) => allowedPages.includes(l.id))

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Deployment Manager">
        <div className="brand">
          <span className="brand-mark">DM</span>
          <div>
            <strong>HVCG</strong>
            <small>Deployment Manager</small>
          </div>
        </div>
        <div className="workspace-label">
          <span>Release control center</span>
          <b>Internal · Mock only</b>
        </div>
        <nav aria-label="Primary navigation">
          {visible.map((link) => (
            <NavLink
              key={link.id}
              to={link.to}
              end={link.to === '/'}
              data-testid={`nav-${link.id}`}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-context">
          <p>Production</p>
          <strong>PROTECTED</strong>
          <span>
            <i /> Track 1 frozen · no live deploy
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
          <div className="topbar-title">
            <span>Mock data</span>
            <strong>{data.tenantName}</strong>
          </div>
          <div className="topbar-actions">
            <span className="refresh-copy">
              <i /> Generated {new Date(data.generatedAt).toLocaleString()}
            </span>
            <label className="role-switcher">
              <span>Role</span>
              <select aria-label="Deployment role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main className="content" id="main-content">
          <Outlet />
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {visible.slice(0, 5).map((link) => (
            <NavLink key={link.id} to={link.to} end={link.to === '/'}>
              <span>{link.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
