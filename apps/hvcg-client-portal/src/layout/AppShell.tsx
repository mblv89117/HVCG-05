import { NavLink, Outlet } from 'react-router-dom'
import { usePortal } from '../state/PortalContext'

const links = [
  { to: '/', label: 'Client Home', end: true },
  { to: '/engagement', label: 'Engagement Status' },
  { to: '/funding', label: 'Funding Progress' },
  { to: '/documents', label: 'Document Checklist' },
  { to: '/messages', label: 'Messages' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/meetings', label: 'Meetings' },
  { to: '/advisor', label: 'Assigned Advisor' },
  { to: '/files', label: 'Secure File Center' },
]

export function AppShell() {
  const { clients, activeClientId, setActiveClientId, user, activeClient } = usePortal()

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand-block">
          <p className="eyebrow">High Value Capital Group</p>
          <h1>Client Portal</h1>
          <p className="sub">Secure engagement workspace</p>
        </div>
        <nav className="nav" aria-label="Portal sections">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          Dev MVP · integrations mocked · invites gated (BL-C1)
          <br />
          Active client: {activeClient.code}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="client-switch">
            <label htmlFor="clientSelect">Workspace</label>
            <select
              id="clientSelect"
              value={activeClientId}
              onChange={(e) => setActiveClientId(e.target.value)}
              aria-label="Select client workspace"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="user-chip">
            <div className="avatar" aria-hidden>
              {user.name
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div>{user.name}</div>
              <div className="muted" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                {user.role}
              </div>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
