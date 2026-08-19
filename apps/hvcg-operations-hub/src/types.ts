export type Role = 'Owner' | 'Operations' | 'PM' | 'Finance' | 'Advisor' | 'Assistant'

export type ModuleId =
  | 'portfolio'
  | 'executive'
  | 'operations'
  | 'scorecards'
  | 'weekly'
  | 'quarterly'
  | 'kpis'
  | 'meetings'
  | 'sop'
  | 'hr'
  | 'hiring'
  | 'training'
  | 'vendors'
  | 'assets'
  | 'notifications'
  | 'calendar'
  | 'docs'
  | 'team'
  | 'projects'
  | 'ai'
  | 'human'

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
  type?: string
  location?: string
}

export interface ReleaseItem {
  id: string
  name: string
  status: string
  owner: string
}

export interface Notification {
  id: string
  type: string
  title: string
  detail: string
  timestamp: string
  severity: 'Info' | 'Action' | 'Critical'
  read: boolean
  allowedRoles: Role[]
}

export interface ScorecardRow {
  id: string
  owner: string
  metric: string
  target: string
  actual: string
  status: 'Green' | 'Yellow' | 'Red'
}

export interface WeeklyReviewItem {
  id: string
  week: string
  theme: string
  wins: string
  risks: string
  owner: string
  status: 'Draft' | 'Ready' | 'Reviewed'
}

export interface QuarterlyPlanItem {
  id: string
  quarter: string
  objective: string
  owner: string
  progress: number
  status: 'On track' | 'At risk' | 'Deferred'
}

export interface CompanyKpi {
  id: string
  name: string
  value: string
  target: string
  period: string
  tone: Tone
}

export interface HrRecord {
  id: string
  name: string
  department: string
  title: string
  status: 'Active' | 'On leave' | 'Offboarding'
  manager: string
  startDate: string
}

export interface HiringRole {
  id: string
  role: string
  stage: 'Open' | 'Screening' | 'Interview' | 'Offer' | 'Filled'
  candidates: number
  owner: string
  targetDate: string
}

export interface TrainingItem {
  id: string
  course: string
  audience: string
  completion: number
  due: string
  status: 'In progress' | 'Complete' | 'Overdue'
}

export interface Vendor {
  id: string
  name: string
  category: string
  status: 'Active' | 'Review' | 'Paused'
  owner: string
  renewal: string
  spend: string
}

export interface Asset {
  id: string
  name: string
  type: string
  assignee: string
  status: 'In use' | 'Available' | 'Maintenance' | 'Retired'
  location: string
}

export interface DocPackage {
  id: string
  title: string
  kind: string
  owner: string
  updatedAt: string
  status: ApprovalState
}

export interface CalendarArchNote {
  id: string
  layer: string
  decision: string
  status: 'Planned' | 'Designed' | 'Deferred'
  note: string
}

export interface OperationsData {
  generatedAt: string
  tenantId: string
  tenantName: string
  overviewMetrics: Metric[]
  executiveMetrics: Metric[]
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
  scorecards: ScorecardRow[]
  weeklyReviews: WeeklyReviewItem[]
  quarterlyPlans: QuarterlyPlanItem[]
  companyKpis: CompanyKpi[]
  hrRoster: HrRecord[]
  hiringRoles: HiringRole[]
  training: TrainingItem[]
  vendors: Vendor[]
  assets: Asset[]
  documentation: DocPackage[]
  calendarArchitecture: CalendarArchNote[]
}
