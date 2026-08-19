import { Link, useParams } from 'react-router-dom'
import { PageHeader, ProgressBar, Section, StatusPill } from '../components/Ui'
import { useProduct } from '../state/ProductContext'
import { deriveProjectHealth, isOverdue } from '../product/statusLogic'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const {
    state,
    updateProject,
    createMilestone,
    createTask,
    assignTask,
    changePriority,
    setTaskStatus,
    completeTask,
    recordBlocker,
    logRisk,
    logIssue,
    requestApproval,
    recordDecision,
    addComment,
    attachDocument,
  } = useProduct()

  const project = state.projects.find((item) => item.id === projectId)
  if (!project) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Project detail" title="Project not found" description="Return to the portfolio to select a project." />
        <Link to="/portfolio">Back to portfolio</Link>
      </div>
    )
  }

  const health = deriveProjectHealth(project, state.tasks)
  const milestones = state.milestones.filter((item) => item.projectId === project.id)
  const tasks = state.tasks.filter((item) => item.projectId === project.id)
  const risks = state.risks.filter((item) => item.projectId === project.id)
  const issues = state.issues.filter((item) => item.projectId === project.id)
  const approvals = state.approvals.filter((item) => item.projectId === project.id)
  const decisions = state.decisions.filter((item) => item.projectId === project.id)
  const comments = state.comments.filter((item) => item.projectId === project.id)
  const documents = state.documents.filter((item) => item.projectId === project.id)
  const activity = state.activity.filter((item) => item.projectId === project.id)

  return (
    <div className="page-stack" data-testid="project-detail">
      <PageHeader
        eyebrow="Project detail"
        title={project.name}
        description={project.summary}
        action={
          <div className="toolbar-inline">
            <Link to="/portfolio">← Portfolio</Link>
            <StatusPill label={health} tone={health === 'Green' ? 'positive' : health === 'Yellow' ? 'warning' : 'critical'} />
          </div>
        }
      />

      <div className="split-grid">
        <Section title="Ownership & status" subtitle="Clear owner · next action">
          <dl className="detail-facts">
            <div>
              <dt>Owner</dt>
              <dd>{project.owner}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{project.client ?? 'Internal'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <select aria-label="Project status" value={project.status} onChange={(event) => updateProject(project.id, { status: event.target.value as typeof project.status })}>
                  {['Not Started', 'In Progress', 'On Track', 'At Risk', 'Blocked', 'Awaiting Approval', 'Completed', 'Archived'].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd className={isOverdue(project.dueDate, project.status) ? 'overdue' : undefined}>{project.dueDate}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{project.nextAction}</dd>
            </div>
          </dl>
          <ProgressBar value={project.percentComplete} label="Project progress" />
          <div className="action-row">
            <button type="button" className="ghost-button compact" onClick={() => createMilestone(project.id, `Milestone ${milestones.length + 1}`, '2026-08-01', state.currentUser)}>
              Create milestone
            </button>
            <button
              type="button"
              className="ghost-button compact"
              data-testid="create-task-detail"
              onClick={() => createTask({ projectId: project.id, title: `Task ${tasks.length + 1}`, assignee: state.currentUser, dueDate: '2026-07-25', priority: 'High' })}
            >
              Create task
            </button>
            <button type="button" className="ghost-button compact" onClick={() => recordBlocker(project.id, 'New blocker logged', state.currentUser)}>
              Record blocker
            </button>
            <button type="button" className="ghost-button compact" onClick={() => logRisk(project.id, 'New risk logged', state.currentUser, 'Medium')}>
              Log risk
            </button>
            <button type="button" className="ghost-button compact" onClick={() => logIssue(project.id, 'New issue logged', state.currentUser)}>
              Log issue
            </button>
            <button type="button" className="ghost-button compact" onClick={() => requestApproval(project.id, `Approval for ${project.name}`, state.currentUser, 'Manny Barela')}>
              Request approval
            </button>
            <button type="button" className="ghost-button compact" onClick={() => recordDecision(project.id, 'Operating decision', 'Proceed with current plan', state.currentUser)}>
              Record decision
            </button>
            <button type="button" className="ghost-button compact" onClick={() => addComment(project.id, 'project', project.id, state.currentUser, 'Status note captured.')}>
              Comment
            </button>
            <button type="button" className="ghost-button compact" onClick={() => attachDocument(project.id, 'project', project.id, `attachment-${documents.length + 1}.pdf`, state.currentUser)}>
              Attach document
            </button>
          </div>
        </Section>

        <Section title="Workload" subtitle="Assignees on this project">
          <ul className="simple-list">
            {Array.from(new Set(tasks.map((task) => task.assignee))).map((assignee) => {
              const open = tasks.filter((task) => task.assignee === assignee && task.status !== 'Completed').length
              return (
                <li key={assignee}>
                  <strong>{assignee}</strong> — {open} open
                </li>
              )
            })}
          </ul>
        </Section>
      </div>

      <Section title="Milestones" subtitle={`${milestones.length} milestones`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((milestone) => (
                <tr key={milestone.id}>
                  <td>{milestone.title}</td>
                  <td>{milestone.owner}</td>
                  <td>{milestone.dueDate}</td>
                  <td>
                    <StatusPill label={milestone.status} />
                  </td>
                  <td>
                    <ProgressBar value={milestone.percentComplete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Tasks & dependencies" subtitle="Assign, prioritize, complete">
        <div className="table-wrap">
          <table data-testid="detail-tasks">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Depends on</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <div className="muted">{task.nextAction}</div>
                  </td>
                  <td>
                    <select aria-label={`Assignee ${task.title}`} value={task.assignee} onChange={(event) => assignTask(task.id, event.target.value)}>
                      {['Manny Barela', 'Alex Rivera', 'Jordan Lee', 'Casey Nguyen', 'Riley Chen', 'Sam Okonkwo'].map((user) => (
                        <option key={user}>{user}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Priority ${task.title}`} value={task.priority} onChange={(event) => changePriority(task.id, event.target.value as typeof task.priority)}>
                      {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`Status ${task.title}`} value={task.status} onChange={(event) => setTaskStatus(task.id, event.target.value as typeof task.status)}>
                      {['Not Started', 'In Progress', 'On Track', 'At Risk', 'Blocked', 'Awaiting Approval', 'Completed', 'Archived'].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className={isOverdue(task.dueDate, task.status) ? 'overdue' : undefined}>{task.dueDate}</td>
                  <td>{task.dependsOn.join(', ') || '—'}</td>
                  <td>
                    {task.status !== 'Completed' && (
                      <button type="button" className="ghost-button compact" onClick={() => completeTask(task.id)}>
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="split-grid">
        <Section title="Risks & issues" subtitle="Escalations">
          <ul className="item-list">
            {risks.map((risk) => (
              <li key={risk.id}>
                <div>
                  <strong>Risk · {risk.title}</strong>
                  <span>
                    {risk.owner} · {risk.severity}
                  </span>
                </div>
                <StatusPill label={risk.status} tone="warning" />
              </li>
            ))}
            {issues.map((issue) => (
              <li key={issue.id}>
                <div>
                  <strong>
                    {issue.blocker ? 'Blocker' : 'Issue'} · {issue.title}
                  </strong>
                  <span>{issue.owner}</span>
                </div>
                <StatusPill label={issue.status} tone={issue.blocker ? 'critical' : 'accent'} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Approvals & decisions" subtitle="History preserved">
          <ul className="item-list">
            {approvals.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.requester} → {item.approver}
                  </span>
                </div>
                <StatusPill label={item.status} tone={item.status === 'Approved' ? 'positive' : item.status === 'Rejected' ? 'critical' : 'warning'} />
              </li>
            ))}
            {decisions.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.decision}</span>
                </div>
                <StatusPill label={item.owner} tone="neutral" />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="split-grid">
        <Section title="Comments & documents" subtitle="Collaboration">
          <ul className="simple-list">
            {comments.map((item) => (
              <li key={item.id}>
                <strong>{item.author}</strong>: {item.body}
              </li>
            ))}
            {documents.map((item) => (
              <li key={item.id}>
                📎 {item.name} · {item.attachedBy}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Activity history" subtitle="Immutable event log (session)">
          <ul className="item-list" data-testid="activity-feed">
            {activity.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>
                    {item.actor} {item.action}
                  </strong>
                  <span>{item.detail}</span>
                </div>
                <StatusPill label={new Date(item.at).toLocaleString()} tone="neutral" />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}
