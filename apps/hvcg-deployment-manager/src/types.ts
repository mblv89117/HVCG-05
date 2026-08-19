export type Role = 'Owner' | 'MasterPM' | 'QA' | 'Engineer' | 'Viewer'

export type PageId =
  | 'dashboard'
  | 'queue'
  | 'promotion'
  | 'approvals'
  | 'evidence'
  | 'rollback'
  | 'environments'
  | 'calendar'
  | 'incidents'
  | 'audit'

export type ReleaseStatus =
  | 'Draft'
  | 'In Build'
  | 'QA'
  | 'Pending Approval'
  | 'Approved'
  | 'Blocked'
  | 'Rejected'
  | 'Deployed'
  | 'Rolled Back'

export type QueueStatus = 'Pending' | 'Approved' | 'Blocked' | 'Rejected' | 'Rolled Back'

export type EnvironmentName = 'Development' | 'QA' | 'Staging' | 'Production'

export type EnvironmentHealth = 'Healthy' | 'Degraded' | 'Down' | 'Unknown'

export type ApprovalStage =
  | 'Engineer'
  | 'QA'
  | 'MasterPM'
  | 'Owner'
  | 'Deployment'

export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected' | 'Skipped'

export interface ApprovalStep {
  stage: ApprovalStage
  decision: ApprovalDecision
  actor: string
  at?: string
  note?: string
}

export interface ReleaseCandidate {
  id: string
  name: string
  module: string
  environment: EnvironmentName
  status: ReleaseStatus
  owner: string
  build: string
  qa: string
  approval: string
  rollbackStatus: string
  branch: string
  commit: string
  artifacts: string[]
  screenshots: string[]
  evidence: string[]
  approvalChain: ApprovalStep[]
  rollbackPlan: string
  releaseNotes: string
  createdAt: string
}

export interface QueueItem {
  id: string
  releaseId: string
  releaseName: string
  status: QueueStatus
  requestedBy: string
  targetEnvironment: EnvironmentName
  blockedReason?: string
  updatedAt: string
}

export interface EnvironmentRecord {
  name: EnvironmentName
  health: EnvironmentHealth
  version: string
  lastRelease: string
  lastDeployment: string
  protected: boolean
  notes: string
}

export interface CalendarEvent {
  id: string
  title: string
  kind: 'Release' | 'Freeze' | 'Maintenance' | 'Owner Approval'
  start: string
  end: string
  owner: string
}

export interface Incident {
  id: string
  kind: 'Deployment Failure' | 'QA Failure' | 'Rollback Event' | 'Production Alert'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  title: string
  releaseId?: string
  at: string
  owner: string
  status: 'Open' | 'Mitigated' | 'Closed'
}

export interface AuditEntry {
  id: string
  timestamp: string
  engineer: string
  approval: string
  release: string
  branch: string
  commit: string
  evidence: string
  action: string
}

export interface RollbackRecord {
  releaseId: string
  releaseName: string
  plan: string
  evidence: string[]
  owner: string
  verification: string
  status: string
}

export interface DeploymentManagerData {
  generatedAt: string
  mode: 'mock-only'
  tenantName: string
  releases: ReleaseCandidate[]
  queue: QueueItem[]
  environments: EnvironmentRecord[]
  calendar: CalendarEvent[]
  incidents: Incident[]
  audit: AuditEntry[]
  rollbacks: RollbackRecord[]
}
