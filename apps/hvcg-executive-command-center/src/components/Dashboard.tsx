import type { ReactNode } from 'react'
import type { ChartDatum, Evidence, Metric, Tone } from '../types'

export type IconName =
  | 'overview'
  | 'revenue'
  | 'clients'
  | 'operations'
  | 'financial'
  | 'ai'
  | 'notifications'
  | 'search'
  | 'calendar'
  | 'arrow'
  | 'briefcase'

const iconPaths: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  revenue: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  operations: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1.08-1.5 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06L7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09A1.65 1.65 0 0 0 15 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.65 1.05 1.27 1.08H21v4h-.09c-.62.03-1.15.47-1.51 1Z" /></>,
  financial: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  ai: <><path d="M12 2a7 7 0 0 0-4 12.74V19h8v-4.26A7 7 0 0 0 12 2Z" /><path d="M9 23h6" /><path d="M9 19h6" /><path d="m9.5 9 1.5 1.5L14.5 7" /></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 12h18" /></>,
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>
  )
}

export function MetricCard({ metric }: { metric: Metric }) {
  const tone = metric.tone ?? 'neutral'
  return (
    <article className={`metric-card tone-${tone}`} data-testid={`metric-${metric.id}`}>
      <div className="metric-top">
        <span>{metric.label}</span>
        {metric.trend && <span className={`trend trend-${metric.trendDirection ?? 'flat'}`}>{metric.trend}</span>}
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
      <SourceBadge source={metric.source} />
    </article>
  )
}

export function Section({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function BarChart({ data, format = 'number', ariaLabel }: { data: ChartDatum[]; format?: 'number' | 'currency' | 'percent'; ariaLabel: string }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label">{item.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} /></span>
          <strong>{item.displayValue ?? (format === 'percent' ? `${item.value}%` : item.value.toLocaleString())}</strong>
        </div>
      ))}
    </div>
  )
}

export function LineChart({ data, ariaLabel }: { data: ChartDatum[]; ariaLabel: string }) {
  const width = 640
  const height = 200
  const pad = 24
  const max = Math.max(...data.flatMap((item) => [item.value, item.secondary ?? 0]))
  const min = Math.min(...data.flatMap((item) => [item.value, item.secondary ?? item.value])) * 0.82
  const x = (index: number) => pad + (index * (width - pad * 2)) / Math.max(data.length - 1, 1)
  const y = (value: number) => height - pad - ((value - min) / Math.max(max - min, 1)) * (height - pad * 2)
  const primary = data.map((item, index) => `${x(index)},${y(item.value)}`).join(' ')
  const secondary = data.every((item) => item.secondary !== undefined)
    ? data.map((item, index) => `${x(index)},${y(item.secondary ?? 0)}`).join(' ')
    : ''

  return (
    <div className="line-chart" role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((fraction) => <line key={fraction} x1={pad} x2={width - pad} y1={height * fraction} y2={height * fraction} className="chart-gridline" />)}
        {secondary && <polyline points={secondary} className="line-secondary" />}
        <polyline points={primary} className="line-primary" />
        {data.map((item, index) => <circle key={item.label} cx={x(index)} cy={y(item.value)} r="4" className="line-point" />)}
      </svg>
      <div className="chart-axis">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function SourceBadge({ source }: { source: Evidence }) {
  const className = source.kind.toLowerCase().replaceAll(' ', '-')
  return (
    <span className={`source-badge source-${className}`} title={source.path ?? source.label}>
      {source.kind}{source.stale ? ' · STALE' : ''}
    </span>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress-block" aria-label={`${label}: ${value}%`}>
      <div><span>{label}</span><strong>{value}%</strong></div>
      <span className="progress-track"><span style={{ width: `${value}%` }} /></span>
    </div>
  )
}
