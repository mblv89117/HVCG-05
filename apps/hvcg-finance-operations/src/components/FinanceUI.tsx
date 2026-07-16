import type { ReactNode } from 'react'
import { formatUsd } from '../engines/financeEngines'

export function PageHeader({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle?: string
  badge?: string
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">HVCG Finance Operations</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
      {badge ? <span className="pill">{badge}</span> : null}
    </header>
  )
}

export function RevenueCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'risk'
}) {
  const display = typeof value === 'number' ? formatUsd(value) : value
  return (
    <article className={`metric-card tone-${tone}`} data-testid="revenue-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{display}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  )
}

export function FinancialWidget({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="widget" data-testid="financial-widget">
      <div className="widget-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="widget-body">{children}</div>
    </section>
  )
}

export function BarChart({
  items,
  valueKey = 'value',
  labelKey = 'label',
}: {
  items: Record<string, string | number>[]
  valueKey?: string
  labelKey?: string
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey] || 0)), 1)
  return (
    <div className="bar-chart" role="img" aria-label="Bar chart">
      {items.map((item) => {
        const value = Number(item[valueKey] || 0)
        const pct = Math.round((value / max) * 100)
        return (
          <div className="bar-row" key={String(item[labelKey])}>
            <span className="bar-label">{String(item[labelKey])}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-value">{formatUsd(value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[]
  rows: Record<string, string | number>[]
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c.key}>{row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusChip({ status }: { status: string }) {
  const tone = /Past Due|At Risk|High/i.test(status)
    ? 'risk'
    : /Partial|Sent|Medium|Watch/i.test(status)
      ? 'warn'
      : /Paid|Current|Active|Low/i.test(status)
        ? 'good'
        : 'default'
  return <span className={`chip tone-${tone}`}>{status}</span>
}
