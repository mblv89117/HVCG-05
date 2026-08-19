export type DashboardId = 'overview' | 'approvals' | 'agents' | 'portfolio' | 'revenue' | 'engineering' | 'brief'
export type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'accent'
export type TrendDirection = 'up' | 'down' | 'flat'
export type Health = 'GREEN' | 'YELLOW' | 'RED'
export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live'
export type ApprovalState = 'Pending' | 'Approved locally' | 'Rejected locally' | 'Changes requested locally'

export interface Evidence {
  kind: SourceKind
  label: string
  path?: string
  asOf?: string
  stale?: boolean
}

export interface Metric {
  id: string
  label: string
  value: string
  detail: string
  trend?: string
  trendDirection?: TrendDirection
  tone?: Tone
  source: Evidence
}

export interface ChartDatum {
  label: string
  value: number
  displayValue?: string
  secondary?: number
}

export interface HealthItem {
  id: string
  label: string
  health: Health
  summary: string
  source: Evidence
}

export interface ApprovalItem {
  id: string
  title: string
  category: string
  businessReason: string
  requestedAction: string
  requester: string
  risk: 'Low' | 'Medium' | 'High' | 'Critical'
  impact: string
  track: string
  environment: string
  qaStatus: string
  recommendation: string
  state: ApprovalState
  source: Evidence
}

export type AgentState = 'Idle' | 'Assigned' | 'Working' | 'Blocked' | 'Waiting for QA' | 'Waiting for Owner' | 'Ready for Release' | 'Complete'

export interface AgentRecord {
  id: string
  name: string
  role: string
  track: string
  sprint: string
  status: AgentState
  branch: string
  worktree: string
  lastUpdate: string
  blocker: string
  qaStatus: string
  ownerDecision: string
  nextAction: string
  source: Evidence
}

export interface TrackRecord {
  number: number
  name: string
  owner: string
  sprint: string
  status: string
  environment: string
  branch: string
  qa: string
  deployment: string
  risks: string
  blockers: string
  nextAction: string
  technicalDebt: string
  pendingDecisions: string
  source: Evidence
}

export interface ClientRecord {
  id: string
  name: string
  project: string
  status: string
  health: Health
  missingDocuments: number
  nextAction: string
  source: Evidence
}

export interface EngineeringRecord {
  label: string
  value: string
  detail: string
  source: Evidence
}

export interface BriefItem {
  id: string
  text: string
  source: Evidence
}

export interface CommandCenterData {
  generatedAt: string
  environment: string
  tenantName: string
  sources: Evidence[]
  health: HealthItem[]
  risks: BriefItem[]
  blockers: BriefItem[]
  actions: BriefItem[]
  approvals: ApprovalItem[]
  agents: AgentRecord[]
  tracks: TrackRecord[]
  revenueMetrics: Metric[]
  clients: ClientRecord[]
  engineering: EngineeringRecord[]
  recentChanges: BriefItem[]
}
