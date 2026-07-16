import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const availabilityTone = {
  Available: 'positive',
  Busy: 'warning',
  PTO: 'neutral',
  Limited: 'accent',
} as const

export function TeamPage() {
  const { data } = useOps()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Team dashboard"
        title="Team capacity & availability"
        description="Members, roles, workload, and focus areas for the operations pod."
      />
      <Section title="Team roster" subtitle="Workload vs capacity">
        <div className="card-grid" data-testid="team-roster">
          {data.team.map((member) => (
            <article className="entity-card" key={member.id}>
              <header>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <StatusPill label={member.availability} tone={availabilityTone[member.availability]} />
              </header>
              <p>{member.focus}</p>
              <ProgressBar value={member.workload} label={`${member.name} workload`} />
              <small>
                {member.workload}% of {member.capacity}% capacity
              </small>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
