import { NavLink, Outlet } from 'react-router-dom'
import { usePortal } from '../state/PortalContext'
import type { PortalRole } from '../types'

const groups: { label: string; links: { to: string; label: string; end?: boolean }[] }[] = [
  {
    label: 'Overview',
    links: [
      { to: '/', label: 'Client Home', end: true },
      { to: '/summary', label: 'Executive Summary' },
      { to: '/contacts', label: 'Contacts' },
      { to: '/engagement', label: 'Engagement Overview' },
    ],
  },
  {
    label: 'Delivery',
    links: [
      { to: '/projects', label: 'Projects' },
      { to: '/milestones', label: 'Milestones' },
      { to: '/tasks', label: 'Tasks' },
      { to: '/approvals', label: 'Approvals' },
      { to: '/deliverables', label: 'Deliverables' },
    ],
  },
  {
    label: 'Capital',
    links: [
      { to: '/kpis', label: 'Financial KPIs' },
      { to: '/capital', label: 'Capital Roadmap' },
      { to: '/pipeline', label: 'Lender / Investor Pipeline' },
      { to: '/enterprise-value', label: 'Enterprise Value' },
      { to: '/funding', label: 'Funding Progress' },
    ],
  },
  {
    label: 'Data Room',
    links: [
      { to: '/data-room', label: 'Secure Data Room' },
      { to: '/documents', label: 'Document Requests' },
      { to: '/files', label: 'Approved Files' },
    ],
  },
  {
    label: 'Collaborate',
    links: [
      { to: '/meetings', label: 'Meetings' },
      { to: '/notes', label: 'Notes' },
      { to: '/decisions', label: 'Decisions' },
      { to: '/messages', label: 'Messages' },
      { to: '/advisor', label: 'Assigned Advisor' },
    ],
  },
  {
    label: 'Insights',
    links: [
      { to: '/ai-insights', label: 'AI Insights' },
      { to: '/activity', label: 'Activity History' },
      { to: '/timeline', label: 'Project Timeline' },
      { to: '/notifications', label: 'Notifications' },
      { to: '/invoices', label: 'Invoices' },
    ],
  },
]

const roles: PortalRole[] = ['HVCG Owner', 'HVCG Team Member', 'Client Executive', 'Client Contributor', 'Read-Only Advisor', 'Administrator']

export function AppShell() {
  const { clients, activeClientId, setActiveClientId, user, activeClient, setUserRole } = usePortal()

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand-block">
          <p className="eyebrow">High Value Capital Group</p>
          <h1>Client Portal</h1>
          <p className="sub">Secure client workspaces &amp; data rooms</p>
        </div>
        <nav className="nav" aria-label="Portal sections">
          {groups.map((g) => (
            <div key={g.label} className="nav-group">
              <div className="nav-group-label">{g.label}</div>
              {g.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          Template: Colorado Craft Beef · invites gated · no anonymous sharing
          <br />
          Active: {activeClient.code}
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
          <div className="client-switch">
            <label htmlFor="roleSelect">Role</label>
            <select
              id="roleSelect"
              value={user.role}
              onChange={(e) => setUserRole(e.target.value as PortalRole)}
              aria-label="Select portal role"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
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
