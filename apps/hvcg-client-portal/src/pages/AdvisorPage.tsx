import { Link } from 'react-router-dom'
import { usePortal } from '../state/PortalContext'
import { integrations } from '../integrations/mockIntegrations'

export function AdvisorPage() {
  const { advisor, activeClient } = usePortal()
  const statuses = integrations.list()

  return (
    <div>
      <div className="page-head">
        <h2>Assigned Advisor</h2>
        <p>Primary HVCG contact for {activeClient.name}.</p>
      </div>

      <div className="grid cols-2">
        <div className="card advisor-card">
          <div className="big-avatar" aria-hidden>
            {advisor.initials}
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>{advisor.name}</h3>
            <p className="muted">{advisor.title}</p>
            <p>{advisor.email}</p>
            <p>{advisor.phone}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <Link className="btn" to="/messages">
                Message advisor
              </Link>
              <Link className="btn secondary" to="/meetings">
                Book meeting
              </Link>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Integration readiness (mocked)</h3>
          <div className="integration-list">
            {statuses.map((s) => (
              <div key={s.name} className="integration-row">
                <div>
                  <strong>{s.label}</strong>
                  <div className="muted">{s.notes}</div>
                </div>
                <span className={`badge ${s.ready ? 'ok' : 'warn'}`}>{s.mode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
