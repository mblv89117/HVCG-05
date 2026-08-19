import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function CompanyKpisPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Company KPIs" title="Company performance indicators" description="Core operating KPIs with targets and periods — mock dashboard." />
      <Section title="KPI register" subtitle="Development mock">
        <div className="card-grid" data-testid="kpi-grid">
          {data.companyKpis.map((kpi) => (
            <article className="entity-card" key={kpi.id}>
              <header>
                <div>
                  <strong>{kpi.name}</strong>
                  <span>{kpi.period}</span>
                </div>
                <StatusPill label={kpi.value} tone={kpi.tone} />
              </header>
              <small>Target · {kpi.target}</small>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
