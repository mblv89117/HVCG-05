import type { ReactNode } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import type { AgentStatus, HealthLevel, PermissionLevel, RiskLevel } from '../types'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  detail: string
  tone?: 'neutral' | 'positive' | 'warning' | 'critical' | 'accent'
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

export function Panel({
  title,
  subtitle,
  children,
  className = '',
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
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

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

export function Badge({
  children,
  tone,
}: {
  children: ReactNode
  tone?: string
}) {
  const label = typeof children === 'string' || typeof children === 'number' ? String(children) : 'neutral'
  return <span className={`badge badge-${tone ?? slug(label)}`}>{children}</span>
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="progress" aria-label={label ?? `${Math.round(percent)} percent`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty-state">
      <ShieldCheck size={22} />
      <p>{children}</p>
    </div>
  )
}

export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children} <ArrowUpRight size={13} />
    </span>
  )
}
