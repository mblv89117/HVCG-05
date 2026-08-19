import { MetricCard, PageHeader, Section, StatusPill } from '../components/Ui'
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge'
import { useOps } from '../state/OpsContext'

export function OperationsPage() {
  const { data, role } = useOps()
  const due = data.tasks.filter((task) => task.state === 'Due today')
  const waiting = data.tasks.filter((task) => task.state === 'Waiting')
  const blocked = data.tasks.filter((task) => task.state === 'Blocked')
  const approvals = data.tasks.filter((task) => task.state === 'Approval')
  const knowledgeUser = knowledgeUserFromHost({ role, organizationId: 'HVCG', assignedClients: ['CCB'] })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operations dashboard"
        title="Today’s operations pulse"
        description="Tasks, blockers, meetings, approvals, and release health — mock data only, Track 1 frozen."
      />
      <div className="metric-grid">{data.overviewMetrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>

      <div className="split-grid">
        <Section title="Due & waiting" subtitle="Client and internal work needing attention">
          <ul className="item-list" data-testid="ops-due-list">
            {[...due, ...waiting].map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.owner} · {task.due}
                  </span>
                </div>
                <StatusPill label={task.state} tone={task.state === 'Due today' ? 'warning' : 'accent'} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Blockers & approvals" subtitle="Items that stop or gate delivery">
          <ul className="item-list">
            {[...blocked, ...approvals].map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.owner} · {task.due}
                  </span>
                </div>
                <StatusPill label={task.state} tone={task.state === 'Blocked' ? 'critical' : 'warning'} />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="split-grid">
        <Section title="Meetings" subtitle="Today and near-term">
          <ul className="item-list">
            {data.meetings.map((meeting) => (
              <li key={meeting.id}>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.attendees}</span>
                </div>
                <StatusPill label={meeting.when} tone="neutral" />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Follow-ups & releases" subtitle="Cadence and gate status">
          <ul className="simple-list">
            {data.followUps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <ul className="item-list" style={{ marginTop: '1rem' }}>
            {data.releases.map((release) => (
              <li key={release.id}>
                <div>
                  <strong>{release.name}</strong>
                  <span>{release.owner}</span>
                </div>
                <StatusPill label={release.status} tone={release.status.includes('COMPLETE') ? 'positive' : 'accent'} />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Documentation health" subtitle="SOP currency across the library">
        <div className="metric-grid compact">{data.docHealth.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>
      </Section>

      <ModuleKnowledgeRail module="Operations" user={knowledgeUser} title="Operations knowledge context" />
    </div>
  )
}
