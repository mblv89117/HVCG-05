import { Link } from 'react-router-dom'
import { usePortal } from '../state/PortalContext'
import { FUNDING_STAGES } from '../types'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function HomePage() {
  const { activeClient, engagement, funding, docs, tasks, meetings, advisor, notifications } = usePortal()
  const openDocs = docs.filter((d) => d.status === 'Requested' || d.status === 'In Review').length
  const clientTasks = tasks.filter((t) => t.ownerType === 'Client')
  const doneWeight = clientTasks.filter((t) => t.status === 'Done').reduce((s, t) => s + t.weight, 0)
  const totalWeight = clientTasks.reduce((s, t) => s + t.weight, 0) || 1
  const taskPct = Math.round((doneWeight / totalWeight) * 100)
  const stageIdx = funding ? FUNDING_STAGES.indexOf(funding.stage) : -1

  return (
    <div>
      <div className="page-head">
        <h2>Welcome, {activeClient.name}</h2>
        <p>
          Your secure HVCG workspace for engagement status, funding progress, documents, and advisor collaboration.
          Multi-client ready — switch workspaces above.
        </p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <div className="card stat">
          <span className="label">Engagement</span>
          <span className="value">{engagement?.progressPct ?? 0}%</span>
          <span className="muted">{engagement?.status ?? '—'}</span>
        </div>
        <div className="card stat">
          <span className="label">Funding stage</span>
          <span className="value" style={{ fontSize: '1.15rem' }}>
            {funding?.stage ?? '—'}
          </span>
          <span className="muted">
            Step {stageIdx + 1} of {FUNDING_STAGES.length}
          </span>
        </div>
        <div className="card stat">
          <span className="label">Open documents</span>
          <span className="value">{openDocs}</span>
          <span className="muted">Requested or in review</span>
        </div>
        <div className="card stat">
          <span className="label">Your tasks</span>
          <span className="value">{taskPct}%</span>
          <div className="progress" style={{ marginTop: '0.45rem' }}>
            <span style={{ width: `${taskPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Engagement snapshot</h3>
          <p className="muted">{engagement?.title}</p>
          <p>
            Next milestone: <strong>{engagement?.nextMilestone}</strong>
          </p>
          <div className="progress" style={{ margin: '0.75rem 0' }}>
            <span style={{ width: `${engagement?.progressPct ?? 0}%` }} />
          </div>
          <Link className="btn secondary" to="/engagement">
            View engagement status
          </Link>
        </div>
        <div className="card">
          <h3>Funding target</h3>
          <p className="muted">Target {funding ? money(funding.amountTarget) : '—'}</p>
          <p>
            Committed: <strong>{funding ? money(funding.amountCommitted) : '—'}</strong>
          </p>
          <p className="muted">Lender interest: {funding?.lenderInterest ?? 0}</p>
          <Link className="btn secondary" to="/funding">
            View funding tracker
          </Link>
        </div>
        <div className="card">
          <h3>Upcoming meetings</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {meetings.slice(0, 2).map((m) => (
              <li key={m.id}>
                <strong>{m.title}</strong>
                <div className="muted">{new Date(m.startsAt).toLocaleString()}</div>
              </li>
            ))}
            {meetings.length === 0 && <li className="muted">No meetings scheduled</li>}
          </ul>
          <div style={{ marginTop: '0.85rem' }}>
            <Link className="btn secondary" to="/meetings">
              All meetings
            </Link>
          </div>
        </div>
        <div className="card">
          <h3>Assigned advisor</h3>
          <p>
            <strong>{advisor.name}</strong> · {advisor.title}
          </p>
          <p className="muted">{advisor.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <Link className="btn secondary" to="/advisor">
              Advisor profile
            </Link>
            <Link className="btn ghost" to="/messages">
              Messages
              {notifications.some((n) => !n.read) ? ' · new' : ''}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
