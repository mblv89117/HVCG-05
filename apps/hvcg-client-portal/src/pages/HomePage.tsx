import { Link } from 'react-router-dom'
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge'
import { usePortal } from '../state/PortalContext'

export function HomePage() {
  const { activeClient, engagement, tasks, docs, meetings, notifications, advisor, user } = usePortal()
  const nextActions = tasks.filter((t) => t.nextAction && t.status !== 'Done')
  const openDocs = docs.filter((d) => d.status === 'Requested' || d.status === 'In Review').length
  const unread = notifications.filter((n) => !n.read).length
  const knowledgeUser = knowledgeUserFromHost({
    role: user.role,
    name: user.name,
    email: user.email,
    assignedClients: [activeClient.code],
    organizationId: 'HVCG',
  })

  return (
    <div>
      <div className="page-head">
        <h2>{activeClient.name}</h2>
        <p>
          Secure HVCG client workspace. Verified relationship facts only — financial figures remain pending until
          Atlas sources connect.
        </p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <div className="card stat">
          <span className="label">Engagement</span>
          <span className="value" style={{ fontSize: '1.05rem' }}>
            {activeClient.engagementStatus}
          </span>
          <span className="muted">Health: {activeClient.health}</span>
        </div>
        <div className="card stat">
          <span className="label">Document readiness</span>
          <span className="value" style={{ fontSize: '0.95rem' }}>
            In Progress
          </span>
          <span className="muted">{openDocs} open requests</span>
        </div>
        <div className="card stat">
          <span className="label">Capital readiness</span>
          <span className="value" style={{ fontSize: '0.95rem' }}>
            {activeClient.blueprintStage}
          </span>
          <span className="muted">Amounts not verified</span>
        </div>
        <div className="card stat">
          <span className="label">Notifications</span>
          <span className="value">{unread}</span>
          <span className="muted">In-app only</span>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Next actions</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {nextActions.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                <div className="muted">
                  {t.ownerType} · {t.dueDate}
                </div>
              </li>
            ))}
            {nextActions.length === 0 && <li className="muted">No open next actions</li>}
          </ul>
          <div style={{ marginTop: '0.85rem' }}>
            <Link className="btn secondary" to="/tasks">
              Task center
            </Link>
          </div>
        </div>
        <div className="card">
          <h3>Engagement snapshot</h3>
          <p className="muted">{engagement?.title}</p>
          <p>
            Next milestone: <strong>{engagement?.nextMilestone}</strong>
          </p>
          <p className="muted">Referral: {activeClient.referralSource}</p>
          <Link className="btn secondary" to="/summary">
            Executive summary
          </Link>
        </div>
        <div className="card">
          <h3>Blueprint workspace</h3>
          <p>
            Current stage: <strong>{activeClient.blueprintStage}</strong>
          </p>
          <p className="muted">Growth capital + additional real estate · non-dilutive &amp; agricultural themes</p>
          <Link className="btn secondary" to="/capital">
            Capital roadmap
          </Link>
        </div>
        <div className="card">
          <h3>Advisor</h3>
          <p>
            <strong>{advisor.name}</strong> · {advisor.title}
          </p>
          <p className="muted">{advisor.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <Link className="btn secondary" to="/meetings">
              Meetings ({meetings.length})
            </Link>
            <Link className="btn ghost" to="/data-room">
              Data room
            </Link>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <ModuleKnowledgeRail
          module="ClientPortal"
          user={knowledgeUser}
          clientCode={activeClient.code}
          title="Engagement knowledge"
        />
      </div>
    </div>
  )
}
