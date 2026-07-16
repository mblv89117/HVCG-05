import { usePortal } from '../state/PortalContext'

export function EngagementPage() {
  const { engagement, activeClient } = usePortal()
  if (!engagement) {
    return (
      <div className="page-head">
        <h2>Engagement Status</h2>
        <p>No engagement found for {activeClient.name}.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-head">
        <h2>Engagement Status</h2>
        <p>Client-safe view of delivery progress for {activeClient.name}.</p>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <h3>{engagement.title}</h3>
          <p className="muted">
            {engagement.type} · Started {engagement.startDate}
          </p>
          <p>
            Status: <span className="badge ok">{engagement.status}</span>
          </p>
          <p>
            Client status: <span className="badge">{activeClient.engagementStatus}</span>
          </p>
          <div style={{ marginTop: '1rem' }}>
            <div className="muted" style={{ marginBottom: '0.35rem' }}>
              Overall completion {engagement.progressPct}%
            </div>
            <div className="progress">
              <span style={{ width: `${engagement.progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Next milestone</h3>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0.35rem 0 0.75rem' }}>
            {engagement.nextMilestone}
          </p>
          <p className="muted">
            Fees, margins, and internal notes are never shown in the client portal.
          </p>
        </div>
      </div>
    </div>
  )
}
