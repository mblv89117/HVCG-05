import { usePortal } from '../state/PortalContext'

export function TimelinePage() {
  const { timeline, activeClient } = usePortal()
  const ordered = [...timeline]

  return (
    <div>
      <div className="page-head">
        <h2>Project Timeline</h2>
        <p>
          Client-safe chronological view of engagement, document, meeting, and funding activity for{' '}
          {activeClient.name}.
        </p>
      </div>

      <div className="card">
        <div className="timeline" role="list" aria-label="Project timeline">
          {ordered.map((event) => (
            <article className={`timeline-event ${event.status.toLowerCase()}`} key={event.id} role="listitem">
              <div className="timeline-marker" aria-hidden />
              <div>
                <div className="timeline-meta">
                  <span>{event.date}</span>
                  <span
                    className={`badge ${event.status === 'Complete' ? 'ok' : event.status === 'Current' ? 'warn' : ''}`}
                  >
                    {event.status}
                  </span>
                  <span className="badge">{event.type}</span>
                </div>
                <h3>{event.title}</h3>
                <p className="muted">{event.description}</p>
              </div>
            </article>
          ))}
          {ordered.length === 0 && <p className="muted">No timeline activity yet.</p>}
        </div>
      </div>
    </div>
  )
}
