import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AlertRow, Banner, KpiCard, RecommendationCard, Section, SourceTable } from '../components/FinanceUI'
import { dailyChanges, scorecards } from '../data/decisionEngine'
import {
  aiObservations,
  alerts,
  apAgingCcb,
  apAgingHvcg,
  arAgingCcb,
  arAgingHvcg,
  budgetLines,
  commentary,
  debtObligations,
  enterpriseValueModels,
  forecastSeries,
  scenarios,
  workspaces,
} from '../data/financeStore'
import { visibleKpis } from '../data/kpiCatalog'
import { allSources, ccbSources, sourceById } from '../data/verifiedSources'
import { highestImpactRecommendations, incompleteShare } from '../engines/financeIntelligence'
import { RunwayOptimizationPanel, ScenarioComparisonPanel } from './DecisionPages'
import { useFinance } from '../state/FinanceContext'
import type { OrganizationId, Role, RouteKey } from '../types'
import { roleAccess } from '../types'
import {
  KNOWLEDGE_CATALOG,
  ModuleKnowledgeRail,
  attachApprovedCitations,
  knowledgeUserFromHost,
} from '../integrations/knowledge'

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
        <span className="pill">Phase 1</span>
      </div>
    </header>
  )
}

function OrgBanner() {
  const { organizationId } = useFinance()
  if (organizationId === 'CCB') {
    return (
      <Banner>
        Colorado Craft Beef — financial structure ready. Values show Awaiting verified data / Data connection
        pending / Not yet calculated. No invented dollars.
      </Banner>
    )
  }
  if (organizationId === 'CLIENT_WORKSPACE') {
    return <Banner>Client aggregate shell — per-client ledger bind pending. Data connection pending.</Banner>
  }
  return (
    <Banner>
      HVCG figures are Mock demo derived from Finance Operations Sprint 1 mock store — not live GL / bank data.
    </Banner>
  )
}

function KpiGrid({ org }: { org: OrganizationId }) {
  const { role } = useFinance()
  const kpis = visibleKpis(org === 'CLIENT_WORKSPACE' ? 'CCB' : org, role)
  if (kpis.length === 0) {
    return <p className="muted">No KPIs visible for this role.</p>
  }
  return (
    <div className="kpi-grid" data-testid="kpi-grid">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  )
}

export function OverviewPage() {
  const { organizationId, role, recommendations, respondToRecommendation } = useFinance()
  const org = organizationId === 'CLIENT_WORKSPACE' ? 'CCB' : organizationId
  const kpis = visibleKpis(org, role)
  const openAlerts = alerts.filter((a) => a.allowedRoles.includes(role) && a.status === 'Open')
  const knowledgeUser = knowledgeUserFromHost({
    role,
    organizationId: organizationId === 'CLIENT_WORKSPACE' ? 'HVCG' : organizationId,
    assignedClients: organizationId === 'CLIENT_WORKSPACE' ? ['CCB'] : ['CCB', 'ACME'],
  })
  const recs = recommendations.filter(
    (r) =>
      r.allowedRoles.includes(role) &&
      (organizationId === 'CLIENT_WORKSPACE' || r.organizationId === organizationId),
  )
  const impact = highestImpactRecommendations(recs).slice(0, 3)
  const changes = dailyChanges
    .filter((c) => organizationId === 'CLIENT_WORKSPACE' || c.organizationId === organizationId)
    .slice(0, 4)
  const scoreSnap = scorecards.filter(
    (s) => organizationId === 'CLIENT_WORKSPACE' || s.organizationId === organizationId,
  )
  const canAct = role === 'Owner' || role === 'Executive' || role === 'Finance'

  return (
    <>
      <PageHeader
        title="Financial Overview"
        subtitle="Executive decision engine — recommendations cite supporting data; observations stay separate."
      />
      <OrgBanner />
      <Section title="Highest impact actions" subtitle="Recommendations only" testId="overview-impact">
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
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          <Link to="/decisions">Full recommendation queue & acceptance tracking →</Link>
        </p>
      </Section>
      <Section title="What changed since yesterday" testId="overview-changes">
        <ul>
          {changes.map((c) => (
            <li key={c.id}>
              <strong>{c.label}:</strong> {c.deltaDisplay}{' '}
              <span className="pill">{c.verificationStatus}</span>
            </li>
          ))}
        </ul>
        <p className="muted">
          <Link to="/changes">Full change log →</Link>
        </p>
      </Section>
      <Section title="Risk & readiness snapshot">
        <div className="card-grid">
          {scoreSnap.slice(0, 3).map((s) => (
            <article key={s.id} className="info-card">
              <h3>{s.label}</h3>
              <p className="kpi-value">{s.displayScore}</p>
              <span className="pill">{s.band}</span>
            </article>
          ))}
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          <Link to="/scores">Scores, forecast confidence & methodology →</Link>
        </p>
      </Section>
      <Section title="KPI scorecard" subtitle={`${incompleteShare(kpis)}% incomplete or unbound in this view`}>
        <KpiGrid org={organizationId} />
      </Section>
      <Section title="Open alerts" testId="overview-alerts">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Kind</th>
                <th>Alert</th>
                <th>Org</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {openAlerts.slice(0, 5).map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Management commentary">
        {commentary
          .filter((c) => c.organizationId === org || (organizationId === 'HVCG' && c.organizationId === 'HVCG'))
          .map((c) => (
            <article key={c.id} className="commentary">
              <header>
                <strong>{c.period}</strong> · {c.author} · <span className="pill">{c.evidenceKind}</span>
              </header>
              <p>{c.body}</p>
            </article>
          ))}
      </Section>
      <ModuleKnowledgeRail
        module="Finance"
        user={knowledgeUser}
        clientCode={organizationId === 'CLIENT_WORKSPACE' ? 'CCB' : undefined}
        title="Finance knowledge context"
      />
    </>
  )
}

export function TrendsPage() {
  const { organizationId } = useFinance()
  return (
    <>
      <PageHeader title="Trend Analysis" subtitle="Margin, revenue, and concentration trends with prior-period comparison." />
      <OrgBanner />
      <KpiGrid org={organizationId} />
      <Section title="Rolling series (HVCG mock / CCB unbound)">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Actual</th>
                <th>Budget</th>
                <th>Forecast</th>
                <th>Note</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {forecastSeries.map((p) => (
                <tr key={p.period}>
                  <td>{p.period}</td>
                  <td>{p.actual === null ? '—' : `$${p.actual.toLocaleString()}`}</td>
                  <td>{p.budget === null ? '—' : `$${p.budget.toLocaleString()}`}</td>
                  <td>{p.forecast === null ? '—' : `$${p.forecast.toLocaleString()}`}</td>
                  <td>{p.displayNote}</td>
                  <td>{p.dataQuality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export function CashPage() {
  const { organizationId } = useFinance()
  const debts = debtObligations.filter((d) =>
    organizationId === 'CLIENT_WORKSPACE' ? true : d.organizationId === organizationId || d.organizationId === 'HVCG',
  )
  return (
    <>
      <PageHeader title="Cash & Runway" subtitle="Cash position, projected cash, runway, and debt calendar." />
      <OrgBanner />
      <KpiGrid org={organizationId} />
      <Section title="Debt calendar & covenants">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Principal</th>
                <th>Rate</th>
                <th>Maturity</th>
                <th>Next payment</th>
                <th>Covenant / condition</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.principalDisplay}</td>
                  <td>{d.rateDisplay}</td>
                  <td>{d.maturity}</td>
                  <td>{d.nextPayment}</td>
                  <td>{d.covenantNote}</td>
                  <td>{d.dataQuality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <RunwayOptimizationPanel />
    </>
  )
}

function AgingTable({ schedule }: { schedule: typeof arAgingHvcg }) {
  return (
    <Section title={schedule.title} subtitle={`As of ${schedule.asOf} · ${schedule.source}`}>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Amount</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {schedule.buckets.map((b) => (
              <tr key={b.label}>
                <td>{b.label}</td>
                <td>{b.displayAmount}</td>
                <td>{b.dataQuality}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{schedule.totalDisplay}</strong>
              </td>
              <td>{schedule.dataQuality}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export function WorkingCapitalPage() {
  const { organizationId } = useFinance()
  const showCcb = organizationId === 'CCB' || organizationId === 'CLIENT_WORKSPACE'
  const showHvcg = organizationId === 'HVCG' || organizationId === 'CLIENT_WORKSPACE'
  return (
    <>
      <PageHeader title="Working Capital" subtitle="AR/AP aging, receivables risk, and working capital." />
      <OrgBanner />
      <KpiGrid org={organizationId} />
      {showHvcg ? (
        <>
          <AgingTable schedule={arAgingHvcg} />
          <AgingTable schedule={apAgingHvcg} />
        </>
      ) : null}
      {showCcb ? (
        <>
          <AgingTable schedule={arAgingCcb} />
          <AgingTable schedule={apAgingCcb} />
        </>
      ) : null}
    </>
  )
}

export function BudgetPage() {
  const { organizationId } = useFinance()
  const lines = budgetLines.filter((l) =>
    organizationId === 'CLIENT_WORKSPACE' ? true : l.organizationId === organizationId,
  )
  return (
    <>
      <PageHeader title="Budget versus Actual" subtitle="Variance alerts with Actual vs Budget distinction." />
      <OrgBanner />
      <Section title="Variance table">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>%</th>
                <th>Status</th>
                <th>Quality</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.category}</td>
                  <td>{l.budget === null ? '—' : `$${l.budget.toLocaleString()}`}</td>
                  <td>{l.actual === null ? '—' : `$${l.actual.toLocaleString()}`}</td>
                  <td>{l.varianceDisplay}</td>
                  <td>{l.variancePctDisplay}</td>
                  <td>{l.status}</td>
                  <td>{l.dataQuality}</td>
                  <td>{l.reportingPeriod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export function ForecastPage() {
  return (
    <>
      <PageHeader
        title="Forecast & Scenario Analysis"
        subtitle="Rolling forecast with Actual / Budget / Forecast / Scenario labels."
      />
      <OrgBanner />
      <Section title="Rolling forecast">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Actual</th>
                <th>Budget</th>
                <th>Forecast</th>
                <th>Base</th>
                <th>Upside</th>
                <th>Downside</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {forecastSeries.map((p) => (
                <tr key={p.period}>
                  <td>{p.period}</td>
                  <td>{p.actual ?? '—'}</td>
                  <td>{p.budget ?? '—'}</td>
                  <td>{p.forecast ?? '—'}</td>
                  <td>{p.scenarioBase ?? '—'}</td>
                  <td>{p.scenarioUpside ?? '—'}</td>
                  <td>{p.scenarioDownside ?? '—'}</td>
                  <td>{p.dataQuality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Scenario models">
        <div className="card-grid">
          {scenarios.map((s) => (
            <article key={s.id} className="info-card" data-testid={`scenario-${s.id}`}>
              <h3>{s.name}</h3>
              <p className="muted">
                {s.organizationId} · {s.horizon} · {s.status}
              </p>
              <p>
                <span className="pill">{s.dataQuality}</span> <span className="pill">{s.evidenceKind}</span>
              </p>
              <ul>
                {s.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <dl className="kpi-meta">
                <div>
                  <dt>Revenue</dt>
                  <dd>{s.revenueImpactDisplay}</dd>
                </div>
                <div>
                  <dt>EBITDA</dt>
                  <dd>{s.ebitdaImpactDisplay}</dd>
                </div>
                <div>
                  <dt>Cash</dt>
                  <dd>{s.cashImpactDisplay}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>
      <ScenarioComparisonPanel />
    </>
  )
}

export function EnterpriseValuePage() {
  const { organizationId } = useFinance()
  const models = enterpriseValueModels.filter((m) =>
    organizationId === 'CLIENT_WORKSPACE' ? true : m.organizationId === organizationId,
  )
  return (
    <>
      <PageHeader
        title="Enterprise Value"
        subtitle="Estimates are indicative unless formally validated. CCB remains unbound."
      />
      <OrgBanner />
      <div className="card-grid">
        {models.map((m) => (
          <article key={m.organizationId} className="info-card ev-card" data-testid={`ev-${m.organizationId}`}>
            <h3>{m.organizationId} enterprise value</h3>
            <p className="ev-warning">{m.validationLabel}</p>
            <dl className="kpi-meta">
              <div>
                <dt>Current estimate</dt>
                <dd>{m.currentEstimateDisplay}</dd>
              </div>
              <div>
                <dt>Range</dt>
                <dd>{m.valuationRangeDisplay}</dd>
              </div>
              <div>
                <dt>EBITDA multiple</dt>
                <dd>{m.ebitdaMultipleDisplay}</dd>
              </div>
              <div>
                <dt>Revenue multiple</dt>
                <dd>{m.revenueMultipleDisplay}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{m.targetValueDisplay}</dd>
              </div>
              <div>
                <dt>Quality</dt>
                <dd>{m.dataQuality}</dd>
              </div>
              <div>
                <dt>Refresh</dt>
                <dd>{m.lastRefresh}</dd>
              </div>
            </dl>
            <h4>Assumptions</h4>
            <ul>
              {m.assumptions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h4>Value drivers</h4>
            <ul>
              {m.valueDrivers.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h4>Value detractors</h4>
            <ul>
              {m.valueDetractors.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h4>Risk adjustments</h4>
            <ul>
              {m.riskAdjustments.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h4>Improvement initiatives</h4>
            <ul>
              {m.improvementInitiatives.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h4>Scenario comparison</h4>
            <ul>
              {m.scenarioComparison.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}

export function WorkspacesPage() {
  return (
    <>
      <PageHeader
        title="Client Workspaces"
        subtitle="HVCG internal, Colorado Craft Beef mappings, and client aggregate shell."
      />
      <div className="card-grid">
        {workspaces.map((w) => (
          <article key={w.id} className="info-card" data-testid={`workspace-${w.id}`}>
            <h3>
              {w.name} <span className="pill">{w.code}</span>
            </h3>
            <p className="muted">
              {w.kind} · <span className="pill">{w.financialDataState}</span>
            </p>
            <p>{w.relationshipSummary}</p>
            <h4>Verified facts</h4>
            <ul>
              {w.verifiedFacts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <h4>Objectives</h4>
            <ul>
              {w.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <h4>Pending financial areas</h4>
            <ul>
              {w.pendingFinancialAreas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <Section title="CCB approved sources (relationship only)">
        <div className="table-scroll">
          <SourceTable sources={ccbSources} />
        </div>
      </Section>
    </>
  )
}

export function CapitalPage() {
  return (
    <>
      <PageHeader
        title="Capital Advisory"
        subtitle="Document readiness, capital objectives, and EV linkage for advisory work."
      />
      <OrgBanner />
      <Section title="Document readiness">
        <KpiGrid org="HVCG" />
        <p className="muted" style={{ marginTop: '1rem' }}>
          CCB document readiness: Awaiting verified data — checklist structure reserved in workspace mappings.
        </p>
      </Section>
      <Section title="Advisory notes">
        <ul>
          <li>HVCG: demo readiness 72% — improve QBO/Mercury bind and AR &gt;60.</li>
          <li>CCB: growth capital + real estate objectives verified; financial pack unbound.</li>
          <li>Enterprise value screens remain labeled indicative until formal validation.</li>
        </ul>
      </Section>
    </>
  )
}

export function AlertsPage() {
  const { role } = useFinance()
  const rows = alerts.filter((a) => a.allowedRoles.includes(role))
  return (
    <>
      <PageHeader title="Finance Alerts" subtitle="Cash, receivables, margin, budget, forecast, debt, and data-quality." />
      <Section title="Alert queue">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Kind</th>
                <th>Alert</th>
                <th>Org</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  )
}

export function AiPage() {
  const { role } = useFinance()
  const rows = aiObservations.filter((o) => o.allowedRoles.includes(role))
  const knowledgeUser = knowledgeUserFromHost({ role, organizationId: 'HVCG' })
  const grounded = attachApprovedCitations(
    knowledgeUser,
    KNOWLEDGE_CATALOG,
    'Finance AI observations may only cite approved Knowledge Platform guidance.',
    ['KA-012', 'KA-006'],
  )
  return (
    <>
      <PageHeader
        title="AI-supported Financial Observations"
        subtitle="Never treat AI interpretations as verified accounting conclusions."
      />
      <Banner>All AI financial narratives require human REVIEW. Pricing/payment SoR changes are Owner-gated.</Banner>
      <Banner>
        {grounded.blocked
          ? grounded.reason
          : `Approved knowledge citations: ${grounded.citations.map((c) => c.articleId).join(', ')}`}
      </Banner>
      <div className="card-grid">
        {rows.map((o) => (
          <article key={o.id} className="info-card" data-testid={`ai-${o.id}`}>
            <h3>{o.title}</h3>
            <p>
              <span className="pill quality-ai-interpretation">Observation</span>{' '}
              <span className="pill quality-ai-interpretation">{o.evidenceKind}</span>{' '}
              <span className="pill">{o.reviewStatus}</span> <span className="pill">{o.organizationId}</span>
            </p>
            <p>{o.summary}</p>
            <p className="muted">
              Confidence {o.confidence}/100 · Verification: {o.verificationStatus}
            </p>
            <h4>Source references</h4>
            <ul>
              {o.sourceIds.map((id) => (
                <li key={id}>{sourceById(id)?.label ?? id}</li>
              ))}
            </ul>
            <p className="muted">{o.disclaimer}</p>
            <p className="muted">Generated {o.generatedAt}</p>
            <p className="muted">
              Not a recommendation — see <Link to="/decisions">Executive recommendations</Link>.
            </p>
          </article>
        ))}
      </div>
      <ModuleKnowledgeRail module="Finance" user={knowledgeUser} title="Approved finance knowledge for AI grounding" />
    </>
  )
}

export function GovernancePage() {
  const { auditLog, acceptanceLog } = useFinance()
  return (
    <>
      <PageHeader
        title="Governance, Permissions & Audit"
        subtitle="Role gates, source catalog, decision audit, and cross-team coordination."
      />
      <Section title="Cross-team coordination (required before shared concepts)">
        <ul>
          <li>
            <strong>Revenue Systems</strong> — forecast conversion assumptions, pipeline-to-revenue bind, shared MRR
            definitions
          </li>
          <li>
            <strong>Executive Intelligence</strong> — priority decisions, brief format, insight vs recommendation
            taxonomy
          </li>
          <li>
            <strong>AI Governance</strong> — observation review path, no AUTO apply to payment/invoice SoR
          </li>
          <li>
            <strong>Data Engineering</strong> — verified source bind, QBO/Mercury connectors, CCB ledger import
          </li>
          <li>
            <strong>Master PM</strong> — promote FI-local scores to Atlas-wide KPI definitions
          </li>
        </ul>
        <p className="muted">
          Finance Intelligence keeps revenue-risk, capital-readiness, and forecast-confidence rubrics local until
          coordinated. CCB financial scores remain incomplete.
        </p>
      </Section>
      <Section title="Permission matrix">
        <div className="table-scroll">
          <table className="data-table" data-testid="permission-matrix">
            <thead>
              <tr>
                <th>Role</th>
                <th>Routes</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(roleAccess) as Role[]).map((role) => (
                <tr key={role}>
                  <td>{role}</td>
                  <td>{roleAccess[role].join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Source & refresh catalog">
        <div className="table-scroll">
          <SourceTable sources={allSources} />
        </div>
      </Section>
      <Section title="Recommendation acceptance audit">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Recommendation</th>
                <th>Action</th>
                <th>Actor</th>
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
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Audit history">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr key={e.id}>
                  <td>{e.at}</td>
                  <td>{e.actor}</td>
                  <td>{e.role}</td>
                  <td>{e.action}</td>
                  <td>{e.entity}</td>
                  <td>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="AI Governance review (product)">
        <ul>
          <li>AI observations labeled EvidenceKind = AI interpretation.</li>
          <li>No AUTO apply of $ analysis to Invoice / payment systems of record.</li>
          <li>Accept path requires Analyst/Finance + Owner for pricing-impacting narratives.</li>
          <li>CCB: only Finance Intelligence may promote KPIs to Verified after source bind.</li>
          <li>Track 1 / Production / Revenue OS / Client Portal / ECC code paths unmodified.</li>
        </ul>
      </Section>
    </>
  )
}

export function Protected({ route, children }: { route: RouteKey; children: ReactNode }) {
  const { role } = useFinance()
  if (!roleAccess[role].includes(route)) return <Navigate to="/" replace />
  return <>{children}</>
}
