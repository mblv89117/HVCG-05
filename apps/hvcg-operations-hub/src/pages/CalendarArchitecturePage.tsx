import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function CalendarArchitecturePage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Calendar integration architecture"
        title="Calendar integration architecture"
        description="Design-only decisions for future calendar adapters. No live Graph/Google/MeetSync connections."
      />
      <Section title="Architecture decisions" subtitle="Development boundary — no production integrations">
        <ul className="item-list" data-testid="calendar-arch">
          {data.calendarArchitecture.map((item) => (
            <li key={item.id}>
              <div>
                <strong>
                  {item.layer}: {item.decision}
                </strong>
                <span>{item.note}</span>
              </div>
              <StatusPill label={item.status} tone={item.status === 'Designed' ? 'positive' : item.status === 'Planned' ? 'accent' : 'neutral'} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
