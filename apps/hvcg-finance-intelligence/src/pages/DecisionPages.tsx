import { Link } from 'react-router-dom'
import { Banner, RecommendationCard, Section } from '../components/FinanceUI'
import {
  dailyChanges,
  forecastConfidence,
  runwayLevers,
  scenarioComparisons,
  scorecards,
} from '../data/decisionEngine'
import { sourceById } from '../data/verifiedSources'
import { highestImpactRecommendations, sortByImpact } from '../engines/financeIntelligence'
import { useFinance } from '../state/FinanceContext'

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { organizationId } = useFinance()
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="page-header__badges">
        <span className="pill">Org: {organizationId}</span>
        <span className="pill">Decision engine</span>
      </div>
    </header>
  )
}

export function DecisionsPage() {
  const { role, organizationId, recommendations, acceptanceLog, decisionHistory, respondToRecommendation } =
    useFinance()
  const scoped = sortByImpact(
    recommendations.filter(
      (r) =>
        r.allowedRoles.includes(role) &&
        (organizationId === 'CLIENT_WORKSPACE' || r.organizationId === organizationId),
    ),
  )
  const impact = highestImpactRecommendations(scoped)
  const canAct = role === 'Owner' || role === 'Executive' || role === 'Finance'

  return (
    <>
      <PageHeader
        title="Executive Recommendations"
        subtitle="Actionable recommendations with citations — distinct from AI observations. Accept / defer / reject is audited."
      />
      <Banner>
        Recommendations cite supporting data only. Mock demo figures are not verified accounting. Shared scoring
        concepts remain FI-local pending Master PM coordination.
      </Banner>
      <Section title="Highest impact actions" subtitle={`${impact.length} proposed`} testId="highest-impact">
        <div className="card-grid">
          {impact.map((r) => (
            <RecommendationCard
              key={r.id}
              recommendation={r}
              canAct={canAct}
              onRespond={(action) => respondToRecommendation(r.id, action)}
            />
          ))}
        </div>
      </Section>
      <Section title="All recommendations" testId="recommendation-queue">
        <div className="card-grid">
          {scoped.map((r) => (
            <RecommendationCard
              key={r.id}
              recommendation={r}
              canAct={canAct}
              onRespond={(action) => respondToRecommendation(r.id, action)}
            />
          ))}
        </div>
      </Section>
      <Section title="Recommendation acceptance tracking">
        <div className="table-scroll">
          <table className="data-table" data-testid="acceptance-log">
            <thead>
              <tr>
                <th>When</th>
                <th>Recommendation</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {acceptanceLog.map((e) => (
                <tr key={e.id}>
                  <td>{e.at}</td>
                  <td>{e.recommendationId}</td>
                  <td>{e.action}</td>
                  <td>{e.actor}</td>
                  <td>{e.role}</td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Decision history">
        <div className="table-scroll">
          <table className="data-table" data-testid="decision-history">
            <thead>
              <tr>
                <th>When</th>
                <th>Title</th>
                <th>Decision</th>
                <th>Outcome</th>
                <th>Verification</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {decisionHistory.map((d) => (
                <tr key={d.id}>
                  <td>{d.decidedAt}</td>
                  <td>{d.title}</td>
                  <td>{d.decision}</td>
                  <td>{d.outcome}</td>
                  <td>{d.verificationStatus}</td>
                  <td>
                    {d.decidedBy} ({d.role})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export function ChangesPage() {
  const { organizationId } = useFinance()
  const rows = dailyChanges.filter(
    (c) => organizationId === 'CLIENT_WORKSPACE' || c.organizationId === organizationId,
  )
  return (
    <>
      <PageHeader
        title="What Changed Since Yesterday"
        subtitle="Structural and labeled demo deltas only — no invented financial values."
      />
      <Banner>
        Compare as-of {rows[0]?.asOfPrevious ?? '—'} → {rows[0]?.asOfCurrent ?? '—'}. Incomplete orgs show status
        changes without inventing dollars.
      </Banner>
      <Section title="Change log" testId="daily-changes">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Delta</th>
                <th>Quality</th>
                <th>Verification</th>
                <th>Sources</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.label}
                    {c.structuralOnly ? <span className="pill">Structural</span> : null}
                  </td>
                  <td>{c.previousDisplay}</td>
                  <td>{c.currentDisplay}</td>
                  <td>{c.deltaDisplay}</td>
                  <td>{c.dataQuality}</td>
                  <td>{c.verificationStatus}</td>
                  <td>{c.sourceIds.map((id) => sourceById(id)?.system ?? id).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export function ScoresPage() {
  const { organizationId } = useFinance()
  const scores = scorecards.filter(
    (s) => organizationId === 'CLIENT_WORKSPACE' || s.organizationId === organizationId,
  )
  const fc = forecastConfidence.filter(
    (f) => organizationId === 'CLIENT_WORKSPACE' || f.organizationId === organizationId,
  )
  return (
    <>
      <PageHeader
        title="Risk & Readiness Scores"
        subtitle="Revenue risk, capital readiness, EV driver strength, and forecast confidence — FI-local methodology."
      />
      <Banner>
        Scores are product-local until coordinated with Revenue Systems, Executive Intelligence, AI Governance, Data
        Engineering, and Master PM. CCB scores remain incomplete.
      </Banner>
      <div className="card-grid" data-testid="scorecards">
        {scores.map((s) => (
          <article key={s.id} className="info-card" data-testid={`score-${s.id}`}>
            <h3>{s.label}</h3>
            <p className="kpi-value">{s.displayScore}</p>
            <p>
              <span className="pill">{s.band}</span>{' '}
              <span className="pill">{s.verificationStatus}</span>
            </p>
            <dl className="kpi-meta">
              <div>
                <dt>Confidence</dt>
                <dd>{s.confidence === null ? 'Not yet calculated' : `${s.confidence}/100`}</dd>
              </div>
              <div>
                <dt>Quality</dt>
                <dd>{s.dataQuality}</dd>
              </div>
            </dl>
            <h4>Drivers</h4>
            <ul>
              {s.drivers.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="muted">{s.methodologyNote}</p>
          </article>
        ))}
      </div>
      <Section title="Forecast confidence">
        <div className="card-grid">
          {fc.map((f) => (
            <article key={f.organizationId} className="info-card" data-testid={`fc-${f.organizationId}`}>
              <h3>{f.organizationId}</h3>
              <p className="kpi-value">{f.displayScore}</p>
              <p className="muted">{f.horizon}</p>
              <p>
                <span className="pill">{f.verificationStatus}</span>
              </p>
              <ul>
                {f.factors.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="muted">Refresh {f.lastRefresh}</p>
            </article>
          ))}
        </div>
      </Section>
      <p className="muted">
        Related: <Link to="/decisions">Recommendations</Link> · <Link to="/forecast">Scenario comparison</Link> ·{' '}
        <Link to="/cash">Runway optimization</Link>
      </p>
    </>
  )
}

export function RunwayOptimizationPanel() {
  const { organizationId } = useFinance()
  const levers = runwayLevers.filter(
    (l) => organizationId === 'CLIENT_WORKSPACE' || l.organizationId === organizationId,
  )
  return (
    <Section title="Cash runway optimization" subtitle="Levers cite supporting demo or incomplete labels only">
      <div className="card-grid">
        {levers.map((l) => (
          <article key={l.id} className="info-card" data-testid={`lever-${l.id}`}>
            <h3>{l.title}</h3>
            <p>{l.effectDisplay}</p>
            <p>
              <span className="pill">{l.effort} effort</span> <span className="pill">{l.status}</span>
            </p>
            <p className="muted">{l.verificationStatus}</p>
            <ul className="citation-list">
              {l.citations.map((c) => (
                <li key={c.claim}>
                  {sourceById(c.sourceId)?.label ?? c.sourceId}: {c.claim}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}

export function ScenarioComparisonPanel() {
  const { organizationId } = useFinance()
  const rows = scenarioComparisons.filter(
    (r) => organizationId === 'CLIENT_WORKSPACE' || r.organizationId === organizationId,
  )
  return (
    <Section title="Scenario comparison" testId="scenario-comparison">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Base</th>
              <th>Upside</th>
              <th>Downside</th>
              <th>Verification</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.metric}</td>
                <td>{r.baseDisplay}</td>
                <td>{r.upsideDisplay}</td>
                <td>{r.downsideDisplay}</td>
                <td>{r.verificationStatus}</td>
                <td>{r.dataQuality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
