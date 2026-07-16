import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileCheck2,
  GitBranch,
  Shield,
  ShieldAlert,
} from 'lucide-react'
import { Badge, EmptyState, MetricCard, PageHeader, Panel, Progress, TextLink } from '../components/UI'
import { agents, approvals, auditLog, permissions, policies, prompts, risks, totalBudget, totalSpend } from '../data/mockData'
import { useGovernance } from '../state/GovernanceContext'
import type { AgentStatus, PermissionLevel, PromptStatus } from '../types'

const currency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const compact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const agentName = (id: string) => agents.find((agent) => agent.id === id)?.name ?? id

export function OverviewPage() {
  const online = agents.filter((agent) => ['Online', 'Running'].includes(agent.status)).length
  const attention = agents.filter((agent) => ['At Risk', 'Critical'].includes(agent.health)).length
  const pending = approvals.filter((item) => item.status === 'Pending' || item.status === 'Escalated').length
  const openRisks = risks.filter((item) => item.status === 'Open').length

  return (
    <>
      <PageHeader eyebrow="Control plane" title="AI Governance Overview" description="Executive visibility into every AI agent, prompt, permission, cost, risk, and approval across HVCG." action={<span className="data-chip"><Shield size={13} /> Mock snapshot · 16 Jul 2026</span>} />
      <div className="metric-grid">
        <MetricCard label="Registered agents" value={agents.length} detail={`${online} online or running`} tone="positive" />
        <MetricCard label="Pending approvals" value={pending} detail="Owner and Master PM gates" tone="warning" />
        <MetricCard label="Open risks" value={openRisks} detail={`${attention} agents need attention`} tone="critical" />
        <MetricCard label="Sprint spend" value={currency(totalSpend)} detail={`${Math.round((totalSpend / totalBudget) * 100)}% of mock budget`} tone="accent" />
      </div>

      <div className="dashboard-grid overview-main">
        <Panel title="Agent operating state" subtitle="Current status and health across the internal AI workforce">
          <div className="agent-summary-list">
            {agents.map((agent) => (
              <Link to={`/agents/${agent.id}`} key={agent.id} className="agent-summary-row">
                <span className={`agent-avatar health-${agent.health.toLowerCase().replace(/\s+/g, '-')}`}>{agent.initials}</span>
                <span className="agent-copy">
                  <strong>{agent.name}</strong>
                  <small>{agent.currentTask}</small>
                </span>
                <Badge>{agent.status}</Badge>
                <Badge>{agent.health}</Badge>
                <TextLink>Inspect</TextLink>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Owner attention" subtitle="Highest-priority approvals and compliance findings">
          <div className="attention-list">
            {approvals.filter((item) => item.status !== 'Approved').slice(0, 4).map((item) => (
              <Link to="/approvals" key={item.id} className="attention-row">
                <span className={`risk-dot risk-${item.risk.toLowerCase()}`} />
                <div><strong>{item.title}</strong><small>{item.type} · {item.requestedAt}</small></div>
                <Badge>{item.risk}</Badge>
              </Link>
            ))}
          </div>
          <Link className="panel-link" to="/approvals">Review all approvals <span>→</span></Link>
        </Panel>
      </div>

      <div className="dashboard-grid thirds">
        <Panel title="Health signals" subtitle="Exceptions, not noise">
          <div className="signal-list">
            <span><CheckCircle2 size={15} /> <b>{agents.filter((a) => a.qaStatus === 'Pass').length}</b> QA passing</span>
            <span><Clock3 size={15} /> <b>{agents.filter((a) => a.status === 'Stale').length}</b> stale heartbeat</span>
            <span><GitBranch size={15} /> <b>{agents.reduce((n, a) => n + a.healthMetrics.branchDriftCommits, 0)}</b> drift commits</span>
          </div>
        </Panel>
        <Panel title="Prompt posture" subtitle="Promotion lifecycle">
          <div className="prompt-posture">
            {(['Approved', 'Review', 'Draft', 'Deprecated', 'Replaced'] as PromptStatus[]).map((status) => (
              <div key={status}><span>{status}</span><strong>{prompts.filter((prompt) => prompt.status === status).length}</strong></div>
            ))}
          </div>
        </Panel>
        <Panel title="Policy posture" subtitle="Human authority remains explicit">
          <p className="policy-callout">Production, merge, deployment, and external actions are human-gated by default.</p>
          <Link className="panel-link" to="/policies">View {policies.length} governance policies <span>→</span></Link>
        </Panel>
      </div>
    </>
  )
}

export function AgentsPage() {
  const [status, setStatus] = useState<'All' | AgentStatus>('All')
  const filtered = status === 'All' ? agents : agents.filter((agent) => agent.status === status)
  return (
    <>
      <PageHeader eyebrow="Registry" title="Agent Registry" description="Authoritative operational inventory of HVCG AI engineering roles, ownership, worktrees, and active assignments." />
      <div className="filter-row" role="group" aria-label="Agent status filters">
        {(['All', 'Online', 'Running', 'Blocked', 'Awaiting Approval', 'Stale', 'Complete'] as const).map((item) => (
          <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>
        ))}
      </div>
      <div className="registry-grid">
        {filtered.map((agent) => (
          <Link to={`/agents/${agent.id}`} key={agent.id} className="agent-card">
            <div className="agent-card-head">
              <span className={`agent-avatar health-${agent.health.toLowerCase().replace(/\s+/g, '-')}`}>{agent.initials}</span>
              <div><h2>{agent.name}</h2><p>{agent.role}</p></div>
              <Badge>{agent.status}</Badge>
            </div>
            <p className="ownership">{agent.ownership}</p>
            <dl className="facts">
              <div><dt>Branch</dt><dd>{agent.branch}</dd></div>
              <div><dt>Sprint</dt><dd>{agent.sprint}</dd></div>
              <div><dt>Health</dt><dd><Badge>{agent.health}</Badge></dd></div>
              <div><dt>Last activity</dt><dd>{agent.lastActivity}</dd></div>
            </dl>
            <div className="current-task"><span>Current task</span><strong>{agent.currentTask}</strong></div>
          </Link>
        ))}
      </div>
    </>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams()
  const agent = agents.find((item) => item.id === agentId)
  if (!agent) return <Navigate to="/agents" replace />
  const agentPermissions = permissions.filter((item) => item.agentId === agent.id)
  const agentAudit = auditLog.filter((item) => item.agentId === agent.id)
  return (
    <>
      <Link to="/agents" className="back-link"><ArrowLeft size={14} /> Back to registry</Link>
      <PageHeader eyebrow={`${agent.id} · ${agent.sprint}`} title={agent.name} description={agent.ownership} action={<div className="detail-badges"><Badge>{agent.status}</Badge><Badge>{agent.health}</Badge><Badge>{agent.risk} risk</Badge></div>} />
      <div className="metric-grid">
        <MetricCard label="Prompt" value={agent.promptVersion} detail={agent.model} tone="accent" />
        <MetricCard label="QA status" value={agent.qaStatus} detail={`${agent.healthMetrics.failedTasks} failed tasks`} tone={agent.qaStatus === 'Pass' ? 'positive' : 'warning'} />
        <MetricCard label="Sprint cost" value={currency(agent.cost.spend)} detail={`${Math.round((agent.cost.spend / agent.cost.budget) * 100)}% of budget`} tone="warning" />
        <MetricCard label="Risk" value={agent.risk} detail={`${agent.blockers.length} open blockers`} tone={agent.risk === 'Low' ? 'positive' : 'critical'} />
      </div>
      <div className="dashboard-grid split">
        <Panel title="Responsibilities & ownership">
          <div className="detail-list"><h3>Responsibilities</h3>{agent.responsibilities.map((item) => <p key={item}>• {item}</p>)}</div>
          <div className="path-block"><h3>Owned paths</h3>{agent.ownedPaths.map((path) => <code key={path}>{path}</code>)}</div>
          <div className="path-block protected"><h3>Protected paths</h3>{agent.protectedPaths.map((path) => <code key={path}>{path}</code>)}</div>
        </Panel>
        <Panel title="Health telemetry" subtitle="Mock operational signals">
          <div className="telemetry">
            <div><span>Heartbeat</span><strong>{agent.healthMetrics.lastHeartbeatMinutes}m</strong><Progress value={Math.max(0, 100 - agent.healthMetrics.lastHeartbeatMinutes)} /></div>
            <div><span>Context usage</span><strong>{agent.healthMetrics.contextUsagePercent}%</strong><Progress value={agent.healthMetrics.contextUsagePercent} /></div>
            <div><span>Branch drift</span><strong>{agent.healthMetrics.branchDriftCommits} commits</strong><Progress value={agent.healthMetrics.branchDriftCommits} max={8} /></div>
            <div><span>Uncommitted work</span><strong>{agent.healthMetrics.uncommittedFiles} files</strong><Progress value={agent.healthMetrics.uncommittedFiles} max={15} /></div>
          </div>
          <div className="mini-grid">
            <span>Documentation <Badge>{agent.healthMetrics.documentationStatus}</Badge></span>
            <span>QA <Badge>{agent.healthMetrics.qaStatus}</Badge></span>
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid thirds">
        <Panel title="Tools & permission">
          <div className="tag-list">{agent.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
          <p className="permission-callout">Baseline level <Badge>{agent.permissionLevel}</Badge></p>
          <div className="compact-permissions">{agentPermissions.filter((p) => p.level !== 'None').map((p) => <div key={p.resource}><span>{p.resource}</span><Badge>{p.level}</Badge></div>)}</div>
        </Panel>
        <Panel title="Recent activity">
          <div className="activity-list">{agent.recentActivity.map((item, i) => <p key={item}><span>{i + 1}</span>{item}</p>)}</div>
          {agentAudit.map((entry) => <p className="audit-mini" key={entry.id}><small>{entry.timestamp}</small>{entry.action} · {entry.evidence}</p>)}
        </Panel>
        <Panel title="Handoffs & blockers">
          {agent.blockers.length ? agent.blockers.map((item) => <p className="blocker" key={item}><AlertTriangle size={14} /> {item}</p>) : <EmptyState>No open blockers</EmptyState>}
          <h3>Recent handoffs</h3>
          {agent.recentHandoffs.length ? agent.recentHandoffs.map((item) => <p key={item} className="handoff"><FileCheck2 size={14} /> {item}</p>) : <p className="muted">No recent handoffs.</p>}
        </Panel>
      </div>
    </>
  )
}

export function PromptsPage() {
  const { canEditPrompts } = useGovernance()
  const [filter, setFilter] = useState<'All' | PromptStatus>('All')
  const visible = filter === 'All' ? prompts : prompts.filter((prompt) => prompt.status === filter)
  return (
    <>
      <PageHeader eyebrow="Configuration control" title="Prompt Registry" description="Versioned system prompts with approval, change, and rollback lineage." action={<button className="button button-primary" disabled={!canEditPrompts}>New prompt version</button>} />
      <div className="filter-row">{(['All', 'Draft', 'Review', 'Approved', 'Deprecated', 'Replaced'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <Panel title="Prompt versions" subtitle={`${visible.length} records · immutable version history`}>
        <div className="table-wrap"><table><thead><tr><th>Prompt</th><th>Agent</th><th>Version</th><th>Status</th><th>Updated</th><th>Approved by</th><th>Rollback</th></tr></thead>
          <tbody>{visible.map((prompt) => <tr key={prompt.id}><td><strong>{prompt.name}</strong><small>{prompt.id}</small></td><td>{agentName(prompt.agentId)}</td><td><code>{prompt.version}</code></td><td><Badge>{prompt.status}</Badge></td><td>{prompt.updatedDate}<small>{prompt.changeSummary}</small></td><td>{prompt.approvedBy}</td><td>{prompt.rollbackVersion}</td></tr>)}</tbody></table></div>
      </Panel>
    </>
  )
}

export function PermissionsPage() {
  const [resource, setResource] = useState('All')
  const resources = [...new Set(permissions.map((item) => item.resource))]
  const visible = resource === 'All' ? permissions : permissions.filter((item) => item.resource === resource)
  const byAgent = agents.map((agent) => ({ agent, permissions: visible.filter((item) => item.agentId === agent.id) }))
  return (
    <>
      <PageHeader eyebrow="Least privilege" title="Tool & Permission Matrix" description="Environment-aware access controls. Production, deployment, client, and financial access are explicitly gated." />
      <label className="select-control">Resource <select value={resource} onChange={(event) => setResource(event.target.value)}><option>All</option>{resources.map((item) => <option key={item}>{item}</option>)}</select></label>
      <Panel title="Permission matrix" subtitle="Mock policy snapshot — no live IAM changes">
        <div className="permission-matrix">
          {byAgent.map(({ agent, permissions: rows }) => <div className="permission-agent" key={agent.id}><div><span className="agent-avatar small">{agent.initials}</span><strong>{agent.name}</strong></div><div className="permission-chips">{rows.map((item) => <span key={item.resource}><small>{item.resource}</small><Badge>{item.level}</Badge></span>)}</div></div>)}
        </div>
      </Panel>
    </>
  )
}

export function HealthPage() {
  const statuses = ['Online', 'Idle', 'Running', 'Blocked', 'Awaiting Approval', 'Stale', 'Failed', 'Complete'] as AgentStatus[]
  return (
    <>
      <PageHeader eyebrow="Operational health" title="Agent Health Dashboard" description="Heartbeat, context, failures, blockers, branch hygiene, documentation, and QA in one executive view." />
      <div className="status-strip">{statuses.map((status) => <div key={status}><i className={`status-${status.toLowerCase().replace(/\s+/g, '-')}`} /><span>{status}</span><strong>{agents.filter((agent) => agent.status === status).length}</strong></div>)}</div>
      <Panel title="Health telemetry" subtitle="Thresholds: heartbeat >30m, context >80%, any QA failure, or branch drift >2">
        <div className="table-wrap"><table><thead><tr><th>Agent</th><th>Heartbeat</th><th>Context</th><th>Failed</th><th>Blockers</th><th>Uncommitted</th><th>Drift</th><th>Docs</th><th>QA</th></tr></thead>
          <tbody>{agents.map((agent) => <tr key={agent.id}><td><Link to={`/agents/${agent.id}`}><strong>{agent.name}</strong></Link><Badge>{agent.health}</Badge></td><td>{agent.healthMetrics.lastHeartbeatMinutes}m</td><td><Progress value={agent.healthMetrics.contextUsagePercent} label={`${agent.name} context`} /><small>{agent.healthMetrics.contextUsagePercent}%</small></td><td>{agent.healthMetrics.failedTasks}</td><td>{agent.healthMetrics.openBlockers}</td><td>{agent.healthMetrics.uncommittedFiles}</td><td>{agent.healthMetrics.branchDriftCommits}</td><td><Badge>{agent.healthMetrics.documentationStatus}</Badge></td><td><Badge>{agent.healthMetrics.qaStatus}</Badge></td></tr>)}</tbody></table></div>
      </Panel>
    </>
  )
}

export function CostsPage() {
  const { canViewCosts } = useGovernance()
  if (!canViewCosts) return <RestrictedPage title="Cost & Usage" />
  const totalTokens = agents.reduce((sum, agent) => sum + agent.cost.tokens, 0)
  const tasks = agents.reduce((sum, agent) => sum + agent.cost.tasksCompleted, 0)
  const forecast = agents.reduce((sum, agent) => sum + agent.cost.monthlyForecast, 0)
  return (
    <>
      <PageHeader eyebrow="Mock financial controls" title="Cost & Usage Dashboard" description="No live billing connection. Metrics demonstrate budget thresholds, efficiency, and forecast governance." />
      <div className="metric-grid"><MetricCard label="Sprint spend" value={currency(totalSpend)} detail={`${Math.round((totalSpend / totalBudget) * 100)}% of ${currency(totalBudget)}`} tone="warning" /><MetricCard label="Tokens used" value={compact(totalTokens)} detail="Across all mock agents" tone="accent" /><MetricCard label="Tasks completed" value={tasks} detail={`${currency(totalSpend / tasks)} per task`} tone="positive" /><MetricCard label="Monthly forecast" value={currency(forecast)} detail="Modeled, not billed" tone="neutral" /></div>
      <div className="dashboard-grid split-wide">
        <Panel title="Cost by agent" subtitle="Spend against sprint budget">
          <div className="cost-bars">{agents.slice().sort((a, b) => b.cost.spend - a.cost.spend).map((agent) => <div key={agent.id}><span>{agent.name}</span><div><Progress value={agent.cost.spend} max={agent.cost.budget} /><small>{currency(agent.cost.spend)} / {currency(agent.cost.budget)}</small></div></div>)}</div>
        </Panel>
        <Panel title="Budget alerts" subtitle="80% warn · 100% escalate">
          {agents.filter((agent) => agent.cost.monthlyForecast / agent.cost.budget >= .8).map((agent) => <div className="budget-alert" key={agent.id}><AlertTriangle size={16} /><div><strong>{agent.name}</strong><small>Forecast {Math.round((agent.cost.monthlyForecast / agent.cost.budget) * 100)}% of budget</small></div><Badge>{agent.cost.monthlyForecast > agent.cost.budget ? 'High' : 'Medium'}</Badge></div>)}
        </Panel>
      </div>
      <Panel title="Usage detail">
        <div className="table-wrap"><table><thead><tr><th>Agent</th><th>Model</th><th>Tokens</th><th>Runtime</th><th>Tasks</th><th>Cost/task</th><th>Forecast</th></tr></thead><tbody>{agents.map((agent) => <tr key={agent.id}><td><strong>{agent.name}</strong></td><td>{agent.cost.model}</td><td>{compact(agent.cost.tokens)}</td><td>{agent.cost.runtimeMinutes}m</td><td>{agent.cost.tasksCompleted}</td><td>{currency(agent.cost.spend / agent.cost.tasksCompleted)}</td><td>{currency(agent.cost.monthlyForecast)}</td></tr>)}</tbody></table></div>
      </Panel>
    </>
  )
}

export function AuditPage() {
  const [result, setResult] = useState('All')
  const visible = result === 'All' ? auditLog : auditLog.filter((entry) => entry.result === result)
  return (
    <>
      <PageHeader eyebrow="Evidence trail" title="Audit Log" description="Append-only mock events for prompt, branch, worktree, file, test, approval, push, merge, deployment, permission, and owner actions." />
      <div className="filter-row">{['All', 'Success', 'Pending', 'Warning', 'Denied'].map((item) => <button key={item} className={result === item ? 'active' : ''} onClick={() => setResult(item)}>{item}</button>)}</div>
      <Panel title="Governance events" subtitle={`${visible.length} retained evidence records`}>
        <div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Agent</th><th>Action</th><th>Target</th><th>Result</th><th>Risk</th><th>Approval</th><th>Evidence</th></tr></thead><tbody>{visible.map((entry) => <tr key={entry.id}><td>{entry.timestamp}<small>{entry.id}</small></td><td>{agentName(entry.agentId)}</td><td><strong>{entry.action}</strong></td><td>{entry.target}</td><td><Badge>{entry.result}</Badge></td><td><Badge>{entry.risk}</Badge></td><td><Badge>{entry.approvalStatus}</Badge></td><td><code>{entry.evidence}</code></td></tr>)}</tbody></table></div>
      </Panel>
    </>
  )
}

export function ApprovalsPage() {
  const { canApprove, role } = useGovernance()
  return (
    <>
      <PageHeader eyebrow="Human control" title="Approval Queue" description="No AI agent may self-approve commits, pushes, merges, deployment, Production, prompt promotion, activation, or cost exceptions." action={<span className="data-chip">{role} · {canApprove ? 'Decision authority' : 'Read only'}</span>} />
      <div className="approval-grid">{approvals.map((item) => <article className="approval-card" key={item.id}><div className="approval-head"><Badge>{item.type}</Badge><Badge>{item.risk}</Badge></div><h2>{item.title}</h2><p>{item.context}</p><dl><div><dt>Requested by</dt><dd>{agentName(item.agentId)}</dd></div><div><dt>Approver</dt><dd>{item.owner}</dd></div><div><dt>Requested</dt><dd>{item.requestedAt}</dd></div><div><dt>Status</dt><dd><Badge>{item.status}</Badge></dd></div></dl>{item.status === 'Pending' && <div className="approval-actions"><button disabled={!canApprove} className="button button-primary">Approve</button><button disabled={!canApprove} className="button button-secondary">Reject</button></div>}</article>)}</div>
    </>
  )
}

export function RisksPage() {
  const open = risks.filter((risk) => risk.status === 'Open')
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Risk & Compliance Dashboard" description="Detect unsafe access, missing evidence, stale configuration, collisions, cost exceptions, and approval gaps." />
      <div className="metric-grid"><MetricCard label="Open findings" value={open.length} detail="Require remediation or acceptance" tone="critical" /><MetricCard label="Critical" value={open.filter((risk) => risk.severity === 'Critical').length} detail="Immediate owner attention" tone="critical" /><MetricCard label="Mitigated" value={risks.filter((risk) => risk.status === 'Mitigated').length} detail="Evidence retained" tone="positive" /><MetricCard label="Control coverage" value="11/11" detail="Required categories modeled" tone="accent" /></div>
      <div className="risk-grid">{risks.map((risk) => <article className="risk-card" key={risk.id}><div><span className={`risk-icon risk-${risk.severity.toLowerCase()}`}><ShieldAlert size={16} /></span><div><h2>{risk.category}</h2><p>{agentName(risk.agentId)} · {risk.detectedAt}</p></div><Badge>{risk.severity}</Badge></div><p><strong>Evidence</strong>{risk.evidence}</p><p><strong>Remediation</strong>{risk.remediation}</p><footer><code>{risk.id}</code><Badge>{risk.status}</Badge></footer></article>)}</div>
    </>
  )
}

export function PoliciesPage() {
  const [active, setActive] = useState(policies[0].id)
  const policy = useMemo(() => policies.find((item) => item.id === active) ?? policies[0], [active])
  return (
    <>
      <PageHeader eyebrow="Operating rules" title="AI Governance Policies" description="Readable, owner-aligned controls for agent lifecycle, prompts, permissions, cost, approvals, audit, incidents, and retirement." />
      <div className="policy-layout"><nav className="policy-nav" aria-label="Policy pages">{policies.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => setActive(item.id)}><span>{item.id}</span>{item.title}</button>)}</nav><Panel title={policy.title} subtitle={`${policy.id} · Owner: ${policy.owner}`} className="policy-detail"><p className="policy-summary">{policy.summary}</p><h3>Required controls</h3><ol>{policy.controls.map((control) => <li key={control}>{control}</li>)}</ol><div className="policy-meta"><span>Last reviewed</span><strong>{policy.lastReviewed}</strong><Badge>Active</Badge></div></Panel></div>
    </>
  )
}

function RestrictedPage({ title }: { title: string }) {
  return <div className="restricted"><DollarSign size={28} /><h1>{title} restricted</h1><p>Auditor role cannot view cost details. Switch to Owner or Governance Admin.</p></div>
}
