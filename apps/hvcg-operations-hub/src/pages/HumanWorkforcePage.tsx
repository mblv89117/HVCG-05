import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const typeTone = {
  Employee: 'positive',
  Contractor: 'accent',
  Advisor: 'neutral',
} as const

export function HumanWorkforcePage() {
  const { data } = useOps()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Human workforce"
        title="People capacity board"
        description="Employees, contractors, and advisors with assignments, capacity, and skills."
      />
      <Section title="Workforce roster" subtitle={`${data.humanWorkforce.length} people`}>
        <div className="card-grid" data-testid="human-roster">
          {data.humanWorkforce.map((person) => (
            <article className="entity-card" key={person.id}>
              <header>
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.assignment}</span>
                </div>
                <StatusPill label={person.type} tone={typeTone[person.type]} />
              </header>
              <ProgressBar value={person.utilization} label={`${person.name} utilization`} />
              <small>
                {person.utilization}% of {person.capacity}% capacity
              </small>
              <div className="skill-row">
                {person.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
