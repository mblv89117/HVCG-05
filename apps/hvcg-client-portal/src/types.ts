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

export const DOCUMENT_FOLDERS = [
  'Financial Statements',
  'Tax Returns',
  'Business Returns',
  'Personal Returns',
  'Bank Statements',
  'P&L',
  'Balance Sheet',
  'Payroll',
  'Ownership Docs',
  'Articles',
  'Operating Agreement',
  'Insurance',
  'Real Estate',
  'Business Plan',
  'Pitch Deck',
] as const

export type DocumentFolder = (typeof DOCUMENT_FOLDERS)[number]

export type DocStatus = 'Requested' | 'Uploaded' | 'In Review' | 'Accepted' | 'Rejected'

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
  role: 'ClientContact' | 'Advisor' | 'Admin'
  clientIds: string[]
}

export interface Client {
  id: string
  code: string
  name: string
  industry: string
  engagementStatus: 'Active' | 'Onboarding' | 'Paused' | 'Closed'
  advisorId: string
}

export interface Engagement {
  id: string
  clientId: string
  title: string
  type: string
  status: string
  startDate: string
  progressPct: number
  nextMilestone: string
}

export interface FundingRequest {
  id: string
  clientId: string
  stage: FundingStage
  amountTarget: number
  amountCommitted: number
  lenderInterest: number
  updatedAt: string
}

export interface DocumentRequest {
  id: string
  clientId: string
  folder: DocumentFolder
  title: string
  status: DocStatus
  dueDate: string
  uploadedFileName?: string
  uploadedAt?: string
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
}

export interface Meeting {
  id: string
  clientId: string
  title: string
  startsAt: string
  location: string
  joinUrl?: string
}

export interface NotificationItem {
  id: string
  clientId: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

export interface SecureFile {
  id: string
  clientId: string
  folder: DocumentFolder | 'Deliverables' | 'Contracts'
  name: string
  sizeKb: number
  updatedAt: string
  sensitivity: 'ClientVisible' | 'Internal'
}
