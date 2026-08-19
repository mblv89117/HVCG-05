export type KnowledgeType =
  | 'KnowledgeArticle'
  | 'SOP'
  | 'Policy'
  | 'Template'
  | 'MeetingNote'
  | 'Decision'
  | 'ArchitectureRecord'
  | 'ProductDocumentation'
  | 'ClientKnowledge'
  | 'EngagementKnowledge'
  | 'CapitalAdvisoryGuidance'
  | 'FinanceGuidance'
  | 'Troubleshooting'
  | 'Onboarding'
  | 'FAQ'
  | 'ReleaseDocumentation'

export type ApprovalStatus = 'Draft' | 'InReview' | 'Approved' | 'Rejected' | 'Archived'

export type Audience =
  | 'AllStaff'
  | 'Internal'
  | 'Executive'
  | 'Finance'
  | 'Capital'
  | 'ClientSafe'
  | 'ClientScoped'

export type AtlasModule =
  | 'Executive'
  | 'Operations'
  | 'CRM'
  | 'Finance'
  | 'Capital'
  | 'ClientPortal'
  | 'AI'
  | 'Security'
  | 'Deployment'
  | 'Knowledge'
  | 'None'

export type Sensitivity = 'PublicInternal' | 'Confidential' | 'ClientConfidential' | 'Restricted'

export type RoleId =
  | 'Owner'
  | 'Admin'
  | 'OpsManager'
  | 'ProjectManager'
  | 'CapitalAdvisor'
  | 'FinancialAnalyst'
  | 'OpsAssistant'
  | 'Contractor'
  | 'ReadOnly'
  | 'ClientContact'

export interface VersionEntry {
  version: string
  date: string
  author: string
  note: string
}

export interface KnowledgeArticle {
  id: string
  title: string
  knowledgeType: KnowledgeType
  category: string
  tags: string[]
  summary: string
  sourceUrl: string
  ownerEmail: string
  approvalStatus: ApprovalStatus
  audience: Audience
  relatedModule: AtlasModule
  relatedClientCode: string | null
  engagementKey: string | null
  organizationId: string
  lastReviewed: string
  nextReviewDue: string
  versionLabel: string
  supersedesId: string | null
  aiGroundingAllowed: boolean
  copilotKeywords: string[]
  usageCount: number
  sensitivity: Sensitivity
  history: VersionEntry[]
  updatedAt: string
}

export interface KnowledgeUser {
  id: string
  name: string
  email: string
  role: RoleId
  assignedClients: string[]
  organizationId: string
}

export interface SearchFilters {
  query: string
  knowledgeType: string
  category: string
  module: string
  approval: string
  tag: string
  staleOnly: boolean
  includeArchived: boolean
  /** Module surfaces default true — never show drafts to end users */
  approvedOnly?: boolean
  /** Tenant / org isolation */
  organizationId?: string
  /** When set, ClientScoped articles for other clients are excluded */
  clientCode?: string
}
