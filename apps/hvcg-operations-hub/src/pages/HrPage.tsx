import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function HrPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="HR" title="Human resources roster" description="Employees, departments, managers, and employment status — mock HR register." />
      <Section title="People" subtitle={`${data.hrRoster.length} records`}>
        <div className="table-wrap">
          <table data-testid="hr-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Title</th>
                <th>Manager</th>
                <th>Start</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.hrRoster.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.department}</td>
                  <td>{person.title}</td>
                  <td>{person.manager}</td>
                  <td>{person.startDate}</td>
                  <td>
                    <StatusPill label={person.status} tone={person.status === 'Active' ? 'positive' : person.status === 'On leave' ? 'warning' : 'critical'} />
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
