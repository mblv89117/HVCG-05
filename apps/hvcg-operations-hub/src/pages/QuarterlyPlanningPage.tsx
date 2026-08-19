import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function QuarterlyPlanningPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Quarterly planning" title="Quarterly objectives board" description="Company and ops objectives with progress — planning mock only." />
      <Section title="Objectives" subtitle={`${data.quarterlyPlans.length} items`}>
        <div className="table-wrap">
          <table data-testid="quarterly-table">
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Objective</th>
                <th>Owner</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.quarterlyPlans.map((item) => (
                <tr key={item.id}>
                  <td>{item.quarter}</td>
                  <td>{item.objective}</td>
                  <td>{item.owner}</td>
                  <td>
                    <ProgressBar value={item.progress} />
                  </td>
                  <td>
                    <StatusPill label={item.status} tone={item.status === 'On track' ? 'positive' : item.status === 'At risk' ? 'warning' : 'neutral'} />
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
