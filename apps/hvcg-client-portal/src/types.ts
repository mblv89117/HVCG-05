/** Client Portal & Data Rooms — shared types (reusable workspace template). */

/** Canonical pending labels for client-facing + exec integration surfaces. */
export type DataAvailability =
  | 'Verified'
  | 'Repository-derived'
  | 'Awaiting verified data'
  | 'Pending verification'
  | 'Not yet calculated'
  | 'Data connection pending'

/** Atlas Executive Dashboard release — Entra-aligned portal roles. */
export type PortalRole =
  | 'HVCG Owner'
  | 'HVCG Team Member'
  | 'Client Executive'
  | 'Client Contributor'
  | 'Read-Only Advisor'
  | 'Administrator'

export type FundingStage =
  | 'Assessment'
  | 'Discovery'
  | 'Financial Review'
  | 'Capital Strategy'
  | 'Document Collection'
  | 'Packaging'
  | 'Lender Matching'
  | 'Submission'
  | 'Conditional Approval'
  | 'Funding'
  | 'Closed'

export const FUNDING_STAGES: FundingStage[] = [
  'Assessment',
  'Discovery',
  'Financial Review',
  'Capital Strategy',
  'Document Collection',
  'Packaging',
  'Lender Matching',
  'Submission',
  'Conditional Approval',
  'Funding',
  'Closed',
]

/** Required secure data-room categories (reusable across clients). */
export const DATA_ROOM_CATEGORIES = [
  'Corporate',
  'Financial',
  'Tax',
  'Legal',
  'Insurance',
  'Ownership',
  'Debt',
  'Real Estate',
  'Operations',
  'Capital',
  'Compliance',
  'Engagement',
  'Deliverables',
] as const

export type DataRoomCategory = (typeof DATA_ROOM_CATEGORIES)[number]

/** @deprecated Prefer DATA_ROOM_CATEGORIES — kept for checklist aliases. */
export const DOCUMENT_FOLDERS = DATA_ROOM_CATEGORIES
export type DocumentFolder = DataRoomCategory

export type DocStatus = 'Requested' | 'Uploaded' | 'In Review' | 'Accepted' | 'Rejected' | 'Expired'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Not Required'
export type VisibilityRole = 'ClientVisible' | 'Internal'

export interface Advisor {
  id: string
  name: string
  title: string
  email: string
  phone: string
  initials: string
}

export interface PortalUser {
  id: string
  name: string
  email: string
  role: PortalRole
  clientIds: string[]
}

export interface Client {
  id: string
  code: string
  name: string
  industry: string
  engagementStatus: string
  advisorId: string
  health: string
  referralSource: string
  originalRelationship: string
  currentRelationship: string
  originalObjectives: string[]
  financingThemes: string[]
  services: string[]
  relationshipHistory: string[]
  documentReadiness: string
  capitalReadiness: string
  blueprintStage: string
  notes: string
  /** Internal-only — never shown to client roles. */
  internalNotes?: string
}

export interface Contact {
  id: string
  clientId: string
  name: string
  title: string
  organization: string
  email: string
  phone?: string
  role: 'Client' | 'HVCG' | 'Referral' | 'Lender' | 'Investor' | 'Other'
  visibility: VisibilityRole
}

export interface Engagement {
  id: string
  clientId: string
  title: string
  type: string
  status: string
  startDate: string
  progressPct: number | null
  nextMilestone: string
  availability: DataAvailability
}

export interface Project {
  id: string
  clientId: string
  name: string
  sponsor: string
  pm: string
  health: string
  nextMilestone: string
  availability: DataAvailability
}

export interface FundingRequest {
  id: string
  clientId: string
  stage: FundingStage
  /** Null when amount is not verified. */
  amountTarget: number | null
  amountCommitted: number | null
  lenderInterest: number | null
  themes: string[]
  updatedAt: string
  availability: DataAvailability
}

export interface CapitalRoadmapItem {
  id: string
  clientId: string
  title: string
  theme: string
  status: string
  notes: string
  availability: DataAvailability
}

export interface PipelineParty {
  id: string
  clientId: string
  name: string
  type: 'Lender' | 'Investor'
  stage: string
  status: string
  notes: string
  availability: DataAvailability
}

export interface KpiField {
  id: string
  clientId: string
  label: string
  value: string
  availability: DataAvailability
}

export interface DocumentRequest {
  id: string
  clientId: string
  folder: DataRoomCategory
  title: string
  status: DocStatus
  dueDate: string
  receivedDate?: string
  expiresAt?: string
  owner: string
  approvalStatus: ApprovalStatus
  notes?: string
  uploadedFileName?: string
  uploadedAt?: string
  version?: string
}

export interface DataRoomDocument {
  id: string
  clientId: string
  category: DataRoomCategory
  name: string
  version: string
  sizeKb: number
  uploadedAt: string
  receivedDate?: string
  expiresAt?: string
  owner: string
  approvalStatus: ApprovalStatus
  notes?: string
  sensitivity: VisibilityRole
  downloadAllowed: boolean
  auditSummary: string
}

export interface MessageThread {
  id: string
  clientId: string
  subject: string
  unread: number
  updatedAt: string
}

export interface Message {
  id: string
  threadId: string
  sender: string
  direction: 'ClientToHVCG' | 'HVCGToClient' | 'System'
  body: string
  sentAt: string
  attachmentName?: string
}

export interface TaskItem {
  id: string
  clientId: string
  title: string
  ownerType: 'Client' | 'Advisor'
  dueDate: string
  status: 'Open' | 'In Progress' | 'Done'
  weight: number
  nextAction?: boolean
}

export interface ApprovalItem {
  id: string
  clientId: string
  title: string
  requestedBy: string
  status: ApprovalStatus
  dueDate: string
  notes: string
  visibility: VisibilityRole
}

export interface Meeting {
  id: string
  clientId: string
  title: string
  startsAt: string
  location: string
  joinUrl?: string
}

export interface NoteItem {
  id: string
  clientId: string
  title: string
  body: string
  author: string
  createdAt: string
  visibility: VisibilityRole
}

export interface DecisionItem {
  id: string
  clientId: string
  title: string
  decision: string
  decidedBy: string
  decidedAt: string
  status: string
  visibility: VisibilityRole
}

export interface DeliverableItem {
  id: string
  clientId: string
  title: string
  status: string
  dueDate: string
  owner: string
  category: DataRoomCategory
}

export interface AiInsight {
  id: string
  clientId: string
  title: string
  summary: string
  generatedAt: string
  availability: DataAvailability
  visibility: VisibilityRole
}

export interface ActivityEvent {
  id: string
  clientId: string
  title: string
  description: string
  at: string
  actor: string
  category: 'System' | 'Document' | 'Approval' | 'Meeting' | 'Task' | 'Communication'
}

export interface NotificationItem {
  id: string
  clientId: string
  title: string
  body: string
  createdAt: string
  read: boolean
  channel: 'InApp' | 'EmailDisabled' | 'SmsDisabled'
}

export interface SecureFile {
  id: string
  clientId: string
  folder: DataRoomCategory
  name: string
  sizeKb: number
  updatedAt: string
  sensitivity: VisibilityRole
}

export interface TimelineEvent {
  id: string
  clientId: string
  title: string
  description: string
  date: string
  type: 'Engagement' | 'Document' | 'Funding' | 'Meeting'
  status: 'Complete' | 'Current' | 'Upcoming'
}

export interface Milestone {
  id: string
  clientId: string
  title: string
  dueDate: string
  owner: 'Client' | 'Advisor' | 'Joint'
  status: 'Complete' | 'In Progress' | 'Upcoming' | 'At Risk'
  progressPct: number | null
}

export interface Invoice {
  id: string
  clientId: string
  invoiceNumber: string
  description: string
  issuedDate: string
  dueDate: string
  amount: number | null
  status: 'Draft' | 'Open' | 'Paid' | 'Overdue' | 'PendingVerification'
  downloadUrl?: string
  availability: DataAvailability
}
