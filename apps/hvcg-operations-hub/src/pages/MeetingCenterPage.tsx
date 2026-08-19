import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function MeetingCenterPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Meeting center" title="Meeting center" description="Upcoming standups, gates, hiring panels, and reviews — mock schedule, no live calendar." />
      <Section title="Agenda" subtitle={`${data.meetings.length} meetings`}>
        <ul className="item-list" data-testid="meeting-list">
          {data.meetings.map((meeting) => (
            <li key={meeting.id}>
              <div>
                <strong>{meeting.title}</strong>
                <span>
                  {meeting.attendees}
                  {meeting.location ? ` · ${meeting.location}` : ''}
                </span>
              </div>
              <div className="pill-stack">
                {meeting.type && <StatusPill label={meeting.type} tone="accent" />}
                <StatusPill label={meeting.when} tone="neutral" />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
