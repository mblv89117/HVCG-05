import { useState } from 'react'
import { usePortal } from '../state/PortalContext'

export function NotificationsPage() {
  const { notifications, activeClient } = usePortal()
  const [readIds, setReadIds] = useState(() => new Set(notifications.filter((item) => item.read).map((item) => item.id)))

  function markAllRead() {
    setReadIds(new Set(notifications.map((item) => item.id)))
  }

  return (
    <div>
      <div className="page-head">
        <h2>Notifications</h2>
        <p>In-portal alerts for {activeClient.name}. Email, SMS, and push delivery are mocked and remain disabled.</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button className="btn secondary" onClick={markAllRead} disabled={notifications.length === readIds.size}>
          Mark all read
        </button>
      </div>

      <div className="notification-feed" role="list" aria-label="Notifications">
        {notifications.map((item) => {
          const read = readIds.has(item.id)
          return (
            <article className={`card notification-item${read ? ' read' : ''}`} key={item.id} role="listitem">
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="muted">
                  {new Date(item.createdAt).toLocaleString()} · channel: {item.channel}
                </span>
              </div>
              <button
                className="btn ghost"
                type="button"
                disabled={read}
                onClick={() => setReadIds((previous) => new Set(previous).add(item.id))}
              >
                {read ? 'Read' : 'Mark read'}
              </button>
            </article>
          )
        })}
        {notifications.length === 0 && <div className="card muted">No notifications.</div>}
      </div>
    </div>
  )
}
