import type { Role } from '../types'

/** Verified fact vs AI interpretation — never mix without labeling. */
export type EvidenceKind = 'Verified' | 'AI interpretation' | 'Repository-derived' | 'Pending verification'

export type InsightStatus = 'Open' | 'Accepted' | 'Dismissed' | 'Converted'

export type ImpactLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export type ExceptionDomain =
  | 'Overdue'
  | 'Project'
  | 'Client'
  | 'Revenue'
  | 'Capital readiness'
  | 'Finance'
  | 'Decision'
  | 'Opportunity'
  | 'Risk'
  | 'Meeting'

export interface SourceRecord {
  id: string
  system: 'Project Atlas' | 'Revenue OS' | 'Client Portal' | 'Finance' | 'CRM' | 'Operations' | 'Manual'
  entity: string
  recordId: string
  label: string
  evidenceKind: EvidenceKind
  asOf: string
}

export interface Insight {
  id: string
  title: string
  summary: string
  domain: ExceptionDomain
  impact: ImpactLevel
  priorityScore: number
  status: InsightStatus
  evidenceKind: EvidenceKind
  sources: SourceRecord[]
  generatedAt: string
  recommendedAction: string
  decisionPrompt?: string
  taskTitle?: string
  allowedRoles: Role[]
  clientCode?: string
}

export interface DecisionItem {
  id: string
  title: string
  context: string
  due: string
  owner: string
  impact: ImpactLevel
  status: 'Pending' | 'Accepted' | 'Deferred'
  sourceInsightId?: string
  sources: SourceRecord[]
  createdAt: string
}

export interface TaskItem {
  id: string
  title: string
  due: string
  owner: string
  domain: ExceptionDomain
  status: 'Open' | 'Done'
  sourceInsightId?: string
  createdAt: string
}

export interface ReviewEvent {
  id: string
  insightId: string
  action: 'Accepted' | 'Dismissed' | 'Converted to decision' | 'Converted to task'
  actor: string
  role: Role
  note?: string
  at: string
}

export interface BriefSection {
  id: string
  title: string
  evidenceKind: EvidenceKind
  bullets: string[]
  sourceIds: string[]
}

export interface ExecutiveBriefDocument {
  id: string
  kind: 'daily' | 'weekly' | 'client-meeting'
  title: string
  subject: string
  generatedAt: string
  audience: Role[]
  summary: string
  sections: BriefSection[]
  criticalInsightIds: string[]
  decisionIds: string[]
  sources: SourceRecord[]
  /** Aggregate verification posture for the brief chrome. */
  verificationStatus: 'Verified' | 'Mixed' | 'Pending verification'
  /** True when any section or narrative includes AI interpretation. */
  aiGenerated: boolean
  /** Optional client isolation scope (e.g. CCB). */
  clientScope?: string
}

export interface MeetingDeadline {
  id: string
  when: string
  title: string
  type: 'Meeting' | 'Deadline'
  parties: string
  impact: ImpactLevel
  sources: SourceRecord[]
}

export interface ExceptionItem {
  id: string
  domain: ExceptionDomain
  title: string
  detail: string
  impact: ImpactLevel
  evidenceKind: EvidenceKind
  sources: SourceRecord[]
  relatedInsightId?: string
}
