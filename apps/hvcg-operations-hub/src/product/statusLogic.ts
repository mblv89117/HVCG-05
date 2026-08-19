import type { PortfolioView, ProductState, ProjectItem, TaskItem, WorkStatus } from './types'

const today = () => '2026-07-20'

export function isOverdue(dueDate: string, status: WorkStatus): boolean {
  if (status === 'Completed' || status === 'Archived') return false
  return dueDate < today()
}

export function deriveProjectHealth(project: ProjectItem, tasks: TaskItem[]): ProjectItem['health'] {
  const projectTasks = tasks.filter((task) => task.projectId === project.id)
  if (project.status === 'Blocked' || projectTasks.some((task) => task.status === 'Blocked')) return 'Red'
  if (project.status === 'At Risk' || projectTasks.some((task) => task.status === 'At Risk' || isOverdue(task.dueDate, task.status))) return 'Yellow'
  return 'Green'
}

export function deriveProjectStatus(project: ProjectItem, tasks: TaskItem[]): WorkStatus {
  if (project.archived || project.status === 'Archived') return 'Archived'
  if (project.status === 'Completed') return 'Completed'
  const projectTasks = tasks.filter((task) => task.projectId === project.id && task.status !== 'Completed' && task.status !== 'Archived')
  if (projectTasks.some((task) => task.status === 'Blocked')) return 'Blocked'
  if (projectTasks.some((task) => task.status === 'Awaiting Approval')) return 'Awaiting Approval'
  if (projectTasks.some((task) => task.status === 'At Risk' || isOverdue(task.dueDate, task.status))) return 'At Risk'
  if (projectTasks.some((task) => task.status === 'In Progress' || task.status === 'On Track')) return project.status === 'Not Started' ? 'In Progress' : project.status
  return project.status
}

export function filterProjects(state: ProductState, view: PortfolioView, query = ''): ProjectItem[] {
  const q = query.trim().toLowerCase()
  let list = state.projects.map((project) => ({
    ...project,
    health: deriveProjectHealth(project, state.tasks),
    status: deriveProjectStatus(project, state.tasks),
  }))

  switch (view) {
    case 'executive':
      list = list.filter((project) => !project.archived && project.status !== 'Archived')
      break
    case 'my-projects':
      list = list.filter((project) => !project.archived && project.owner === state.currentUser)
      break
    case 'at-risk':
      list = list.filter((project) => project.status === 'At Risk' || project.health === 'Yellow')
      break
    case 'blocked':
      list = list.filter((project) => project.status === 'Blocked' || project.health === 'Red')
      break
    case 'overdue':
      list = list.filter((project) => isOverdue(project.dueDate, project.status))
      break
    case 'awaiting-approval':
      list = list.filter((project) => state.approvals.some((item) => item.projectId === project.id && item.status === 'Pending'))
      break
    case 'recently-updated':
      list = [...list].filter((project) => !project.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
      break
    case 'completed':
      list = list.filter((project) => project.status === 'Completed' && !project.archived)
      break
    case 'archived':
      list = list.filter((project) => project.archived || project.status === 'Archived')
      break
    case 'my-work':
      list = list.filter((project) => state.tasks.some((task) => task.projectId === project.id && task.assignee === state.currentUser && task.status !== 'Completed'))
      break
    default:
      break
  }

  if (!q) return list
  return list.filter((project) => `${project.name} ${project.client ?? ''} ${project.owner} ${project.nextAction}`.toLowerCase().includes(q))
}

export function filterTasks(state: ProductState, view: PortfolioView, query = ''): TaskItem[] {
  const q = query.trim().toLowerCase()
  let list = [...state.tasks]

  switch (view) {
    case 'my-work':
      list = list.filter((task) => task.assignee === state.currentUser && task.status !== 'Completed' && task.status !== 'Archived')
      break
    case 'at-risk':
      list = list.filter((task) => task.status === 'At Risk')
      break
    case 'blocked':
      list = list.filter((task) => task.status === 'Blocked')
      break
    case 'overdue':
      list = list.filter((task) => isOverdue(task.dueDate, task.status))
      break
    case 'awaiting-approval':
      list = list.filter((task) => task.status === 'Awaiting Approval')
      break
    case 'completed':
      list = list.filter((task) => task.status === 'Completed')
      break
    case 'archived':
      list = list.filter((task) => task.status === 'Archived')
      break
    case 'recently-updated':
      list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12)
      break
    default:
      list = list.filter((task) => task.status !== 'Archived')
  }

  if (!q) return list
  return list.filter((task) => `${task.title} ${task.assignee} ${task.nextAction}`.toLowerCase().includes(q))
}

export function portfolioMetrics(state: ProductState) {
  const active = state.projects.filter((project) => !project.archived && project.status !== 'Archived' && project.status !== 'Completed')
  const overdueTasks = state.tasks.filter((task) => isOverdue(task.dueDate, task.status))
  const blocked = state.tasks.filter((task) => task.status === 'Blocked')
  const pendingApprovals = state.approvals.filter((item) => item.status === 'Pending')
  const atRisk = active.filter((project) => deriveProjectHealth(project, state.tasks) !== 'Green')
  return {
    activeProjects: active.length,
    atRisk: atRisk.length,
    blocked: blocked.length,
    overdue: overdueTasks.length,
    awaitingApproval: pendingApprovals.length,
    myOpenTasks: state.tasks.filter((task) => task.assignee === state.currentUser && task.status !== 'Completed' && task.status !== 'Archived').length,
  }
}
