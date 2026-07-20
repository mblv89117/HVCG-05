import { usePortal } from '../state/PortalContext'

export function KpisPage() {
  const { kpis, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Financial KPIs</h2>
        <p>
          {activeClient.name} — values display pending labels only until verified Atlas sources connect. No invented
          numbers.
        </p>
      </div>
      <div className="grid cols-4">
        {kpis.map((k) => (
          <div className="card stat" key={k.id}>
            <span className="label">{k.label}</span>
            <span className="value" style={{ fontSize: '1rem' }}>
              {k.value}
            </span>
            <span className="muted">{k.availability}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
