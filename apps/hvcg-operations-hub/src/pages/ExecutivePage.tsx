import { Link } from 'react-router-dom'
import { MetricCard, PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'
import { useProduct } from '../state/ProductContext'

export function ExecutivePage() {
  const { data } = useOps()
  const { metrics, state } = useProduct()
  const escalations = state.tasks.filter((task) => task.status === 'Blocked' || task.status === 'At Risk').slice(0, 4)
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Executive dashboard"
        title="Leadership operations view"
        description="Company health plus Operations Hub portfolio escalations — integrated HVCG workspace."
        action={<Link to="/portfolio">Open portfolio →</Link>}
      />
      <div className="metric-grid" data-testid="executive-metrics">
        {data.executiveMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
        <MetricCard metric={{ id: 'port-active', label: 'Portfolio active', value: String(metrics.activeProjects), detail: 'Ops Hub projects', tone: 'accent' }} />
        <MetricCard metric={{ id: 'port-block', label: 'Blocked / overdue', value: String(metrics.blocked + metrics.overdue), detail: 'Escalate now', tone: 'critical' }} />
      </div>
      <Section title="Executive escalations" subtitle="From Operations Hub command center">
        <ul className="item-list" data-testid="exec-escalations">
          {escalations.map((task) => (
            <li key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>
                  {task.assignee} · Next: {task.nextAction}
                </span>
              </div>
              <StatusPill label={task.status} tone={task.status === 'Blocked' ? 'critical' : 'warning'} />
            </li>
          ))}
        </ul>
      </Section>
      <div className="split-grid">
        <Section title="Quarterly focus" subtitle="Active objectives">
          <ul className="item-list">
            {data.quarterlyPlans.slice(0, 3).map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.objective}</strong>
                  <span>
                    {item.quarter} · {item.owner}
                  </span>
                </div>
                <StatusPill label={item.status} tone={item.status === 'On track' ? 'positive' : item.status === 'At risk' ? 'warning' : 'neutral'} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Company KPIs snapshot" subtitle="Trailing performance">
          <ul className="item-list">
            {data.companyKpis.slice(0, 4).map((kpi) => (
              <li key={kpi.id}>
                <div>
                  <strong>{kpi.name}</strong>
                  <span>
                    Target {kpi.target} · {kpi.period}
                  </span>
                </div>
                <StatusPill label={kpi.value} tone={kpi.tone} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}
