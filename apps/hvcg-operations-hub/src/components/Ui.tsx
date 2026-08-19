import type { ReactNode } from 'react'
import type { Metric, Tone } from '../types'

export type IconName =
  | 'operations'
  | 'team'
  | 'projects'
  | 'sop'
  | 'ai'
  | 'human'
  | 'notifications'
  | 'search'
  | 'calendar'
  | 'arrow'
  | 'executive'
  | 'scorecards'
  | 'weekly'
  | 'quarterly'
  | 'kpis'
  | 'meetings'
  | 'hr'
  | 'hiring'
  | 'training'
  | 'vendors'
  | 'assets'
  | 'docs'

const iconPaths: Record<IconName, ReactNode> = {
  operations: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1.08-1.5 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06L7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09A1.65 1.65 0 0 0 15 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.65 1.05 1.27 1.08H21v4h-.09c-.62.03-1.15.47-1.51 1Z" /></>,
  team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  projects: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  sop: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></>,
  ai: <><path d="M12 2a7 7 0 0 0-4 12.74V19h8v-4.26A7 7 0 0 0 12 2Z" /><path d="M9 23h6" /><path d="M9 19h6" /><path d="m9.5 9 1.5 1.5L14.5 7" /></>,
  human: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" /><path d="M18 11v4M16 13h4" /></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  executive: <><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M9 21v-6h6v6" /></>,
  scorecards: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  weekly: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  quarterly: <><path d="M8 2v4M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 14h3M13 18h3" /></>,
  kpis: <><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></>,
  meetings: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  hr: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11h-6" /></>,
  hiring: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></>,
  training: <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></>,
  vendors: <><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /><path d="M3 9 12 3l9 6" /></>,
  assets: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
  docs: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
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
  const tone: Tone = metric.tone ?? 'neutral'
  return (
    <article className={`metric-card tone-${tone}`} data-testid={`metric-${metric.id}`}>
      <div className="metric-top">
        <span>{metric.label}</span>
        {metric.trend && <span className={`trend trend-${metric.trendDirection ?? 'flat'}`}>{metric.trend}</span>}
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
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

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone | string }) {
  const normalized = String(tone).toLowerCase().replace(/\s+/g, '-')
  return <span className={`status-pill tone-${normalized}`}>{label}</span>
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-bar" aria-label={label ?? `Progress ${value}%`}>
      <span style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      <em>{value}%</em>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>
}
