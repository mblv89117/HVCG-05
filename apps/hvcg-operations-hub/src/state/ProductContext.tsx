import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { productSeed } from '../product/seedData'
import { filterProjects, filterTasks, portfolioMetrics } from '../product/statusLogic'
import type {
  ActivityEvent,
  ApprovalDecision,
  PortfolioView,
  Priority,
  ProductState,
  WorkStatus,
} from '../product/types'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function stamp() {
  return new Date().toISOString()
}

interface ProductContextValue {
  state: ProductState
  view: PortfolioView
  setView: (view: PortfolioView) => void
  query: string
  setQuery: (value: string) => void
  metrics: ReturnType<typeof portfolioMetrics>
  visibleProjects: ReturnType<typeof filterProjects>
  visibleTasks: ReturnType<typeof filterTasks>
  setCurrentUser: (user: string) => void
  createProject: (input: { name: string; owner: string; dueDate: string; client?: string; priority?: Priority }) => string
  updateProject: (projectId: string, patch: Partial<ProductState['projects'][number]>) => void
  createMilestone: (projectId: string, title: string, dueDate: string, owner: string) => void
  createTask: (input: { projectId: string; title: string; assignee: string; dueDate: string; priority?: Priority; milestoneId?: string }) => string
  assignTask: (taskId: string, assignee: string) => void
  changePriority: (taskId: string, priority: Priority) => void
  setTaskStatus: (taskId: string, status: WorkStatus) => void
  completeTask: (taskId: string) => void
  recordBlocker: (projectId: string, title: string, owner: string) => void
  logRisk: (projectId: string, title: string, owner: string, severity: 'Low' | 'Medium' | 'High' | 'Critical') => void
  logIssue: (projectId: string, title: string, owner: string, blocker?: boolean) => void
  requestApproval: (projectId: string, title: string, requester: string, approver: string, taskId?: string) => void
  decideApproval: (approvalId: string, decision: Exclude<ApprovalDecision, 'Pending'>, note?: string) => void
  recordDecision: (projectId: string, title: string, decision: string, owner: string) => void
  addComment: (projectId: string, entityType: 'project' | 'task' | 'approval' | 'risk' | 'issue', entityId: string, author: string, body: string) => void
  attachDocument: (projectId: string, entityType: 'project' | 'task' | 'approval', entityId: string, name: string, attachedBy: string) => void
}

const ProductContext = createContext<ProductContextValue | null>(null)

function pushActivity(state: ProductState, event: Omit<ActivityEvent, 'id' | 'at'>): ProductState {
  return {
    ...state,
    activity: [{ id: uid('act'), at: stamp(), ...event }, ...state.activity],
  }
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProductState>(productSeed)
  const [view, setView] = useState<PortfolioView>('executive')
  const [query, setQuery] = useState('')

  const metrics = useMemo(() => portfolioMetrics(state), [state])
  const visibleProjects = useMemo(() => filterProjects(state, view, query), [state, view, query])
  const visibleTasks = useMemo(() => filterTasks(state, view, query), [state, view, query])

  const value = useMemo<ProductContextValue>(
    () => ({
      state,
      view,
      setView,
      query,
      setQuery,
      metrics,
      visibleProjects,
      visibleTasks,
      setCurrentUser: (user) => setState((current) => ({ ...current, currentUser: user })),
      createProject: (input) => {
        const id = uid('p')
        setState((current) =>
          pushActivity(
            {
              ...current,
              projects: [
                {
                  id,
                  name: input.name,
                  client: input.client,
                  owner: input.owner,
                  status: 'Not Started',
                  health: 'Green',
                  priority: input.priority ?? 'Medium',
                  percentComplete: 0,
                  startDate: todayDate(),
                  dueDate: input.dueDate,
                  nextAction: 'Define first milestone',
                  tags: ['new'],
                  archived: false,
                  updatedAt: stamp(),
                  summary: 'Newly created project',
                },
                ...current.projects,
              ],
            },
            { entityType: 'project', entityId: id, projectId: id, actor: current.currentUser, action: 'created project', detail: input.name },
          ),
        )
        return id
      },
      updateProject: (projectId, patch) => {
        setState((current) =>
          pushActivity(
            {
              ...current,
              projects: current.projects.map((project) => (project.id === projectId ? { ...project, ...patch, updatedAt: stamp() } : project)),
            },
            { entityType: 'project', entityId: projectId, projectId, actor: current.currentUser, action: 'updated project', detail: Object.keys(patch).join(', ') },
          ),
        )
      },
      createMilestone: (projectId, title, dueDate, owner) => {
        const id = uid('m')
        setState((current) =>
          pushActivity(
            {
              ...current,
              milestones: [...current.milestones, { id, projectId, title, dueDate, owner, status: 'Not Started', percentComplete: 0 }],
            },
            { entityType: 'milestone', entityId: id, projectId, actor: current.currentUser, action: 'created milestone', detail: title },
          ),
        )
      },
      createTask: (input) => {
        const id = uid('t')
        setState((current) =>
          pushActivity(
            {
              ...current,
              tasks: [
                {
                  id,
                  projectId: input.projectId,
                  milestoneId: input.milestoneId,
                  title: input.title,
                  description: '',
                  status: 'Not Started',
                  priority: input.priority ?? 'Medium',
                  assignee: input.assignee,
                  dueDate: input.dueDate,
                  dependsOn: [],
                  nextAction: 'Start work',
                  updatedAt: stamp(),
                },
                ...current.tasks,
              ],
            },
            { entityType: 'task', entityId: id, projectId: input.projectId, actor: current.currentUser, action: 'created task', detail: input.title },
          ),
        )
        return id
      },
      assignTask: (taskId, assignee) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId)
          if (!task) return current
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, assignee, updatedAt: stamp(), nextAction: `Owned by ${assignee}` } : item)),
            },
            { entityType: 'task', entityId: taskId, projectId: task.projectId, actor: current.currentUser, action: 'assigned task', detail: assignee },
          )
        })
      },
      changePriority: (taskId, priority) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId)
          if (!task) return current
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, priority, updatedAt: stamp() } : item)),
            },
            { entityType: 'task', entityId: taskId, projectId: task.projectId, actor: current.currentUser, action: 'changed priority', detail: priority },
          )
        })
      },
      setTaskStatus: (taskId, status) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId)
          if (!task) return current
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, status, updatedAt: stamp(), nextAction: status === 'Completed' ? 'Done' : item.nextAction } : item)),
            },
            { entityType: 'task', entityId: taskId, projectId: task.projectId, actor: current.currentUser, action: 'changed status', detail: status },
          )
        })
      },
      completeTask: (taskId) => {
        setState((current) => {
          const task = current.tasks.find((item) => item.id === taskId)
          if (!task) return current
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, status: 'Completed', nextAction: 'Done', updatedAt: stamp() } : item)),
            },
            { entityType: 'task', entityId: taskId, projectId: task.projectId, actor: current.currentUser, action: 'completed task', detail: task.title },
          )
        })
      },
      recordBlocker: (projectId, title, owner) => {
        const id = uid('i')
        setState((current) =>
          pushActivity(
            {
              ...current,
              issues: [{ id, projectId, title, severity: 'High', owner, status: 'Blocked', blocker: true }, ...current.issues],
              projects: current.projects.map((project) => (project.id === projectId ? { ...project, status: 'Blocked', health: 'Red', nextAction: title, updatedAt: stamp() } : project)),
            },
            { entityType: 'issue', entityId: id, projectId, actor: current.currentUser, action: 'recorded blocker', detail: title },
          ),
        )
      },
      logRisk: (projectId, title, owner, severity) => {
        const id = uid('r')
        setState((current) =>
          pushActivity(
            {
              ...current,
              risks: [{ id, projectId, title, severity, owner, status: 'At Risk', mitigation: 'TBD' }, ...current.risks],
              projects: current.projects.map((project) => (project.id === projectId ? { ...project, status: 'At Risk', health: 'Yellow', updatedAt: stamp() } : project)),
            },
            { entityType: 'risk', entityId: id, projectId, actor: current.currentUser, action: 'logged risk', detail: title },
          ),
        )
      },
      logIssue: (projectId, title, owner, blocker = false) => {
        const id = uid('i')
        setState((current) =>
          pushActivity(
            {
              ...current,
              issues: [{ id, projectId, title, severity: blocker ? 'High' : 'Medium', owner, status: blocker ? 'Blocked' : 'In Progress', blocker }, ...current.issues],
            },
            { entityType: 'issue', entityId: id, projectId, actor: current.currentUser, action: 'logged issue', detail: title },
          ),
        )
      },
      requestApproval: (projectId, title, requester, approver, taskId) => {
        const id = uid('a')
        setState((current) =>
          pushActivity(
            {
              ...current,
              approvals: [{ id, projectId, taskId, title, requester, approver, status: 'Pending', requestedAt: stamp() }, ...current.approvals],
              tasks: taskId
                ? current.tasks.map((task) => (task.id === taskId ? { ...task, status: 'Awaiting Approval', updatedAt: stamp(), nextAction: `Awaiting ${approver}` } : task))
                : current.tasks,
            },
            { entityType: 'approval', entityId: id, projectId, actor: current.currentUser, action: 'requested approval', detail: title },
          ),
        )
      },
      decideApproval: (approvalId, decision, note) => {
        setState((current) => {
          const approval = current.approvals.find((item) => item.id === approvalId)
          if (!approval) return current
          return pushActivity(
            {
              ...current,
              approvals: current.approvals.map((item) => (item.id === approvalId ? { ...item, status: decision, decidedAt: stamp(), note: note ?? item.note } : item)),
              tasks: approval.taskId
                ? current.tasks.map((task) =>
                    task.id === approval.taskId
                      ? { ...task, status: decision === 'Approved' ? 'In Progress' : 'At Risk', updatedAt: stamp(), nextAction: decision === 'Approved' ? 'Continue work' : 'Revise and resubmit' }
                      : task,
                  )
                : current.tasks,
            },
            { entityType: 'approval', entityId: approvalId, projectId: approval.projectId, actor: current.currentUser, action: decision === 'Approved' ? 'approved' : 'rejected', detail: approval.title },
          )
        })
      },
      recordDecision: (projectId, title, decision, owner) => {
        const id = uid('d')
        setState((current) =>
          pushActivity(
            {
              ...current,
              decisions: [{ id, projectId, title, decision, owner, at: stamp(), status: 'Completed' }, ...current.decisions],
            },
            { entityType: 'decision', entityId: id, projectId, actor: current.currentUser, action: 'recorded decision', detail: title },
          ),
        )
      },
      addComment: (projectId, entityType, entityId, author, body) => {
        const id = uid('c')
        setState((current) =>
          pushActivity(
            {
              ...current,
              comments: [{ id, projectId, entityType, entityId, author, body, at: stamp() }, ...current.comments],
            },
            { entityType: 'comment', entityId: id, projectId, actor: author, action: 'commented', detail: body.slice(0, 80) },
          ),
        )
      },
      attachDocument: (projectId, entityType, entityId, name, attachedBy) => {
        const id = uid('doc')
        setState((current) =>
          pushActivity(
            {
              ...current,
              documents: [{ id, projectId, entityType, entityId, name, kind: 'File', attachedBy, at: stamp() }, ...current.documents],
            },
            { entityType: 'document', entityId: id, projectId, actor: attachedBy, action: 'attached document', detail: name },
          ),
        )
      },
    }),
    [state, view, query, metrics, visibleProjects, visibleTasks],
  )

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

function todayDate() {
  return '2026-07-20'
}

export function useProduct() {
  const value = useContext(ProductContext)
  if (!value) throw new Error('useProduct must be used inside ProductProvider')
  return value
}
