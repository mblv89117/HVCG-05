import { NavLink, Outlet } from 'react-router-dom'
import { useFinance } from '../state/FinanceContext'
import type { FinanceRole } from '../types'
import { mockIntegrations } from '../integrations/mockIntegrations'

const nav = [
  { to: '/', key: 'overview', label: 'Overview', testId: 'nav-overview' },
  { to: '/revenue', key: 'revenue', label: 'Revenue', testId: 'nav-revenue' },
  { to: '/ar', key: 'ar', label: 'Accounts Receivable', testId: 'nav-ar' },
  { to: '/retainers', key: 'retainers', label: 'Retainers', testId: 'nav-retainers' },
  { to: '/pricing', key: 'pricing', label: 'Proposal Pricing', testId: 'nav-pricing' },
  { to: '/cash', key: 'cash', label: 'Cash Flow', testId: 'nav-cash' },
  { to: '/kpis', key: 'kpis', label: 'Financial KPIs', testId: 'nav-kpis' },
]

export function AppShell() {
  const { role, setRole, canAccess, store } = useFinance()
  const visible = nav.filter((item) => canAccess(item.key))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>HVCG</strong>
          <span>Finance Operations</span>
        </div>
        <label className="role-control">
          Dashboard role
          <select
            aria-label="Dashboard role"
            value={role}
            onChange={(e) => setRole(e.target.value as FinanceRole)}
          >
            <option>Owner</option>
            <option>Finance</option>
            <option>Advisor</option>
            <option>Assistant</option>
          </select>
        </label>
        <nav>
          {visible.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} data-testid={item.testId}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-meta">
          <p>Data mode: <strong>{store.dataMode}</strong></p>
          <p>As of: {store.asOf}</p>
          <p>Integrations mocked: {mockIntegrations.filter((i) => i.status === 'Mocked').length}</p>
        </div>
      </aside>
      <div className="content">
        <div className="mobile-nav" aria-label="Mobile navigation">
          {visible.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
