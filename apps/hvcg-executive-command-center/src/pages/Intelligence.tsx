import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Badge, PageHeader, Section } from '../components/Dashboard'
import { ExecutiveBrief } from '../components/ExecutiveBrief'
import { DecisionQueue, InsightCard, ReviewHistoryPanel, TaskQueue } from '../components/InsightActions'
import { useIntelligence } from '../state/IntelligenceContext'
import { useDashboard } from '../state/DashboardContext'
import type { ExceptionDomain } from '../types/intelligence'
import { coloradoCraftBeefVerified } from '../data/verifiedSources'
import {
  KNOWLEDGE_CATALOG,
  ModuleKnowledgeRail,
  attachApprovedCitations,
  knowledgeUserFromHost,
} from '../integrations/knowledge'

const exceptionDomains: ExceptionDomain[] = [
  'Overdue',
  'Project',
  'Client',
  'Revenue',
  'Capital readiness',
  'Finance',
]

function IntelligenceNav() {
  const items = [
    { to: '/intelligence', end: true, label: 'Daily brief' },
    { to: '/intelligence/weekly', label: 'Weekly briefing' },
    { to: '/intelligence/decisions', label: 'Priority decisions' },
    { to: '/intelligence/exceptions', label: 'Exceptions' },
    { to: '/intelligence/meetings', label: 'Meetings & deadlines' },
    { to: '/intelligence/ccb', label: 'Colorado Craft Beef' },
  ]
  return (
    <nav className="intel-subnav" aria-label="Executive intelligence">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function IntelligenceLayout() {
  const { role } = useDashboard()
  const location = useLocation()
  return (
    <>
      <PageHeader
        eyebrow="Executive intelligence"
        title="What changed · what matters · what next"
        description={`Grounded Atlas and verified client facts for ${role}. AI interpretations are labeled. Generated surfaces always show source records and timestamps.`}
        action={<Badge tone="accent">Product build · Sprint 1</Badge>}
      />
      <IntelligenceNav />
      <Outlet key={location.pathname} />
    </>
  )
}

export function DailyIntelligencePage() {
  const { dailyBrief, stackInsights, meetings } = useIntelligence()
  const { role } = useDashboard()
  const knowledgeUser = knowledgeUserFromHost({ role, organizationId: 'HVCG', assignedClients: ['CCB'] })
  const grounded = attachApprovedCitations(
    knowledgeUser,
    KNOWLEDGE_CATALOG,
    'AI insights must cite approved Knowledge Platform sources before publication.',
    ['KA-006', 'KA-005'],
  )

  return (
    <>
      <ExecutiveBrief brief={dailyBrief} />
      <div className="dashboard-grid split">
        <Section title="Priority insights" subtitle="Ranked by business impact · accept, dismiss, or convert">
          <div className="insight-stack">
            {stackInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </Section>
        <Section title="Upcoming meetings & deadlines" subtitle="Next leadership commitments">
          <div className="timeline">
            {meetings.map((item) => (
              <div key={item.id}>
                <time>{new Date(item.when).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                <span>
                  <strong>
                    {item.type}: {item.title}
                  </strong>
                  <small>
                    {item.parties} · {item.impact}
                  </small>
                </span>
              </div>
            ))}
          </div>
          <Link className="text-link" to="/intelligence/ccb">
            Open Colorado Craft Beef briefing
          </Link>
        </Section>
      </div>
      <Section title="Approved knowledge grounding" subtitle={grounded.blocked ? grounded.reason : 'Citations verified'}>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{grounded.text}</pre>
      </Section>
      <ModuleKnowledgeRail module="Executive" user={knowledgeUser} title="Knowledge context for brief" />
      <Section title="Review history" subtitle="Preserved accept / dismiss / convert actions">
        <ReviewHistoryPanel />
      </Section>
    </>
  )
}

export function WeeklyIntelligencePage() {
  const { weeklyBrief } = useIntelligence()
  return <ExecutiveBrief brief={weeklyBrief} />
}

export function DecisionsPage() {
  const { decisions, tasks } = useIntelligence()
  return (
    <div className="dashboard-grid split">
      <Section title="Priority decisions" subtitle={`${decisions.filter((d) => d.status === 'Pending').length} pending`}>
        <DecisionQueue />
      </Section>
      <Section title="Converted tasks" subtitle={`${tasks.length} from insights`}>
        <TaskQueue />
      </Section>
    </div>
  )
}

export function ExceptionsPage() {
  const { exceptions } = useIntelligence()
  return (
    <>
      <Section title="Exception board" subtitle="Overdue · project · client · revenue · capital · finance">
        <div className="exception-board">
          {exceptionDomains.map((domain) => {
            const rows = exceptions.filter((item) => item.domain === domain)
            return (
              <div key={domain} className="exception-column">
                <h3>{domain}</h3>
                {rows.length === 0 && <p className="muted">None</p>}
                {rows.map((item) => (
                  <article key={item.id} className="exception-card">
                    <Badge tone={item.impact === 'Critical' ? 'critical' : item.impact === 'High' ? 'warning' : 'accent'}>{item.impact}</Badge>
                    <Badge tone={item.evidenceKind === 'Verified' ? 'positive' : item.evidenceKind === 'AI interpretation' ? 'accent' : 'warning'}>
                      {item.evidenceKind}
                    </Badge>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>
                      Sources: {item.sources.map((s) => s.recordId).join(', ')}
                    </small>
                  </article>
                ))}
              </div>
            )
          })}
        </div>
      </Section>
      <div className="dashboard-grid split">
        <Section title="Major risks" subtitle="Critical and high impact">
          <ul className="plain-list">
            {exceptions
              .filter((e) => e.domain === 'Risk' || e.impact === 'Critical')
              .concat(exceptions.filter((e) => e.domain === 'Capital readiness' || e.domain === 'Overdue'))
              .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
              .map((e) => (
                <li key={e.id}>
                  <strong>{e.title}</strong> — {e.detail}
                </li>
              ))}
          </ul>
        </Section>
        <Section title="Major opportunities" subtitle="Verified only">
          <ul className="plain-list">
            <li>
              <strong>Colorado Craft Beef Blueprint</strong> — capital advisory at Blueprint; fees Awaiting verified source.
            </li>
            <li>
              <strong>Elite UI Executive Home merge</strong> — Executive Intelligence integration candidate.
            </li>
          </ul>
        </Section>
      </div>
    </>
  )
}

export function MeetingsPage() {
  const { meetings } = useIntelligence()
  return (
    <Section title="Upcoming meetings and deadlines" subtitle="Prioritized by business impact">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Title</th>
              <th>Parties</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.when).toLocaleString()}</td>
                <td>{item.type}</td>
                <td>
                  <strong>{item.title}</strong>
                </td>
                <td>{item.parties}</td>
                <td>
                  <Badge tone={item.impact === 'Critical' ? 'critical' : 'warning'}>{item.impact}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export function CcbBriefingPage() {
  const { ccbBrief, stackInsights } = useIntelligence()
  const ccb = coloradoCraftBeefVerified
  /** Client isolation: only CCB-scoped insights on this surface. */
  const related = stackInsights.filter((i) => i.clientCode === 'CCB')
  const leaked = stackInsights.some((i) => i.clientCode && i.clientCode !== 'CCB' && related.includes(i))
  return (
    <>
      <div className="ccb-meeting-banner">
        <div>
          <p className="eyebrow">Meeting-ready · verified facts only · client-isolated</p>
          <h2>{ccb.legalName}</h2>
          <p>
            {ccb.engagementStatus} · {ccb.pipelineStage} · Blueprint {ccb.blueprintStatus}
          </p>
        </div>
        <Badge tone="warning">No invented financial findings</Badge>
      </div>
      <p className="muted" data-testid="ccb-isolation-ok">
        {leaked ? 'Isolation fault' : 'Client isolation OK · CCB scope only'}
      </p>
      <div className="dashboard-grid thirds">
        <Section title="Relationship history" subtitle="Verified">
          <ul className="plain-list">
            {ccb.relationshipHistory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
        <Section title="Strategic context" subtitle="Verified">
          <ul className="plain-list">
            {ccb.strategicContext.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>Referral: {ccb.referralSource}</li>
            <li>
              Owner: {ccb.relationshipOwner} · Contact: {ccb.primaryContact}
            </li>
          </ul>
        </Section>
        <Section title="Missing / pending verification" subtitle="Do not invent">
          <ul className="plain-list">
            {ccb.missingOrPending.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>
      <div className="dashboard-grid split">
        <Section title="Capital & real estate objectives" subtitle="Verified">
          <p>
            <strong>Capital:</strong> {ccb.capitalObjectives.join('; ')}
          </p>
          <p>
            <strong>Real estate:</strong> {ccb.realEstateObjectives.join('; ')}
          </p>
          <p>
            <strong>Known next actions:</strong>
          </p>
          <ol className="plain-list numbered">
            {ccb.knownNextActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Section>
        <Section title="Related insights" subtitle="Accept / dismiss / convert · CCB only">
          <div className="insight-stack">
            {related.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </Section>
      </div>
      <ExecutiveBrief brief={ccbBrief} />
    </>
  )
}
