import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Bot,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  Gauge,
  KeyRound,
  Menu,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { approvals, risks } from '../data/mockData'
import { useGovernance, type GovernanceRole } from '../state/GovernanceContext'

const navItems = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/agents', label: 'Agent Registry', icon: Bot },
  { to: '/prompts', label: 'Prompt Registry', icon: FileClock },
  { to: '/permissions', label: 'Permissions', icon: KeyRound },
  { to: '/health', label: 'Agent Health', icon: Activity },
  { to: '/costs', label: 'Cost & Usage', icon: CircleDollarSign },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, count: approvals.filter((item) => item.status === 'Pending' || item.status === 'Escalated').length },
  { to: '/risks', label: 'Risk & Compliance', icon: ShieldAlert, count: risks.filter((item) => item.status === 'Open').length },
  { to: '/policies', label: 'Policies', icon: ShieldCheck },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role, setRole } = useGovernance()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">HG</div>
          <div>
            <strong>HVCG</strong>
            <small>AI Governance</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">
          <span>Control plane</span>
          <b>Internal · Mock mode</b>
        </div>
        <nav aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {!!count && <span className="nav-count">{count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="control-state">
          <p>Environment</p>
          <strong>Offline Governance Lab</strong>
          <span><i /> No live connections</span>
        </div>
        <footer>
          <div className="avatar">MB</div>
          <div>
            <strong>Manny Barela</strong>
            <small>System Owner</small>
          </div>
        </footer>
      </aside>

      {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" />}

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="search">
            <Search size={15} />
            <input aria-label="Search governance records" placeholder="Search agents, prompts, evidence…" />
            <kbd>⌘K</kbd>
          </div>
          <div className="topbar-actions">
            <span className="sync-state"><i /> Snapshot updated 2m ago</span>
            <label className="role-switcher">
              <span>View as</span>
              <select
                aria-label="Governance role"
                value={role}
                onChange={(event) => setRole(event.target.value as GovernanceRole)}
              >
                <option>Owner</option>
                <option>Governance Admin</option>
                <option>Auditor</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
