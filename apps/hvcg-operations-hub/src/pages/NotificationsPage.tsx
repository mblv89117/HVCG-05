import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const severityTone = {
  Info: 'neutral',
  Action: 'warning',
  Critical: 'critical',
} as const

export function NotificationsPage() {
  const { visibleNotifications, unreadCount, markNotificationRead, markAllRead } = useOps()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Notifications center"
        title="Ops signal feed"
        description="QA complete, releases, client docs, proposals, sprint completion, and deployment gates."
        action={
          <button type="button" className="ghost-button" onClick={markAllRead} data-testid="mark-all-read">
            Mark all read ({unreadCount})
          </button>
        }
      />
      <Section title="Inbox" subtitle={`${visibleNotifications.length} visible for current role`}>
        <ul className="item-list notifications" data-testid="notification-list">
          {visibleNotifications.map((item) => (
            <li key={item.id} className={item.read ? 'read' : 'unread'}>
              <button type="button" onClick={() => markNotificationRead(item.id)}>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.type} · {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <p>{item.detail}</p>
                </div>
                <StatusPill label={item.severity} tone={severityTone[item.severity]} />
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
