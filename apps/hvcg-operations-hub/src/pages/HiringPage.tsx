import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function HiringPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Hiring" title="Hiring pipeline" description="Open roles, stages, candidates, and owners — mock recruiting board." />
      <Section title="Open roles" subtitle={`${data.hiringRoles.length} roles`}>
        <div className="card-grid" data-testid="hiring-board">
          {data.hiringRoles.map((role) => (
            <article className="entity-card" key={role.id}>
              <header>
                <div>
                  <strong>{role.role}</strong>
                  <span>
                    {role.candidates} candidates · {role.owner}
                  </span>
                </div>
                <StatusPill label={role.stage} tone={role.stage === 'Offer' ? 'positive' : role.stage === 'Open' ? 'neutral' : 'accent'} />
              </header>
              <small>Target · {role.targetDate}</small>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
