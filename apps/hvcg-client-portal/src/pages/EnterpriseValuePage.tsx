import { usePortal } from '../state/PortalContext'

export function EnterpriseValuePage() {
  const { kpis, activeClient } = usePortal()
  const ev = kpis.find((k) => k.label.toLowerCase().includes('enterprise'))
  return (
    <div>
      <div className="page-head">
        <h2>Enterprise Value</h2>
        <p>Enterprise value for {activeClient.name} is not calculated until verified financials are connected.</p>
      </div>
      <div className="card stat">
        <span className="label">{ev?.label ?? 'Enterprise Value Estimate'}</span>
        <span className="value" style={{ fontSize: '1.35rem' }}>
          {ev?.value ?? 'Not yet calculated'}
        </span>
        <span className="muted">{ev?.availability ?? 'Not yet calculated'}</span>
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Inputs required</h3>
        <p className="muted">
          Verified financial package intake is the blocking next action before any EV estimate can be shown in this
          workspace.
        </p>
      </div>
    </div>
  )
}
