export type Role = 'Owner' | 'Executive' | 'Advisor' | 'Operations' | 'Finance' | 'Assistant'

export type DashboardId =
  | 'overview'
  | 'revenue'
  | 'clients'
  | 'operations'
  | 'financial'
  | 'ai'
  | 'intelligence'
  | 'notifications'

export type Tone = 'neutral' | 'positive' | 'warning' | 'critical' | 'accent'
export type TrendDirection = 'up' | 'down' | 'flat'

export interface Metric {
  id: string
  label: string
  value: string
  detail: string
  trend?: string
  trendDirection?: TrendDirection
  tone?: Tone
  allowedRoles?: Role[]
}

export interface ChartDatum {
  label: string
  value: number
  displayValue?: string
  secondary?: number
}

export interface Opportunity {
  id: string
  company: string
  service: string
  stage: string
  value: number
  weighted: number
  probability: number
  source: string
  owner: string
  nextAction: string
  risk: 'Low' | 'Medium' | 'High'
}

export interface Client {
  id: string
  code: string
  name: string
  engagement: string
  engagementStatus: string
  health: 'Green' | 'Yellow' | 'Red'
  documentsOutstanding: number
  fundingProgress: number
  advisor: string
  openTasks: number
  nextMeeting: string
  recentActivity: string
}

export interface Notification {
  id: string
  domain: 'Revenue' | 'Portal' | 'Finance' | 'CRM' | 'Operations' | 'Approvals'
  title: string
  detail: string
  timestamp: string
  severity: 'Info' | 'Action' | 'Critical'
  read: boolean
  allowedRoles: Role[]
}

export interface Activity {
  id: string
  actor: string
  action: string
  subject: string
  timestamp: string
  domain: string
}

export interface AgentStatus {
  name: string
  workstream: string
  status: 'Ready' | 'In progress' | 'Blocked' | 'Frozen'
  heartbeat: string
}

export interface CommandCenterData {
  generatedAt: string
  tenantId: string
  tenantName: string
  overviewMetrics: Metric[]
  revenueMetrics: Metric[]
  financialMetrics: Metric[]
  opportunities: Opportunity[]
  clients: Client[]
  notifications: Notification[]
  activities: Activity[]
  pipelineByStage: ChartDatum[]
  revenueForecast: ChartDatum[]
  monthlyRevenue: ChartDatum[]
  leadSources: ChartDatum[]
  fundingPipeline: ChartDatum[]
  expenses: ChartDatum[]
  agentStatuses: AgentStatus[]
}
