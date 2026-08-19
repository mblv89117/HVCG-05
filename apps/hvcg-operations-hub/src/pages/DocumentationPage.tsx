import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function DocumentationPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Documentation" title="Internal documentation center" description="Architecture, handoff, QA, and calendar design packages — mock doc index." />
      <Section title="Packages" subtitle={`${data.documentation.length} documents`}>
        <ul className="item-list" data-testid="docs-list">
          {data.documentation.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{doc.title}</strong>
                <span>
                  {doc.kind} · {doc.owner} · {doc.updatedAt}
                </span>
              </div>
              <StatusPill label={doc.status} tone={doc.status === 'Approved' ? 'positive' : doc.status === 'Draft' ? 'neutral' : 'warning'} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Doc health" subtitle="SOP currency">
        <div className="metric-grid compact">
          {data.docHealth.map((metric) => (
            <article className={`metric-card tone-${metric.tone ?? 'neutral'}`} key={metric.id}>
              <div className="metric-top">
                <span>{metric.label}</span>
              </div>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
