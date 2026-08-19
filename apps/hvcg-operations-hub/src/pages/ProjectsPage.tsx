import { Link } from 'react-router-dom'
import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const statusTone = {
  'On track': 'positive',
  'At risk': 'warning',
  Blocked: 'critical',
  Complete: 'accent',
} as const

export function ProjectsPage() {
  const { data } = useOps()
  const client = data.projects.filter((project) => project.kind === 'Client')
  const internal = data.projects.filter((project) => project.kind === 'Internal')

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Project dashboard"
        title="Active project board"
        description="Legacy snapshot board. Canonical workflows live in Portfolio (create, assign, approve, escalate)."
        action={<Link to="/portfolio">Open Portfolio →</Link>}
      />
      <Section title="Client projects" subtitle={`${client.length} active or recent`}>
        <div className="table-wrap">
          <table data-testid="projects-client">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {client.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.client}</td>
                  <td>
                    <StatusPill label={project.status} tone={statusTone[project.status]} />
                  </td>
                  <td>{project.priority}</td>
                  <td>
                    <ProgressBar value={project.progress} />
                  </td>
                  <td>{project.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Internal projects" subtitle={`${internal.length} active or recent`}>
        <div className="table-wrap">
          <table data-testid="projects-internal">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {internal.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>
                    <StatusPill label={project.status} tone={statusTone[project.status]} />
                  </td>
                  <td>{project.priority}</td>
                  <td>
                    <ProgressBar value={project.progress} />
                  </td>
                  <td>{project.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
