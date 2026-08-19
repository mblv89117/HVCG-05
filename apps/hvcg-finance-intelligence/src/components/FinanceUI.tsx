import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sourceById } from '../data/verifiedSources'
import type { ExecutiveRecommendation, FinanceAlert, FinanceKpi, SourceRecord } from '../types'

export function KpiCard({ kpi }: { kpi: FinanceKpi }) {
  const incomplete = kpi.currentValue === null || kpi.status === 'Incomplete'
  return (
    <article className={`kpi-card ${incomplete ? 'kpi-incomplete' : ''}`} data-testid={`kpi-${kpi.id}`}>
      <header className="kpi-card__head">
        <h3>{kpi.label}</h3>
        <span className={`pill status-${kpi.status.toLowerCase()}`}>{kpi.status}</span>
      </header>
      <p className="kpi-value">{kpi.displayValue}</p>
      <dl className="kpi-meta">
        <div>
          <dt>Period</dt>
          <dd>{kpi.reportingPeriod}</dd>
        </div>
        <div>
          <dt>Prior</dt>
          <dd>{kpi.priorPeriodComparison}</dd>
        </div>
        <div>
          <dt>Trend</dt>
          <dd className={`trend-${kpi.trend}`}>{kpi.trendLabel}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{kpi.source}</dd>
        </div>
        <div>
          <dt>Refresh</dt>
          <dd>{kpi.lastRefresh}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>
            <span className={`pill quality-${slug(kpi.dataQuality)}`}>{kpi.dataQuality}</span>
          </dd>
        </div>
      </dl>
      <Link className="drill-link" to={kpi.drillDownPath}>
        Drill down →
      </Link>
    </article>
  )
}

export function RecommendationCard({
  recommendation,
  onRespond,
  canAct,
}: {
  recommendation: ExecutiveRecommendation
  onRespond?: (action: 'Accepted' | 'Deferred' | 'Rejected' | 'Reopened') => void
  canAct?: boolean
}) {
  return (
    <article className="info-card rec-card" data-testid={`rec-${recommendation.id}`}>
      <header className="kpi-card__head">
        <h3>{recommendation.title}</h3>
        <div className="pill-row">
          <span className="pill">Recommendation</span>
          {recommendation.highestImpact ? <span className="pill severity-high">Highest impact</span> : null}
          <span className="pill">{recommendation.status}</span>
        </div>
      </header>
      <p>{recommendation.summary}</p>
      <p className="muted">{recommendation.rationale}</p>
      <dl className="kpi-meta">
        <div>
          <dt>Kind</dt>
          <dd>{recommendation.recommendationKind}</dd>
        </div>
        <div>
          <dt>Impact</dt>
          <dd>{recommendation.impactScore}/100</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{recommendation.confidence}/100</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{recommendation.verificationStatus}</dd>
        </div>
        <div>
          <dt>Org</dt>
          <dd>{recommendation.organizationId}</dd>
        </div>
      </dl>
      <h4>Supporting data</h4>
      <ul className="citation-list">
        {recommendation.citations.map((c) => {
          const src = sourceById(c.sourceId)
          return (
            <li key={`${c.sourceId}-${c.claim}`}>
              <strong>{src?.label ?? c.sourceId}</strong>
              <span className="muted"> — {c.claim}</span>
              <span className={`pill quality-${slug(c.dataQuality)}`}>{c.dataQuality}</span>
            </li>
          )
        })}
      </ul>
      <p className="muted">{recommendation.ownerActionPrompt}</p>
      {canAct && onRespond && recommendation.status === 'Proposed' ? (
        <div className="action-row">
          <button type="button" onClick={() => onRespond('Accepted')}>
            Accept
          </button>
          <button type="button" className="btn-secondary" onClick={() => onRespond('Deferred')}>
            Defer
          </button>
          <button type="button" className="btn-secondary" onClick={() => onRespond('Rejected')}>
            Reject
          </button>
        </div>
      ) : null}
      {canAct && onRespond && recommendation.status !== 'Proposed' ? (
        <div className="action-row">
          <button type="button" className="btn-secondary" onClick={() => onRespond('Reopened')}>
            Reopen
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function AlertRow({ alert }: { alert: FinanceAlert }) {
  return (
    <tr data-testid={`alert-${alert.id}`}>
      <td>
        <span className={`pill severity-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
      </td>
      <td>{alert.kind}</td>
      <td>
        <strong>{alert.title}</strong>
        <div className="muted">{alert.detail}</div>
      </td>
      <td>{alert.organizationId}</td>
      <td>{alert.evidenceKind}</td>
      <td>{alert.status}</td>
      <td>{alert.recommendedAction}</td>
    </tr>
  )
}

export function SourceTable({ sources }: { sources: SourceRecord[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>System</th>
          <th>Label</th>
          <th>Evidence</th>
          <th>As of</th>
        </tr>
      </thead>
      <tbody>
        {sources.map((s) => (
          <tr key={s.id}>
            <td>{s.system}</td>
            <td>{s.label}</td>
            <td>
              <span className={`pill quality-${slug(s.evidenceKind)}`}>{s.evidenceKind}</span>
            </td>
            <td>{s.asOf}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Section({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  testId?: string
}) {
  return (
    <section className="panel" data-testid={testId}>
      <div className="panel__head">
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div className="banner" data-testid="data-mode-banner">
      {children}
    </div>
  )
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
