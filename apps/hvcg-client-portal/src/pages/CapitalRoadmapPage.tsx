import { Link } from 'react-router-dom'
import { usePortal } from '../state/PortalContext'
import { FUNDING_STAGES } from '../types'

export function CapitalRoadmapPage() {
  const { roadmap, funding, activeClient } = usePortal()
  const stageIdx = funding ? FUNDING_STAGES.indexOf(funding.stage) : -1
  return (
    <div>
      <div className="page-head">
        <h2>Capital Roadmap</h2>
        <p>
          Financing themes for {activeClient.name}: {activeClient.financingThemes.join('; ') || '—'}. Amounts hidden
          until verified.
        </p>
      </div>
      <div className="grid cols-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <h3>Funding stage tracker</h3>
          <p className="muted">
            Current: {funding?.stage ?? '—'} (step {stageIdx + 1} of {FUNDING_STAGES.length})
          </p>
          <p className="muted">Target / committed: awaiting verified source</p>
          <div className="funding-track" style={{ marginTop: '0.75rem' }}>
            {FUNDING_STAGES.map((s, i) => {
              const cls = i < stageIdx ? 'done' : i === stageIdx ? 'current' : ''
              return (
                <div key={s} className={`funding-step ${cls}`}>
                  <span className="dot" />
                  <span>{s}</span>
                  <span className="muted">{i < stageIdx ? 'Done' : i === stageIdx ? 'Current' : ''}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '0.85rem' }}>
            <Link className="btn ghost" to="/pipeline">
              Lender / investor pipeline
            </Link>
          </div>
        </div>
        <div className="card">
          <h3>Roadmap items</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {roadmap.map((r) => (
              <li key={r.id} style={{ marginBottom: '0.65rem' }}>
                <strong>{r.title}</strong>
                <div className="muted">
                  {r.theme} · {r.status} · {r.availability}
                </div>
                <div>{r.notes}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
