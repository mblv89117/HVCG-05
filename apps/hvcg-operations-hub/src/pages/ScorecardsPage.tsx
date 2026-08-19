import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const tone = { Green: 'positive', Yellow: 'warning', Red: 'critical' } as const

export function ScorecardsPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Daily scorecards" title="Daily performance scorecards" description="Owner-level daily targets versus actuals — mock operational scoreboard." />
      <Section title="Today’s scorecard" subtitle={`${data.scorecards.length} owners`}>
        <div className="table-wrap">
          <table data-testid="scorecards-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Metric</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.scorecards.map((row) => (
                <tr key={row.id}>
                  <td>{row.owner}</td>
                  <td>{row.metric}</td>
                  <td>{row.target}</td>
                  <td>{row.actual}</td>
                  <td>
                    <StatusPill label={row.status} tone={tone[row.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
