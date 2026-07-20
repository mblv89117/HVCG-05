import { usePortal } from '../state/PortalContext'

export function ActivityPage() {
  const { activity, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Activity History</h2>
        <p>Audit-friendly activity for {activeClient.name}.</p>
      </div>
      <div className="timeline">
        {activity.map((a) => (
          <div className="timeline-event complete" key={a.id}>
            <span className="timeline-marker" />
            <div>
              <div className="timeline-meta">
                <span className="badge ok">{a.category}</span>
                <span>{a.at}</span>
                <span>{a.actor}</span>
              </div>
              <h3>{a.title}</h3>
              <p className="muted">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
