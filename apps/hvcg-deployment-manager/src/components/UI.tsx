import type { ReactNode } from 'react'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="section-body">{children}</div>
    </section>
  )
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

export function PageHeader({ title, subtitle, meta }: { title: string; subtitle: string; meta?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">HVCG Deployment Manager · Mock</p>
        <h1>{title}</h1>
        <p className="lede">{subtitle}</p>
      </div>
      {meta}
    </header>
  )
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function statusTone(status: string): 'neutral' | 'good' | 'warn' | 'bad' | 'info' {
  const s = status.toLowerCase()
  if (['deployed', 'approved', 'healthy', 'pass', 'closed', 'mitigated'].some((k) => s.includes(k))) return 'good'
  if (['blocked', 'rejected', 'down', 'critical', 'fail', 'rolled'].some((k) => s.includes(k))) return 'bad'
  if (['pending', 'qa', 'build', 'degraded', 'open', 'progress'].some((k) => s.includes(k))) return 'warn'
  if (['production', 'freeze', 'protected'].some((k) => s.includes(k))) return 'info'
  return 'neutral'
}
