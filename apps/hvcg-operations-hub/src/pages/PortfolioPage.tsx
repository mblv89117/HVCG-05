import { Link } from 'react-router-dom'
import { MetricCard, PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useProduct } from '../state/ProductContext'
import type { PortfolioView } from '../product/types'
import { isOverdue } from '../product/statusLogic'

const views: { id: PortfolioView; label: string }[] = [
  { id: 'executive', label: 'Executive Portfolio' },
  { id: 'my-work', label: 'My Work' },
  { id: 'my-projects', label: 'My Projects' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'awaiting-approval', label: 'Awaiting Approval' },
  { id: 'recently-updated', label: 'Recently Updated' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

export function PortfolioPage() {
  const {
    state,
    view,
    setView,
    query,
    setQuery,
    metrics,
    visibleProjects,
    visibleTasks,
    createProject,
    createTask,
    completeTask,
    decideApproval,
    setCurrentUser,
  } = useProduct()

  const pendingApprovals = state.approvals.filter((item) => item.status === 'Pending')

  return (
    <div className="page-stack" data-testid="portfolio-page">
      <PageHeader
        eyebrow="Operations command center"
        title="Project portfolio"
        description="Projects, tasks, approvals, risks, and escalations in one system — next action first."
        action={
          <div className="toolbar-inline">
            <label>
              Acting as
              <select aria-label="Current user" value={state.currentUser} onChange={(event) => setCurrentUser(event.target.value)} data-testid="current-user">
                {['Manny Barela', 'Alex Rivera', 'Jordan Lee', 'Casey Nguyen', 'Riley Chen', 'Sam Okonkwo'].map((user) => (
                  <option key={user}>{user}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ghost-button"
              data-testid="create-project"
              onClick={() =>
                createProject({
                  name: `New project ${state.projects.length + 1}`,
                  owner: state.currentUser,
                  dueDate: '2026-08-15',
                  priority: 'Medium',
                })
              }
            >
              Create project
            </button>
          </div>
        }
      />

      <div className="metric-grid" data-testid="portfolio-metrics">
        <MetricCard metric={{ id: 'active', label: 'Active projects', value: String(metrics.activeProjects), detail: 'Excludes archived/complete', tone: 'accent' }} />
        <MetricCard metric={{ id: 'risk', label: 'At risk', value: String(metrics.atRisk), detail: 'Health yellow/red', tone: 'warning' }} />
        <MetricCard metric={{ id: 'blocked', label: 'Blocked tasks', value: String(metrics.blocked), detail: 'Escalate ownership', tone: 'critical' }} />
        <MetricCard metric={{ id: 'overdue', label: 'Overdue', value: String(metrics.overdue), detail: 'Past due date', tone: 'critical' }} />
        <MetricCard metric={{ id: 'approvals', label: 'Awaiting approval', value: String(metrics.awaitingApproval), detail: 'Decision queue', tone: 'warning' }} />
        <MetricCard metric={{ id: 'mine', label: 'My open tasks', value: String(metrics.myOpenTasks), detail: state.currentUser, tone: 'positive' }} />
      </div>

      <div className="view-tabs" role="tablist" aria-label="Portfolio views">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            className={view === item.id ? 'active' : undefined}
            data-testid={`view-${item.id}`}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="search inline">
          <input aria-label="Search portfolio" placeholder="Search projects and tasks…" value={query} onChange={(event) => setQuery(event.target.value)} data-testid="portfolio-search" />
        </label>
      </div>

      <div className="split-grid">
        <Section title="Projects" subtitle={`${visibleProjects.length} in ${views.find((item) => item.id === view)?.label}`}>
          <div className="table-wrap">
            <table data-testid="portfolio-projects">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Due</th>
                  <th>Next action</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <strong>{project.name}</strong>
                      <div className="muted">{project.client ?? 'Internal'}</div>
                    </td>
                    <td>{project.owner}</td>
                    <td>
                      <StatusPill label={project.status} tone={statusTone(project.status)} />
                    </td>
                    <td>
                      <StatusPill label={project.health} tone={project.health === 'Green' ? 'positive' : project.health === 'Yellow' ? 'warning' : 'critical'} />
                    </td>
                    <td className={isOverdue(project.dueDate, project.status) ? 'overdue' : undefined}>{project.dueDate}</td>
                    <td>{project.nextAction}</td>
                    <td>
                      <Link to={`/portfolio/${project.id}`} data-testid={`open-project-${project.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Work queue" subtitle={`${visibleTasks.length} tasks · next action surfaced`}>
          <ul className="item-list" data-testid="portfolio-tasks">
            {visibleTasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.assignee} · due {task.dueDate}
                    {task.recurring ? ` · ${task.recurrence}` : ''}
                  </span>
                  <p className="next-action">Next: {task.nextAction}</p>
                </div>
                <div className="pill-stack">
                  <StatusPill label={task.status} tone={statusTone(task.status)} />
                  <StatusPill label={task.priority} tone="accent" />
                  {task.status !== 'Completed' && (
                    <button type="button" className="ghost-button compact" onClick={() => completeTask(task.id)} data-testid={`complete-${task.id}`}>
                      Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {view === 'my-work' && (
            <button
              type="button"
              className="ghost-button"
              style={{ marginTop: 12 }}
              data-testid="quick-create-task"
              onClick={() => {
                const project = state.projects.find((item) => item.owner === state.currentUser && !item.archived) ?? state.projects[0]
                if (project) createTask({ projectId: project.id, title: 'Follow-up action', assignee: state.currentUser, dueDate: '2026-07-22', priority: 'High' })
              }}
            >
              Create task
            </button>
          )}
        </Section>
      </div>

      <Section title="Approvals" subtitle="Approve or reject — ownership clear">
        <ul className="item-list" data-testid="approval-queue">
          {pendingApprovals.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.requester} → {item.approver}
                </span>
              </div>
              <div className="pill-stack">
                <button type="button" className="ghost-button compact" data-testid={`approve-${item.id}`} onClick={() => decideApproval(item.id, 'Approved')}>
                  Approve
                </button>
                <button type="button" className="ghost-button compact" data-testid={`reject-${item.id}`} onClick={() => decideApproval(item.id, 'Rejected', 'Needs revision')}>
                  Reject
                </button>
              </div>
            </li>
          ))}
          {pendingApprovals.length === 0 && <li className="empty-state">No pending approvals.</li>}
        </ul>
      </Section>
    </div>
  )
}

function statusTone(status: string) {
  if (status === 'Blocked') return 'critical'
  if (status === 'At Risk' || status === 'Awaiting Approval') return 'warning'
  if (status === 'Completed' || status === 'On Track') return 'positive'
  if (status === 'In Progress') return 'accent'
  return 'neutral'
}
