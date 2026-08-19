export type WorkStatus =
  | 'Not Started'
  | 'In Progress'
  | 'On Track'
  | 'At Risk'
  | 'Blocked'
  | 'Awaiting Approval'
  | 'Completed'
  | 'Archived'

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

export type PortfolioView =
  | 'executive'
  | 'my-work'
  | 'my-projects'
  | 'at-risk'
  | 'blocked'
  | 'overdue'
  | 'awaiting-approval'
  | 'recently-updated'
  | 'completed'
  | 'archived'

export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected'

export interface ActivityEvent {
  id: string
  entityType: 'project' | 'task' | 'milestone' | 'approval' | 'risk' | 'issue' | 'decision' | 'comment' | 'document'
  entityId: string
  projectId: string
  actor: string
  action: string
  detail: string
  at: string
}

export interface Comment {
  id: string
  projectId: string
  entityType: 'project' | 'task' | 'approval' | 'risk' | 'issue'
  entityId: string
  author: string
  body: string
  at: string
}

export interface DocumentRef {
  id: string
  projectId: string
  entityType: 'project' | 'task' | 'approval'
  entityId: string
  name: string
  kind: string
  attachedBy: string
  at: string
}

export interface DecisionRecord {
  id: string
  projectId: string
  title: string
  decision: string
  owner: string
  at: string
  status: WorkStatus
}

export interface RiskRecord {
  id: string
  projectId: string
  title: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  owner: string
  status: WorkStatus
  mitigation: string
  dueDate?: string
}

export interface IssueRecord {
  id: string
  projectId: string
  title: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  owner: string
  status: WorkStatus
  blocker: boolean
}

export interface ApprovalRecord {
  id: string
  projectId: string
  taskId?: string
  title: string
  requester: string
  approver: string
  status: ApprovalDecision
  requestedAt: string
  decidedAt?: string
  note?: string
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  dueDate: string
  status: WorkStatus
  owner: string
  percentComplete: number
}

export interface TaskItem {
  id: string
  projectId: string
  milestoneId?: string
  title: string
  description: string
  status: WorkStatus
  priority: Priority
  assignee: string
  dueDate: string
  dependsOn: string[]
  recurring?: boolean
  recurrence?: string
  nextAction: string
  updatedAt: string
}

export interface ProjectItem {
  id: string
  name: string
  client?: string
  owner: string
  status: WorkStatus
  health: 'Green' | 'Yellow' | 'Red'
  priority: Priority
  percentComplete: number
  startDate: string
  dueDate: string
  nextAction: string
  tags: string[]
  archived: boolean
  updatedAt: string
  summary: string
}

export interface ProductState {
  currentUser: string
  projects: ProjectItem[]
  milestones: Milestone[]
  tasks: TaskItem[]
  approvals: ApprovalRecord[]
  risks: RiskRecord[]
  issues: IssueRecord[]
  decisions: DecisionRecord[]
  comments: Comment[]
  documents: DocumentRef[]
  activity: ActivityEvent[]
}
