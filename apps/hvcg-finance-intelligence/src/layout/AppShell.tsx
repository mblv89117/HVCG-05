import { NavLink, Outlet } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import type { OrganizationId, Role, RouteKey } from '../types'
import { roleAccess } from '../types'

const navItems: { key: RouteKey; to: string; label: string }[] = [
  { key: 'overview', to: '/', label: 'Overview' },
  { key: 'decisions', to: '/decisions', label: 'Recommendations' },
  { key: 'changes', to: '/changes', label: 'What Changed' },
  { key: 'scores', to: '/scores', label: 'Scores' },
  { key: 'trends', to: '/trends', label: 'Trends' },
  { key: 'cash', to: '/cash', label: 'Cash & Runway' },
  { key: 'working-capital', to: '/working-capital', label: 'Working Capital' },
  { key: 'budget', to: '/budget', label: 'Budget vs Actual' },
  { key: 'forecast', to: '/forecast', label: 'Forecast & Scenarios' },
  { key: 'enterprise-value', to: '/enterprise-value', label: 'Enterprise Value' },
  { key: 'workspaces', to: '/workspaces', label: 'Client Workspaces' },
  { key: 'capital', to: '/capital', label: 'Capital Advisory' },
  { key: 'alerts', to: '/alerts', label: 'Alerts' },
  { key: 'ai', to: '/ai', label: 'AI Observations' },
  { key: 'governance', to: '/governance', label: 'Governance & Audit' },
]

const roles: Role[] = ['Owner', 'Executive', 'Finance', 'Advisor', 'Assistant']
const orgs: OrganizationId[] = ['HVCG', 'CCB', 'CLIENT_WORKSPACE']

export function AppShell() {
  const { role, setRole, organizationId, setOrganizationId, generatedAt } = useFinance()
  const allowed = new Set(roleAccess[role])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>HVCG Finance Intelligence</strong>
          <span className="muted">Executive decision engine</span>
        </div>
        <label className="field">
          Dashboard role
          <select aria-label="Dashboard role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Organization
          <select
            aria-label="Organization"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value as OrganizationId)}
          >
            {orgs.map((o) => (
              <option key={o} value={o}>
                {o === 'CLIENT_WORKSPACE' ? 'Client aggregate' : o}
              </option>
            ))}
          </select>
        </label>
        <nav className="nav">
          {navItems
            .filter((item) => allowed.has(item.key))
            .map((item) => (
              <NavLink key={item.key} to={item.to} end={item.to === '/'} data-testid={`nav-${item.key}`}>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <nav className="mobile-nav" aria-label="Mobile">
          {navItems
            .filter((item) => allowed.has(item.key))
            .slice(0, 6)
            .map((item) => (
              <NavLink key={item.key} to={item.to} end={item.to === '/'} data-testid={`mnav-${item.key}`}>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <footer className="sidebar-foot">
          <div>Data mode: labeled mock / incomplete</div>
          <div>Refresh: {generatedAt}</div>
          <div>Phase 1 · Decision engine</div>
        </footer>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
