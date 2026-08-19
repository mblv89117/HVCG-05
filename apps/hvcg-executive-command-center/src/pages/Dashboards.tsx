import { Link } from 'react-router-dom'
import { useDashboard } from '../state/DashboardContext'
import { Badge, BarChart, Icon, LineChart, MetricCard, NotificationList, PageHeader, Progress, Section } from '../components/Dashboard'
import type { Metric, Tone } from '../types'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const healthTone = (health: string): Tone => health === 'Green' ? 'positive' : health === 'Yellow' ? 'warning' : 'critical'

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const { role } = useDashboard()
  return <div className="metric-grid">{metrics.filter((metric) => !metric.allowedRoles || metric.allowedRoles.includes(role)).map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>
}

export function OverviewPage() {
  const { data, visibleNotifications, markNotificationRead, role } = useDashboard()
  const now = new Date('2026-07-16T12:30:00-07:00')
  const greeting = now.getHours() < 12 ? 'Good morning' : 'Good afternoon'

  return (
    <>
      <PageHeader
        eyebrow="Thursday · July 16, 2026"
        title={`${greeting}, leadership`}
        description={`A single operating view across revenue, clients, finance, operations, and AI. Mock tenant: ${data.tenantName}.`}
        action={<button className="button button-secondary"><Icon name="calendar" /> Today</button>}
      />
      <MetricGrid metrics={data.overviewMetrics} />

      <div className="dashboard-grid overview-main">
        <Section title="AI daily brief" subtitle="Prepared from mock operating signals · 12:30 PM" className="ai-brief">
          <div className="brief-lead">
            <span className="brief-mark"><Icon name="ai" size={22} /></span>
            <div>
              <h3>Momentum is positive, with two owner-level exceptions.</h3>
              <p>Pipeline increased 12.4% and cash collections are tracking at 91% of plan. Summit Infrastructure is positioned to close, while Northstar’s valuation inputs and Cobalt’s overdue invoice require leadership attention today.</p>
            </div>
          </div>
          <div className="brief-actions">
            <div><span>01</span><p><strong>Approve pricing exception</strong> for Northstar before the 2:00 PM proposal review.</p></div>
            <div><span>02</span><p><strong>Assign Cobalt collections owner</strong> and confirm scope-change path.</p></div>
            <div><span>03</span><p><strong>Protect Summit close</strong> by finalizing term structure today.</p></div>
          </div>
          <Link className="text-link" to="/ai">Open AI command view <Icon name="arrow" size={15} /></Link>
        </Section>

        <Section title="Today" subtitle="Leadership schedule and commitments">
          <div className="timeline">
            <div><time>1:30</time><span><strong>Pipeline review</strong><small>Executive + Revenue</small></span></div>
            <div className="is-next"><time>2:00</time><span><strong>Summit term structure</strong><small>Client · Capital Advisory</small></span></div>
            <div><time>4:00</time><span><strong>Northstar valuation inputs</strong><small>Client · Exit Readiness</small></span></div>
            <div><time>5:15</time><span><strong>Operating closeout</strong><small>Internal · 20 minutes</small></span></div>
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
    </>
  )
}

export function RevenuePage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Revenue operating system" title="Revenue performance" description="Pipeline velocity, probability-weighted forecast, conversion health, and opportunity focus." action={<span className="data-chip">Mock data · refreshed 12:30 PM</span>} />
      <MetricGrid metrics={data.revenueMetrics} />
      <div className="dashboard-grid split-wide">
        <Section title="Revenue forecast" subtitle="Weighted forecast vs plan · next six months">
          <div className="legend"><span className="legend-primary">Weighted forecast</span><span className="legend-secondary">Plan</span></div>
          <LineChart data={data.revenueForecast} ariaLabel="Weighted revenue forecast and plan from July through December" />
        </Section>
        <Section title="Deals by stage" subtitle="Open pipeline value">
          <BarChart data={data.pipelineByStage} format="currency" ariaLabel="Open pipeline value by deal stage" />
        </Section>
      </div>
      <div className="dashboard-grid split">
        <Section title="Top opportunities" subtitle="Ranked by weighted value" className="table-panel">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Opportunity</th><th>Stage</th><th>Value</th><th>Weighted</th><th>Risk</th></tr></thead>
              <tbody>{data.opportunities.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.company}</strong><small>{item.service} · {item.owner}</small></td>
                  <td><Badge tone="accent">{item.stage}</Badge></td>
                  <td>{money(item.value)}</td><td>{money(item.weighted)}</td>
                  <td><Badge tone={item.risk === 'High' ? 'critical' : item.risk === 'Medium' ? 'warning' : 'positive'}>{item.risk}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Section>
        <Section title="Lead sources" subtitle="Qualified prospect share">
          <BarChart data={data.leadSources} format="percent" ariaLabel="Qualified prospects by lead source percentage" />
          <div className="insight-note"><strong>Primary growth lever</strong><p>Referral partners and the executive network account for 62% of qualified demand.</p></div>
        </Section>
      </div>
    </>
  )
}

export function ClientsPage() {
  const { data } = useDashboard()
  const openDocuments = data.clients.reduce((sum, client) => sum + client.documentsOutstanding, 0)
  const openTasks = data.clients.reduce((sum, client) => sum + client.openTasks, 0)
  return (
    <>
      <PageHeader eyebrow="Client operating view" title="Client portfolio" description="Engagement health, funding progress, document readiness, advisor assignments, and next actions." />
      <MetricGrid metrics={[
        { id: 'active-clients', label: 'Active clients', value: '24', detail: '5 shown in priority view', trend: '+2 QTD', trendDirection: 'up', tone: 'positive' },
        { id: 'engagement-health', label: 'Healthy engagements', value: '87.5%', detail: '21 green · 2 yellow · 1 red', trend: '+4.2 pts', trendDirection: 'up', tone: 'positive' },
        { id: 'docs-open', label: 'Documents outstanding', value: String(openDocuments), detail: 'Across priority clients', trend: '7 critical', trendDirection: 'down', tone: 'warning' },
        { id: 'tasks-open', label: 'Open tasks', value: String(openTasks), detail: '24 due this week', trend: '4 overdue', trendDirection: 'down', tone: 'warning' },
      ]} />
      <Section title="Priority client portfolio" subtitle="Sorted by health and next required action" className="table-panel">
        <div className="client-grid">
          {data.clients.map((client) => (
            <article className="client-card" key={client.id}>
              <div className="client-card-head">
                <span className={`client-monogram health-${client.health.toLowerCase()}`}>{client.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                <div><h3>{client.name}</h3><p>{client.code} · {client.engagement}</p></div>
                <Badge tone={healthTone(client.health)}>{client.health}</Badge>
              </div>
              <Progress value={client.fundingProgress} label="Funding progress" />
              <dl className="client-facts">
                <div><dt>Status</dt><dd>{client.engagementStatus}</dd></div>
                <div><dt>Advisor</dt><dd>{client.advisor}</dd></div>
                <div><dt>Documents</dt><dd>{client.documentsOutstanding} outstanding</dd></div>
                <div><dt>Open tasks</dt><dd>{client.openTasks}</dd></div>
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
  const portfolio = [
    { name: 'Operations Hub Command Center', owner: 'Manny Barela', status: 'In Progress', health: 'Green', next: 'Ship portfolio + approval workflows', due: '2026-07-25' },
    { name: 'Summit Infrastructure delivery', owner: 'Alex Rivera', status: 'At Risk', health: 'Yellow', next: 'Unblock valuation inputs', due: '2026-07-22' },
    { name: 'Cobalt scope change', owner: 'Jordan Lee', status: 'Blocked', health: 'Red', next: 'Owner commercial exception', due: '2026-07-18' },
    { name: 'Weekly ops cadence', owner: 'Casey Nguyen', status: 'On Track', health: 'Green', next: 'Publish Monday digest', due: '2026-09-30' },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Internal operations"
        title="Operating control plane"
        description="HVCG workspace operations command center — portfolio health, escalations, approvals, and agent posture. Deep workspace: Operations Hub Portfolio."
        action={<span className="data-chip">Integrated · Ops Hub portfolio</span>}
      />
      <MetricGrid metrics={[
        { id: 'projects', label: 'Active projects', value: '4', detail: '2 healthy · 1 watch · 1 blocked', trend: 'Portfolio live', trendDirection: 'up', tone: 'positive' },
        { id: 'overdue', label: 'Overdue work', value: '2', detail: 'Escalate owners', trend: 'Due-date gate', trendDirection: 'down', tone: 'critical' },
        { id: 'blocked', label: 'Blocked', value: '2', detail: 'Client input + commercial', trend: 'Needs decision', trendDirection: 'flat', tone: 'critical' },
        { id: 'approvals', label: 'Pending approvals', value: String(Math.max(approvals.length, 2)), detail: 'Ops Hub + executive gates', trend: 'Oldest 4h', trendDirection: 'flat', tone: 'warning' },
      ]} />

      <Section title="Executive portfolio" subtitle="Surfaced from Operations Hub · next action first" className="table-panel">
        <div className="table-wrap" data-testid="exec-ops-portfolio">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Health</th>
                <th>Due</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.owner}</td>
                  <td><Badge tone={row.status === 'Blocked' ? 'critical' : row.status === 'At Risk' ? 'warning' : row.status === 'On Track' ? 'positive' : 'accent'}>{row.status}</Badge></td>
                  <td><Badge tone={row.health === 'Green' ? 'positive' : row.health === 'Yellow' ? 'warning' : 'critical'}>{row.health}</Badge></td>
                  <td>{row.due}</td>
                  <td>{row.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="center-note">Open full workflows in Operations Hub → Portfolio (`/portfolio`): create/update projects, milestones, tasks, approvals, risks, issues, decisions, comments, and documents.</p>
      </Section>

      <div className="dashboard-grid split">
        <Section title="Escalations" subtitle="Overdue and blocked work">
          <div className="recommendation-list">
            <div className="risk-high"><span>Blocked</span><p><strong>Cobalt commercial exception</strong>Awaiting owner approve/reject.</p><small>Ops Hub · Approvals</small></div>
            <div className="risk-high"><span>Overdue</span><p><strong>Summit valuation inputs</strong>Client document chase past due.</p><small>Ops Hub · Blocked task</small></div>
            <div className="risk-medium"><span>Watch</span><p><strong>Approval UX gate</strong>Ops Hub approval workflow pending owner review.</p><small>Ops Hub · Awaiting Approval</small></div>
          </div>
        </Section>
        <Section title="Agent status" subtitle="Mock multi-agent operating state">
          <div className="agent-list">{data.agentStatuses.map((agent) => (
            <div key={agent.name}><span className={`status-light status-${agent.status.toLowerCase().replace(' ', '-')}`} /><p><strong>{agent.name}</strong><small>{agent.workstream}</small></p><span><Badge tone={agent.status === 'Blocked' ? 'critical' : agent.status === 'In progress' ? 'accent' : 'neutral'}>{agent.status}</Badge><small>{agent.heartbeat}</small></span></div>
          ))}</div>
        </Section>
      </div>
      <div className="dashboard-grid thirds">
        <Section title="System health" subtitle="Environment and service posture">
          <div className="health-list">
            <div><span>Development</span><strong>Healthy</strong><Badge tone="positive">Online</Badge></div>
            <div><span>Track 1</span><strong>Live—Internal</strong><Badge tone="neutral">Frozen</Badge></div>
            <div><span>Operations Hub</span><strong>Portfolio command center</strong><Badge tone="accent">Integrated</Badge></div>
            <div><span>Production changes</span><strong>None</strong><Badge tone="neutral">Protected</Badge></div>
          </div>
        </Section>
        <Section title="Current release" subtitle="Release candidate">
          <div className="release-card"><span>RC</span><div><strong>RC-1</strong><p>Locked development baseline</p></div></div>
          <dl className="stacked-facts"><div><dt>Track 1</dt><dd>Frozen</dd></div><div><dt>Production</dt><dd>Protected</dd></div><div><dt>Next gate</dt><dd>Owner / QA</dd></div></dl>
        </Section>
        <Section title="Integrations (approved posture)" subtitle="Mock · no live send">
          <div className="deployment-status"><Icon name="briefcase" size={28} /><strong>Notifications · Outlook · Teams · Automation</strong><p>Surfaced as architecture-ready hooks. Live client communications remain blocked until authorized.</p></div>
        </Section>
      </div>
    </>
  )
}

export function FinancialPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Financial command" title="Financial performance" description="Monthly revenue, recurring revenue, retainers, success fees, AR, expenses, cash, and forward outlook." action={<span className="data-chip">Mock data · finance roles only</span>} />
      <MetricGrid metrics={data.financialMetrics} />
      <div className="dashboard-grid split-wide">
        <Section title="Monthly revenue" subtitle="Recognized revenue · six-month trend">
          <LineChart data={data.monthlyRevenue} ariaLabel="Monthly recognized revenue from February through July" />
        </Section>
        <Section title="Expense mix" subtitle="Month-to-date operating expenses">
          <BarChart data={data.expenses} format="currency" ariaLabel="Operating expenses by category for the current month" />
        </Section>
      </div>
      <div className="dashboard-grid thirds">
        <Section title="Cash position" subtitle="Mock treasury view">
          <div className="cash-ring"><div><strong>$412K</strong><span>Operating cash</span></div></div>
          <dl className="stacked-facts"><div><dt>30-day inflow</dt><dd>$184K</dd></div><div><dt>30-day outflow</dt><dd>$147K</dd></div><div><dt>Net movement</dt><dd className="positive-text">+$37K</dd></div></dl>
        </Section>
        <Section title="AR aging" subtitle="$72.4K outstanding">
          <div className="aging-bars"><div><span>Current</span><i style={{ width: '58%' }} /><strong>$42.0K</strong></div><div><span>1–30 days</span><i style={{ width: '25%' }} /><strong>$18.2K</strong></div><div><span>31–60 days</span><i style={{ width: '12%' }} /><strong>$8.7K</strong></div><div><span>60+ days</span><i style={{ width: '5%' }} /><strong>$3.5K</strong></div></div>
        </Section>
        <Section title="Forecast confidence" subtitle="Next 90 days">
          <div className="confidence-score"><strong>82</strong><span>/ 100</span></div>
          <p className="center-note">Forecast confidence improved six points as Summit entered negotiation.</p>
          <Progress value={82} label="Confidence" />
        </Section>
      </div>
    </>
  )
}

export function AiPage() {
  return (
    <>
      <PageHeader eyebrow="AI intelligence" title="Executive intelligence" description="Daily summary, risk alerts, recommended actions, priority clients, at-risk deals, and owner work." action={<Badge tone="accent">Mock recommendations</Badge>} />
      <div className="ai-hero">
        <div className="ai-orb"><Icon name="ai" size={30} /></div>
        <div><p className="eyebrow">Daily executive summary</p><h2>Three actions can materially improve this week’s outcome.</h2><p>Protect the Summit close, unblock Northstar inputs, and resolve Cobalt’s commercial exception. Revenue momentum and client delivery remain healthy.</p></div>
        <span className="confidence-chip">89% confidence</span>
      </div>
      <div className="dashboard-grid split">
        <Section title="Risk alerts" subtitle="Ranked by materiality and urgency">
          <div className="recommendation-list">
            <div className="risk-high"><span>High</span><p><strong>Northstar deal at risk</strong>Missing valuation inputs may move expected close by 14 days.</p><small>Revenue · $510K</small></div>
            <div className="risk-medium"><span>Medium</span><p><strong>Cobalt collection risk</strong>Invoice is 14 days past due while scope change is pending.</p><small>Finance · $12.8K</small></div>
            <div className="risk-medium"><span>Medium</span><p><strong>Owner bandwidth</strong>Five leadership tasks are due today across three client accounts.</p><small>Operations</small></div>
          </div>
        </Section>
        <Section title="Recommended actions" subtitle="Human approval required">
          <ol className="action-list">
            <li><span>01</span><div><strong>Approve or revise Northstar exception</strong><p>Deadline today · estimated impact $18K</p><button className="button button-tertiary">Review decision</button></div></li>
            <li><span>02</span><div><strong>Confirm Summit term structure</strong><p>80% probability · $496K weighted</p><button className="button button-tertiary">Open opportunity</button></div></li>
            <li><span>03</span><div><strong>Assign Cobalt collections owner</strong><p>Past due 14 days · client health yellow</p><button className="button button-tertiary">Assign owner</button></div></li>
          </ol>
        </Section>
      </div>
      <div className="dashboard-grid thirds">
        <Section title="Priority clients" subtitle="AI focus list"><div className="rank-list"><p><b>1</b><span>Northstar Logistics<small>Revenue + delivery risk</small></span></p><p><b>2</b><span>Summit Infrastructure<small>Close protection</small></span></p><p><b>3</b><span>Cobalt Consumer<small>AR + scope risk</small></span></p></div></Section>
        <Section title="Deals at risk" subtitle="Weighted exposure"><strong className="large-value">$400.5K</strong><p className="muted">Two opportunities need action within 24 hours.</p><Progress value={29} label="Share of weighted forecast" /></Section>
        <Section title="Tasks requiring owner" subtitle="Current queue"><strong className="large-value">5</strong><p className="muted">2 approvals · 2 client decisions · 1 relationship follow-up</p><Link className="text-link" to="/notifications">Open owner queue <Icon name="arrow" size={15} /></Link></Section>
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
