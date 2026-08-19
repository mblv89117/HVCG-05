import { Link } from 'react-router-dom'
import { useDashboard } from '../state/DashboardContext'
import { Badge, BarChart, Icon, LineChart, MetricCard, NotificationList, PageHeader, Progress, Section } from '../components/Dashboard'
import { ModuleKnowledgeRail, knowledgeUserFromHost } from '../integrations/knowledge'
import type { Metric, Tone } from '../types'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const healthTone = (health: string): Tone => health === 'Green' ? 'positive' : health === 'Yellow' ? 'warning' : 'critical'

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const { role } = useDashboard()
  return <div className="metric-grid">{metrics.filter((metric) => !metric.allowedRoles || metric.allowedRoles.includes(role)).map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>
}

export function OverviewPage() {
  const { data, visibleNotifications, markNotificationRead, role } = useDashboard()
  const now = new Date('2026-07-19T19:00:00-07:00')
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const knowledgeUser = knowledgeUserFromHost({ role, organizationId: 'HVCG', assignedClients: ['CCB'] })

  return (
    <>
      <PageHeader
        eyebrow="Sunday · July 19, 2026"
        title={`${greeting}, leadership`}
        description={`Executive intelligence across Atlas-verified status and pending-safe KPIs. Unbound dollars show Awaiting verified source. Tenant: ${data.tenantName}.`}
        action={<Link className="button button-secondary" to="/intelligence"><Icon name="ai" /> Open Executive Brief</Link>}
      />
      <MetricGrid metrics={data.overviewMetrics} />

      <div className="dashboard-grid overview-main">
        <Section title="AI Executive Brief" subtitle="Grounded overview · generated 7:00 PM" className="ai-brief">
          <div className="brief-lead">
            <span className="brief-mark"><Icon name="ai" size={22} /></span>
            <div>
              <h3>Protect Track 1 freeze. Brief Colorado Craft Beef on verified facts only.</h3>
              <p>Atlas: Track 1 FROZEN · Revenue Phase 1 / Portal Sprint 1 / ECC Sprint 1 COMPLETE. Portfolio dollar KPIs remain Awaiting verified source. CCB Blueprint is meeting-ready without invented financial findings.</p>
            </div>
          </div>
          <div className="brief-actions">
            <div><span>01</span><p><strong>Run CCB meeting brief</strong> without inventing financial findings.</p></div>
            <div><span>02</span><p><strong>Reaffirm Track 1 freeze</strong> before any Production request.</p></div>
            <div><span>03</span><p><strong>Hand off to Elite UI</strong> for Executive Home merge sequencing.</p></div>
          </div>
          <Link className="text-link" to="/intelligence">Open full Executive Brief <Icon name="arrow" size={15} /></Link>
        </Section>

        <Section title="Today" subtitle="Leadership schedule and commitments">
          <div className="timeline">
            <div className="is-next"><time>2:00</time><span><strong>Colorado Craft Beef Blueprint</strong><small>Client · Capital Advisory · verified agenda</small></span></div>
            <div><time>5:00</time><span><strong>Elite UI merge coordination</strong><small>Master PM · Executive · Elite UI</small></span></div>
            <div><time>—</time><span><strong>Other meetings</strong><small>Awaiting verified source</small></span></div>
          </div>
        </Section>
      </div>

      <div className="dashboard-grid split">
        <Section title="Priority notifications" subtitle={`${visibleNotifications.filter((item) => !item.read).length} unread for ${role}`} action={<Link className="text-link" to="/notifications">View all</Link>}>
          <NotificationList notifications={visibleNotifications} onRead={markNotificationRead} limit={4} />
        </Section>
        <Section title="Recent activity" subtitle="Cross-system operating feed">
          <div className="activity-feed">
            {data.activities.map((activity) => (
              <div key={activity.id}>
                <span className="activity-avatar">{activity.actor.slice(0, 2).toUpperCase()}</span>
                <p><strong>{activity.actor}</strong> {activity.action} <b>{activity.subject}</b><small>{activity.domain} · {activity.timestamp}</small></p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <ModuleKnowledgeRail module="Executive" user={knowledgeUser} title="Executive intelligence knowledge" />
    </>
  )
}

export function RevenuePage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Revenue operating system" title="Revenue performance" description="Verified opportunity facts where available; unbound pipeline dollars show Awaiting verified source." action={<span className="data-chip">Pending-safe · refreshed 7:00 PM</span>} />
      <MetricGrid metrics={data.revenueMetrics} />
      <div className="dashboard-grid split-wide">
        <Section title="Revenue forecast" subtitle="Awaiting verified source until Revenue OS bind">
          <div className="legend"><span className="legend-primary">Weighted forecast</span><span className="legend-secondary">Plan</span></div>
          <LineChart data={data.revenueForecast} ariaLabel="Revenue forecast pending verified source" />
        </Section>
        <Section title="Deals by stage" subtitle="Open pipeline value">
          <BarChart data={data.pipelineByStage} format="currency" ariaLabel="Open pipeline value by deal stage" />
        </Section>
      </div>
      <div className="dashboard-grid split">
        <Section title="Top opportunities" subtitle="Verified opportunities only" className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Opportunity</th><th>Stage</th><th>Value</th><th>Weighted</th><th>Risk</th></tr></thead>
              <tbody>{data.opportunities.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.company}</strong><small>{item.service} · {item.owner}</small></td>
                  <td><Badge tone="accent">{item.stage}</Badge></td>
                  <td>{item.value === 0 ? 'Awaiting verified source' : money(item.value)}</td>
                  <td>{item.weighted === 0 ? 'Awaiting verified source' : money(item.weighted)}</td>
                  <td><Badge tone={item.risk === 'High' ? 'critical' : item.risk === 'Medium' ? 'warning' : 'positive'}>{item.risk}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Section>
        <Section title="Lead sources" subtitle="Verified attribution where known">
          <BarChart data={data.leadSources} format="percent" ariaLabel="Lead sources with verified CCB referral" />
          <div className="insight-note"><strong>Verified referral</strong><p>Colorado Craft Beef attribution: Randy Kamin — Generational Group. Other sources: Awaiting verified source.</p></div>
        </Section>
      </div>
    </>
  )
}

export function ClientsPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Client operating view" title="Client portfolio" description="Verified client workspaces only. Unbound portfolio rollups show Awaiting verified source." />
      <MetricGrid metrics={[
        { id: 'active-clients', label: 'Active clients', value: String(data.clients.length), detail: 'Verified workspace count in this module', tone: 'positive' },
        { id: 'engagement-health', label: 'Healthy engagements', value: 'Awaiting verified source', detail: 'Portfolio health rollup unbound', tone: 'warning' },
        { id: 'docs-open', label: 'Documents outstanding', value: 'Awaiting verified source', detail: 'Document room bind pending', tone: 'warning' },
        { id: 'tasks-open', label: 'Open tasks', value: 'Awaiting verified source', detail: 'Task system bind pending', tone: 'warning' },
      ]} />
      <Section title="Priority client portfolio" subtitle="Verified relationships only" className="table-panel">
        <div className="client-grid">
          {data.clients.map((client) => (
            <article className="client-card" key={client.id}>
              <div className="client-card-head">
                <span className={`client-monogram health-${client.health.toLowerCase()}`}>{client.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                <div><h3>{client.name}</h3><p>{client.code} · {client.engagement}</p></div>
                <Badge tone={healthTone(client.health)}>{client.health}</Badge>
              </div>
              <Progress value={client.fundingProgress} label="Funding progress (0 = awaiting verified package)" />
              <dl className="client-facts">
                <div><dt>Status</dt><dd>{client.engagementStatus}</dd></div>
                <div><dt>Advisor</dt><dd>{client.advisor}</dd></div>
                <div><dt>Documents</dt><dd>Awaiting verified source</dd></div>
                <div><dt>Open tasks</dt><dd>Awaiting verified source</dd></div>
              </dl>
              <div className="client-next"><span><Icon name="calendar" size={15} /> {client.nextMeeting}</span><p>{client.recentActivity}</p></div>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}

export function OperationsPage() {
  const { data, visibleNotifications } = useDashboard()
  const approvals = visibleNotifications.filter((item) => item.domain === 'Approvals')
  return (
    <>
      <PageHeader eyebrow="Internal operations" title="Operating control plane" description="Projects, agents, sprints, releases, QA, system health, deployments, and approvals." />
      <MetricGrid metrics={[
        { id: 'projects', label: 'Active projects', value: 'Awaiting verified source', detail: 'Ops Hub project rollup unbound', tone: 'warning' },
        { id: 'sprints', label: 'Active sprints', value: '1+', detail: 'Executive Intelligence integration readiness', tone: 'accent' },
        { id: 'qa', label: 'QA status', value: 'Pending merge QA', detail: 'Module QA passed · Elite UI merge QA gated', tone: 'accent' },
        { id: 'approvals', label: 'Pending approvals', value: String(approvals.length), detail: 'Role-filtered approval notifications', tone: approvals.length ? 'warning' : 'positive' },
      ]} />
      <div className="dashboard-grid split">
        <Section title="Agent status" subtitle="Integration coordination posture">
          <div className="agent-list">{data.agentStatuses.map((agent) => (
            <div key={agent.name}><span className={`status-light status-${agent.status.toLowerCase().replace(' ', '-')}`} /><p><strong>{agent.name}</strong><small>{agent.workstream}</small></p><span><Badge tone={agent.status === 'Blocked' ? 'critical' : agent.status === 'In progress' ? 'accent' : 'neutral'}>{agent.status}</Badge><small>{agent.heartbeat}</small></span></div>
          ))}</div>
        </Section>
        <Section title="System health" subtitle="Environment and service posture">
          <div className="health-list">
            <div><span>Development</span><strong>Healthy</strong><Badge tone="positive">Online</Badge></div>
            <div><span>Track 1</span><strong>Live—Internal</strong><Badge tone="neutral">Frozen</Badge></div>
            <div><span>Client Portal</span><strong>Sprint 1 complete</strong><Badge tone="positive">Ready</Badge></div>
            <div><span>Revenue OS</span><strong>Phase 1 complete</strong><Badge tone="positive">Ready</Badge></div>
            <div><span>Production changes</span><strong>None</strong><Badge tone="neutral">Protected</Badge></div>
          </div>
        </Section>
      </div>
      <div className="dashboard-grid thirds">
        <Section title="Current release" subtitle="Release candidate">
          <div className="release-card"><span>RC</span><div><strong>RC-1</strong><p>Locked development baseline</p></div></div>
          <dl className="stacked-facts"><div><dt>Track 1</dt><dd>Frozen</dd></div><div><dt>Production</dt><dd>Protected</dd></div><div><dt>Next gate</dt><dd>Elite UI merge</dd></div></dl>
        </Section>
        <Section title="Sprint status" subtitle="Authoritative phase state">
          <div className="sprint-list"><p><span>Revenue 1–4</span><Badge tone="positive">Complete</Badge></p><p><span>Portal Sprint 1</span><Badge tone="positive">Complete</Badge></p><p><span>Exec Intelligence 1</span><Badge tone="accent">Integration</Badge></p></div>
        </Section>
        <Section title="Deployments" subtitle="No live changes in this sprint">
          <div className="deployment-status"><Icon name="briefcase" size={28} /><strong>Protected mode</strong><p>No Production, Track 1, DNS, email, SMS, or live integrations from this module.</p></div>
        </Section>
      </div>
    </>
  )
}

export function FinancialPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Financial command" title="Financial performance" description="Finance tiles remain unbound until Finance Intelligence promotes verified sources. No invented dollars." action={<span className="data-chip">Awaiting verified source · finance roles only</span>} />
      <MetricGrid metrics={data.financialMetrics} />
      <div className="dashboard-grid split-wide">
        <Section title="Monthly revenue" subtitle="Awaiting verified source">
          <LineChart data={data.monthlyRevenue} ariaLabel="Monthly revenue pending verified source" />
        </Section>
        <Section title="Expense mix" subtitle="Awaiting verified source">
          <BarChart data={data.expenses} format="currency" ariaLabel="Operating expenses pending verified source" />
        </Section>
      </div>
      <div className="dashboard-grid thirds">
        <Section title="Cash position" subtitle="Treasury unbound">
          <div className="cash-ring"><div><strong>Awaiting verified source</strong><span>Operating cash</span></div></div>
          <dl className="stacked-facts"><div><dt>30-day inflow</dt><dd>Awaiting verified source</dd></div><div><dt>30-day outflow</dt><dd>Awaiting verified source</dd></div><div><dt>Net movement</dt><dd>Awaiting verified source</dd></div></dl>
        </Section>
        <Section title="AR aging" subtitle="Awaiting verified source">
          <div className="aging-bars"><div><span>Current</span><i style={{ width: '8%' }} /><strong>—</strong></div><div><span>1–30 days</span><i style={{ width: '8%' }} /><strong>—</strong></div><div><span>31–60 days</span><i style={{ width: '8%' }} /><strong>—</strong></div><div><span>60+ days</span><i style={{ width: '8%' }} /><strong>—</strong></div></div>
        </Section>
        <Section title="Forecast confidence" subtitle="Next 90 days">
          <div className="confidence-score"><strong>—</strong><span>/ 100</span></div>
          <p className="center-note">Forecast confidence Awaiting verified source until Revenue/Finance binds complete.</p>
          <Progress value={0} label="Confidence unbound" />
        </Section>
      </div>
    </>
  )
}

export function AiPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI queue"
        title="Labeled recommendations"
        description="Compact AI queue. Full Executive Brief with source transparency and decision/task workflows lives under Executive Brief."
        action={<Link className="button button-primary" to="/intelligence">Open Executive Brief</Link>}
      />
      <div className="ai-hero">
        <div className="ai-orb"><Icon name="ai" size={30} /></div>
        <div>
          <p className="eyebrow">Daily executive summary</p>
          <h2>Verified Atlas posture plus labeled portfolio recommendations.</h2>
          <p>Track 1 stays frozen. Brief Colorado Craft Beef without inventing financial findings. Keep portfolio KPIs labeled Awaiting verified source until Finance Intelligence bind.</p>
        </div>
        <span className="confidence-chip">Human review required</span>
      </div>
      <div className="dashboard-grid split">
        <Section title="Risk alerts" subtitle="Evidence kinds labeled">
          <div className="recommendation-list">
            <div className="risk-high"><span>Critical</span><p><strong>Track 1 freeze</strong>Verified Atlas: Production slice remains frozen.</p><small>Project Atlas · CURRENT_STATE</small></div>
            <div className="risk-high"><span>Critical</span><p><strong>CCB financial package pending</strong>Verified: no dollar KPIs until package received.</p><small>Client Portal · Capital readiness</small></div>
            <div className="risk-medium"><span>High</span><p><strong>Portfolio KPIs unbound</strong>Awaiting verified source until Finance/Revenue bind.</p><small>Pending verification</small></div>
          </div>
        </Section>
        <Section title="Recommended actions" subtitle="Escalate via Executive Brief">
          <ol className="action-list">
            <li><span>01</span><div><strong>Open CCB meeting brief</strong><p>Verified facts only</p><Link className="button button-tertiary" to="/intelligence/ccb">Open briefing</Link></div></li>
            <li><span>02</span><div><strong>Work priority decisions</strong><p>Accept / dismiss / convert with review history</p><Link className="button button-tertiary" to="/intelligence/decisions">Open decisions</Link></div></li>
            <li><span>03</span><div><strong>Scan exception board</strong><p>Overdue · client · revenue · capital · finance</p><Link className="button button-tertiary" to="/intelligence/exceptions">Open exceptions</Link></div></li>
          </ol>
        </Section>
      </div>
    </>
  )
}

export function NotificationsPage() {
  const { visibleNotifications, markNotificationRead, markAllRead, unreadCount, role } = useDashboard()
  const domains = ['Revenue', 'Portal', 'Finance', 'CRM', 'Operations', 'Approvals']
  return (
    <>
      <PageHeader eyebrow="Unified notification center" title="Notifications" description={`Cross-system alerts filtered for the ${role} role.`} action={<button className="button button-secondary" onClick={markAllRead}>Mark all read</button>} />
      <div className="notification-summary">
        <div><strong data-testid="notification-unread-count">{unreadCount}</strong><span>Unread</span></div>
        {domains.map((domain) => <div key={domain}><strong>{visibleNotifications.filter((item) => item.domain === domain).length}</strong><span>{domain}</span></div>)}
      </div>
      <Section title="All notifications" subtitle="Select an item to mark it read">
        <NotificationList notifications={visibleNotifications} onRead={markNotificationRead} />
      </Section>
    </>
  )
}
