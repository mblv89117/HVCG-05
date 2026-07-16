export type AgentStatus =
  | 'Online'
  | 'Idle'
  | 'Running'
  | 'Blocked'
  | 'Awaiting Approval'
  | 'Stale'
  | 'Failed'
  | 'Complete'

export type HealthLevel = 'Healthy' | 'Watch' | 'At Risk' | 'Critical'
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
export type PromptStatus = 'Draft' | 'Review' | 'Approved' | 'Deprecated' | 'Replaced'
export type PermissionLevel = 'None' | 'Read' | 'Write' | 'Execute' | 'Approval Required' | 'Owner Only'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Escalated'

export interface AgentHealth {
  lastHeartbeatMinutes: number
  contextUsagePercent: number
  failedTasks: number
  openBlockers: number
  uncommittedFiles: number
  branchDriftCommits: number
  documentationStatus: 'Current' | 'Review' | 'Missing'
  qaStatus: 'Pass' | 'Pending' | 'Fail'
}

export interface CostSummary {
  spend: number
  budget: number
  tokens: number
  runtimeMinutes: number
  tasksCompleted: number
  model: string
  monthlyForecast: number
}

export interface AgentRecord {
  id: string
  name: string
  role: string
  initials: string
  ownership: string
  branch: string
  worktree: string
  sprint: string
  status: AgentStatus
  health: HealthLevel
  lastActivity: string
  lastCommit: string
  currentTask: string
  humanOwner: string
  responsibilities: string[]
  ownedPaths: string[]
  protectedPaths: string[]
  promptVersion: string
  model: string
  tools: string[]
  permissionLevel: PermissionLevel
  blockers: string[]
  recentActivity: string[]
  recentHandoffs: string[]
  qaStatus: 'Pass' | 'Pending' | 'Fail'
  risk: RiskLevel
  healthMetrics: AgentHealth
  cost: CostSummary
}

export interface PromptRecord {
  id: string
  name: string
  version: string
  agentId: string
  status: PromptStatus
  createdDate: string
  updatedDate: string
  approvedBy: string
  changeSummary: string
  rollbackVersion: string
}

export type PermissionResource =
  | 'Filesystem'
  | 'Git'
  | 'Terminal'
  | 'Browser'
  | 'Microsoft 365'
  | 'Gmail'
  | 'Calendar'
  | 'Production'
  | 'Deployment'
  | 'Client data'
  | 'Financial data'

export interface PermissionRecord {
  agentId: string
  resource: PermissionResource
  level: PermissionLevel
  rationale: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  agentId: string
  action: string
  target: string
  result: 'Success' | 'Denied' | 'Pending' | 'Warning'
  risk: RiskLevel
  approvalStatus: ApprovalStatus | 'Not Required'
  evidence: string
}

export type ApprovalType =
  | 'Commit'
  | 'Push'
  | 'Merge'
  | 'Deployment'
  | 'Production access'
  | 'Tool permission'
  | 'Prompt promotion'
  | 'Agent activation'
  | 'Agent deactivation'
  | 'Cost exception'

export interface ApprovalRequest {
  id: string
  type: ApprovalType
  agentId: string
  title: string
  requestedAt: string
  owner: string
  status: ApprovalStatus
  risk: RiskLevel
  context: string
}

export interface RiskFinding {
  id: string
  category:
    | 'Unauthorized path modification'
    | 'Production access attempt'
    | 'Missing handoff'
    | 'Missing QA'
    | 'Stale prompt version'
    | 'Excessive cost'
    | 'Branch collision'
    | 'Worktree collision'
    | 'Uncommitted work'
    | 'Documentation drift'
    | 'Owner approval missing'
  agentId: string
  severity: RiskLevel
  status: 'Open' | 'Mitigated' | 'Accepted'
  detectedAt: string
  evidence: string
  remediation: string
}

export interface PolicyRecord {
  id: string
  title: string
  summary: string
  owner: string
  lastReviewed: string
  controls: string[]
}
