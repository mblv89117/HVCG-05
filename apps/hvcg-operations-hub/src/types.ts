export type Role = 'Owner' | 'Operations' | 'PM' | 'Finance' | 'Advisor' | 'Assistant'

export type ModuleId =
  | 'operations'
  | 'team'
  | 'projects'
  | 'sop'
  | 'ai'
  | 'human'
  | 'notifications'

export type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'accent'
export type TrendDirection = 'up' | 'down' | 'flat'
export type Availability = 'Available' | 'Busy' | 'PTO' | 'Limited'
export type ProjectKind = 'Client' | 'Internal'
export type ProjectStatus = 'On track' | 'At risk' | 'Blocked' | 'Complete'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type AgentHealth = 'Healthy' | 'Watch' | 'Blocked' | 'Idle'
export type WorkforceType = 'Employee' | 'Contractor' | 'Advisor'
export type ApprovalState = 'Approved' | 'Pending review' | 'Draft' | 'Needs update'

export interface Metric {
  id: string
  label: string
  value: string
  detail: string
  trend?: string
  trendDirection?: TrendDirection
  tone?: Tone
}

export interface TeamMember {
  id: string
  name: string
  role: string
  availability: Availability
  workload: number
  capacity: number
  focus: string
}

export interface Project {
  id: string
  name: string
  kind: ProjectKind
  status: ProjectStatus
  priority: Priority
  progress: number
  owner: string
  client?: string
}

export interface SopVersion {
  version: string
  date: string
  author: string
  note: string
}

export interface SopDocument {
  id: string
  title: string
  category: string
  version: string
  approval: ApprovalState
  updatedAt: string
  favorite: boolean
  owner: string
  summary: string
  history: SopVersion[]
}

export interface AiAgent {
  id: string
  name: string
  status: 'Ready' | 'In progress' | 'Blocked' | 'Frozen'
  sprint: string
  lastCommit: string
  branch: string
  health: AgentHealth
  currentTask: string
}

export interface HumanWorker {
  id: string
  name: string
  type: WorkforceType
  assignment: string
  capacity: number
  utilization: number
  skills: string[]
}

export interface OpsTask {
  id: string
  title: string
  state: 'Due today' | 'Waiting' | 'Blocked' | 'Follow-up' | 'Approval'
  owner: string
  due: string
}

export interface Meeting {
  id: string
  title: string
  when: string
  attendees: string
}

export interface ReleaseItem {
  id: string
  name: string
  status: string
  owner: string
}

export interface Notification {
  id: string
  type: 'QA complete' | 'Release' | 'Client docs' | 'Proposal approved' | 'Sprint complete' | 'Deployment pending'
  title: string
  detail: string
  timestamp: string
  severity: 'Info' | 'Action' | 'Critical'
  read: boolean
  allowedRoles: Role[]
}

export interface OperationsData {
  generatedAt: string
  tenantId: string
  tenantName: string
  overviewMetrics: Metric[]
  team: TeamMember[]
  projects: Project[]
  sops: SopDocument[]
  aiAgents: AiAgent[]
  humanWorkforce: HumanWorker[]
  tasks: OpsTask[]
  meetings: Meeting[]
  followUps: string[]
  releases: ReleaseItem[]
  docHealth: Metric[]
  notifications: Notification[]
}
