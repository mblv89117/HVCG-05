import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const healthTone = {
  Healthy: 'positive',
  Watch: 'warning',
  Blocked: 'critical',
  Idle: 'neutral',
} as const

export function AiWorkforcePage() {
  const { data } = useOps()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="AI workforce"
        title="Agent fleet status"
        description="Master PM, Revenue, Portal, ECC, Finance, Deployment, QA, and Documentation agents — mock status only."
      />
      <Section title="Agents" subtitle="Status, sprint, commit, branch, health, current task">
        <div className="table-wrap">
          <table data-testid="ai-agents">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Sprint</th>
                <th>Last commit</th>
                <th>Branch</th>
                <th>Health</th>
                <th>Current task</th>
              </tr>
            </thead>
            <tbody>
              {data.aiAgents.map((agent) => (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>
                    <StatusPill label={agent.status} tone={agent.status === 'Blocked' ? 'critical' : agent.status === 'In progress' ? 'accent' : 'neutral'} />
                  </td>
                  <td>{agent.sprint}</td>
                  <td>
                    <code>{agent.lastCommit}</code>
                  </td>
                  <td>
                    <code>{agent.branch}</code>
                  </td>
                  <td>
                    <StatusPill label={agent.health} tone={healthTone[agent.health]} />
                  </td>
                  <td>{agent.currentTask}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
