import { usePortal } from '../state/PortalContext'
import { FUNDING_STAGES } from '../types'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function FundingPage() {
  const { funding, activeClient } = usePortal()
  const current = funding?.stage
  const idx = current ? FUNDING_STAGES.indexOf(current) : -1

  return (
    <div>
      <div className="page-head">
        <h2>Funding Progress</h2>
        <p>Visual capital journey for {activeClient.name}. Stages are client-safe and do not expose internal pricing.</p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: '1rem' }}>
        <div className="card stat">
          <span className="label">Target</span>
          <span className="value" style={{ fontSize: '1.35rem' }}>
            {funding ? money(funding.amountTarget) : '—'}
          </span>
        </div>
        <div className="card stat">
          <span className="label">Committed</span>
          <span className="value" style={{ fontSize: '1.35rem' }}>
            {funding ? money(funding.amountCommitted) : '—'}
          </span>
        </div>
        <div className="card stat">
          <span className="label">Lender interest</span>
          <span className="value">{funding?.lenderInterest ?? 0}</span>
        </div>
      </div>

      <div className="card">
        <h3>Funding tracker</h3>
        <div className="funding-track" role="list">
          {FUNDING_STAGES.map((stage, i) => {
            const done = i < idx
            const isCurrent = i === idx
            return (
              <div
                key={stage}
                className={`funding-step${done ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="dot" aria-hidden />
                <span>{stage}</span>
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                  {done ? 'Complete' : isCurrent ? 'Current' : 'Upcoming'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
