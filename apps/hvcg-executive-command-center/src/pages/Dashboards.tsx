import { Link } from 'react-router-dom'
import { Badge, MetricCard, PageHeader, Section, SourceBadge } from '../components/Dashboard'
import { useDashboard } from '../state/DashboardContext'
import type { Health, Tone } from '../types'

const healthTone = (health: Health): Tone => health === 'GREEN' ? 'positive' : health === 'YELLOW' ? 'warning' : 'critical'
const riskTone = (risk: string): Tone => risk === 'Critical' || risk === 'High' ? 'critical' : risk === 'Medium' ? 'warning' : 'neutral'

function EvidenceList({ items }: { items: { id: string; text: string; source: Parameters<typeof SourceBadge>[0]['source'] }[] }) {
  return <div className="evidence-list">{items.map((item) => <div key={item.id}><p>{item.text}</p><SourceBadge source={item.source} /></div>)}</div>
}

export function OverviewPage() {
  const { data, approvals } = useDashboard()
  const pending = approvals.filter((item) => item.state === 'Pending')
  return (
    <>
      <PageHeader
        eyebrow="Atlas CEO Command Center"
        title="Good morning, Manny"
        description="One Development/UAT view of decisions, exceptions, Revenue, clients, engineering, and Production protection."
        action={<Link className="button button-secondary" to="/brief">Open morning brief</Link>}
      />
      <div className="source-legend" aria-label="Data source legend">
        {data.sources.map((source) => <SourceBadge key={`${source.kind}-${source.label}`} source={source} />)}
      </div>
      <div className="health-grid">
        {data.health.map((item) => (
          <article className={`health-card health-${item.health.toLowerCase()}`} key={item.id}>
            <div><span>{item.label}</span><Badge tone={healthTone(item.health)}>{item.health}</Badge></div>
            <p>{item.summary}</p>
            <SourceBadge source={item.source} />
          </article>
        ))}
      </div>
      <div className="dashboard-grid split">
        <Section title="Pending owner decisions" subtitle={`${pending.length} item(s) need review`} action={<Link className="text-link" to="/approvals">Open inbox</Link>}>
          <div className="decision-list">{pending.map((item) => <article key={item.id}><div><strong>{item.title}</strong><Badge tone={riskTone(item.risk)}>{item.risk} risk</Badge></div><p>{item.requestedAction}</p><SourceBadge source={item.source} /></article>)}</div>
        </Section>
        <Section title="Today's highest-priority actions" subtitle="Evidence-based; no action executes automatically">
          <EvidenceList items={data.actions} />
        </Section>
      </div>
      <div className="dashboard-grid split">
        <Section title="Open risks" subtitle="Exceptions requiring awareness"><EvidenceList items={data.risks} /></Section>
        <Section title="Current blockers" subtitle="Missing or gated inputs"><EvidenceList items={data.blockers} /></Section>
      </div>
    </>
  )
}

export function ApprovalsPage() {
  const { approvals, updateApproval, actionNotice } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Owner approval inbox" title="Decisions waiting for Manny" description="Centralized review queue. Buttons are local Development placeholders and cannot execute a live action." />
      {actionNotice && <div className="safe-action-notice" role="status">{actionNotice}</div>}
      <div className="approval-grid">
        {approvals.map((item) => (
          <article className="approval-card" key={item.id}>
            <div className="approval-head"><div><small>{item.category} · {item.id}</small><h2>{item.title}</h2></div><Badge tone={item.state === 'Pending' ? 'warning' : 'neutral'}>{item.state}</Badge></div>
            <dl className="approval-facts">
              <div><dt>Business reason</dt><dd>{item.businessReason}</dd></div>
              <div><dt>Requested action</dt><dd>{item.requestedAction}</dd></div>
              <div><dt>Requesting agent/module</dt><dd>{item.requester}</dd></div>
              <div><dt>Risk</dt><dd><Badge tone={riskTone(item.risk)}>{item.risk}</Badge></dd></div>
              <div><dt>Impact</dt><dd>{item.impact}</dd></div>
              <div><dt>Affected track</dt><dd>{item.track}</dd></div>
              <div><dt>Environment</dt><dd>{item.environment}</dd></div>
              <div><dt>QA status</dt><dd>{item.qaStatus}</dd></div>
              <div><dt>Recommended decision</dt><dd>{item.recommendation}</dd></div>
            </dl>
            <SourceBadge source={item.source} />
            <div className="placeholder-actions">
              <button onClick={() => updateApproval(item.id, 'Approved locally')}>Approve placeholder</button>
              <button onClick={() => updateApproval(item.id, 'Rejected locally')}>Reject placeholder</button>
              <button onClick={() => updateApproval(item.id, 'Changes requested locally')}>Request changes placeholder</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

export function AgentPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Agent control center" title="Agent assignments and gates" description="Status visibility only. Launch, stop, and reassignment controls are not enabled." action={<Badge tone="neutral">No autonomous execution</Badge>} />
      <Section title="Active agent registry" subtitle="Repository-derived assignments and preserved workstreams" className="table-panel">
        <div className="table-wrap"><table>
          <thead><tr><th>Agent / role</th><th>Assignment</th><th>Status</th><th>Branch / worktree</th><th>Blocker / QA</th><th>Owner / next action</th><th>Source</th></tr></thead>
          <tbody>{data.agents.map((agent) => <tr key={agent.id}>
            <td><strong>{agent.name}</strong><small>{agent.role}</small></td>
            <td>{agent.track}<small>{agent.sprint}</small></td>
            <td><Badge tone={agent.status === 'Blocked' ? 'critical' : agent.status === 'Working' ? 'accent' : agent.status === 'Complete' ? 'positive' : 'neutral'}>{agent.status}</Badge><small>{agent.lastUpdate}</small></td>
            <td>{agent.branch}<small>{agent.worktree}</small></td>
            <td>{agent.blocker}<small>QA: {agent.qaStatus}</small></td>
            <td>{agent.ownerDecision}<small>{agent.nextAction}</small></td>
            <td><SourceBadge source={agent.source} /></td>
          </tr>)}</tbody>
        </table></div>
      </Section>
    </>
  )
}

export function PortfolioPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Atlas portfolio" title="Every operating-system track" description="Project Atlas is the source of truth. Technical detail is available here without cluttering Executive Home." />
      <div className="track-grid">{data.tracks.map((track) => (
        <article className="track-card" key={track.number} data-testid="track-card">
          <div className="track-head"><span>Track {track.number}</span><Badge tone={track.number === 1 ? 'neutral' : track.status.includes('COMPLETE') ? 'positive' : track.status.includes('ACTIVE') ? 'accent' : 'warning'}>{track.status}</Badge></div>
          <h2>{track.name}</h2>
          <dl>
            <div><dt>Owner</dt><dd>{track.owner}</dd></div><div><dt>Current sprint</dt><dd>{track.sprint}</dd></div>
            <div><dt>Environment</dt><dd>{track.environment}</dd></div><div><dt>Branch</dt><dd>{track.branch}</dd></div>
            <div><dt>QA / deployment</dt><dd>{track.qa} · {track.deployment}</dd></div><div><dt>Risks / blockers</dt><dd>{track.risks} · {track.blockers}</dd></div>
            <div><dt>Technical debt</dt><dd>{track.technicalDebt}</dd></div><div><dt>Owner decision</dt><dd>{track.pendingDecisions}</dd></div>
            <div><dt>Next action</dt><dd>{track.nextAction}</dd></div>
          </dl>
          <SourceBadge source={track.source} />
        </article>
      ))}</div>
    </>
  )
}

export function RevenuePage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Revenue and client summary" title="Revenue visibility without invented numbers" description="Uses the Revenue Sprint 4 contract. Current numeric values remain unavailable until a safe Development export is supplied." action={<SourceBadge source={data.revenueMetrics[0].source} />} />
      <div className="metric-grid">{data.revenueMetrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>
      <div className="dashboard-grid split">
        <Section title="Owner follow-up items" subtitle="Repository evidence only">
          <EvidenceList items={[
            { id: 'rev-action-1', text: 'Review FCFO / Exit / Acquisition / Model price cards.', source: data.approvals[1].source },
            { id: 'rev-action-2', text: 'Keep outbound follow-ups and proposals in draft/approval mode.', source: data.approvals[2].source },
          ]} />
        </Section>
        <Section title="Client onboarding status" subtitle="Live status unavailable">
          <p className="unavailable-copy">No approved live onboarding or portal feed is connected. The records below are fictional UAT examples.</p>
          <SourceBadge source={{ kind: 'Unavailable', label: 'No approved live client source' }} />
        </Section>
      </div>
      <Section title="Active client projects" subtitle="Development sample — not real clients">
        <div className="client-grid">{data.clients.map((client) => <article className="client-card" key={client.id}><div className="client-card-head"><div><h3>{client.name}</h3><p>{client.project}</p></div><Badge tone={healthTone(client.health)}>{client.health}</Badge></div><p><strong>{client.status}</strong> · {client.missingDocuments} sample missing document(s)</p><p>{client.nextAction}</p><SourceBadge source={client.source} /></article>)}</div>
      </Section>
    </>
  )
}

export function EngineeringPage() {
  const { data } = useDashboard()
  return (
    <>
      <PageHeader eyebrow="Engineering and release summary" title="Track 9 EOS at a glance" description="Consumes the existing EOS snapshot and Atlas records; this view does not rebuild Engineering OS." />
      <div className="engineering-grid">{data.engineering.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p><SourceBadge source={item.source} /></article>)}</div>
      <Section title="Deployment boundary" subtitle="Protected systems">
        <div className="deployment-callout"><Badge tone="positive">PROTECTED</Badge><div><h3>Production freeze remains enforced</h3><p>No merge, deployment, Track 1 change, website publish, DNS, email, Teams, SMS, payments, invitations, or Production flow activation is authorized.</p></div></div>
      </Section>
    </>
  )
}

function BriefSection({ title, items, empty }: { title: string; items: { id: string; text: string; source: Parameters<typeof SourceBadge>[0]['source'] }[]; empty?: string }) {
  return <Section title={title}>{items.length ? <EvidenceList items={items} /> : <p className="unavailable-copy">{empty ?? 'No evidence available.'}</p>}</Section>
}

export function BriefPage() {
  const { data, approvals } = useDashboard()
  const pending = approvals.filter((item) => item.state === 'Pending').map((item) => ({ id: item.id, text: `${item.title}: ${item.requestedAction}`, source: item.source }))
  return (
    <>
      <PageHeader eyebrow="Morning executive brief" title="What Manny needs to know" description="Generated deterministically from available repository evidence. Missing inputs are stated, not guessed." action={<SourceBadge source={data.sources[0]} />} />
      <div className="brief-grid">
        <BriefSection title="What changed" items={data.recentChanges} />
        <BriefSection title="Needs Manny's decision" items={pending} />
        <BriefSection title="Blocked" items={data.blockers} />
        <BriefSection title="At risk" items={data.risks} />
        <BriefSection title="Ready for QA" items={[{ id: 'qa-1', text: 'CEO Command Center will enter QA after implementation and automated tests complete.', source: data.sources[0] }]} />
        <BriefSection title="Ready for release" items={[]} empty="Nothing is ready for release. Commit, push, merge, and deploy remain prohibited." />
        <BriefSection title="Revenue opportunities requiring attention" items={[{ id: 'revenue-missing', text: 'Current opportunity values are unavailable. Price-card owner decisions remain open.', source: data.revenueMetrics[0].source }]} />
        <BriefSection title="Client delivery issues" items={[{ id: 'client-missing', text: 'Live client delivery data is unavailable; only fictional UAT fixtures are present.', source: { kind: 'Unavailable', label: 'No approved live client source' } }]} />
      </div>
      <Section title="Top three recommended actions" subtitle="Owner-focused sequence"><EvidenceList items={data.actions} /></Section>
    </>
  )
}
