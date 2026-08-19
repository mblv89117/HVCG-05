import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function TrainingPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Training" title="Training & compliance" description="Course completion, audiences, and due dates — mock learning register." />
      <Section title="Courses" subtitle={`${data.training.length} courses`}>
        <div className="table-wrap">
          <table data-testid="training-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Audience</th>
                <th>Completion</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.training.map((item) => (
                <tr key={item.id}>
                  <td>{item.course}</td>
                  <td>{item.audience}</td>
                  <td>
                    <ProgressBar value={item.completion} />
                  </td>
                  <td>{item.due}</td>
                  <td>
                    <StatusPill label={item.status} tone={item.status === 'Complete' ? 'positive' : item.status === 'Overdue' ? 'critical' : 'accent'} />
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
