import type { ApprovalStatus, Audience, KnowledgeArticle, KnowledgeUser, RoleId, Sensitivity } from './types'

const DRAFT_ROLES: RoleId[] = ['Owner', 'Admin', 'OpsManager']
const EXEC_ROLES: RoleId[] = ['Owner', 'Admin', 'OpsManager']
const FINANCE_ROLES: RoleId[] = ['Owner', 'Admin', 'OpsManager', 'FinancialAnalyst']
const CAPITAL_ROLES: RoleId[] = ['Owner', 'Admin', 'OpsManager', 'CapitalAdvisor']
const RESTRICTED_ROLES: RoleId[] = ['Owner', 'Admin', 'OpsManager']

function canSeeApproval(role: RoleId, status: ApprovalStatus): boolean {
  if (status === 'Approved') return role !== 'ClientContact'
  if (status === 'Archived') return DRAFT_ROLES.includes(role) || role === 'ProjectManager'
  if (status === 'Draft' || status === 'InReview' || status === 'Rejected') {
    return DRAFT_ROLES.includes(role)
  }
  return false
}

function canSeeAudience(role: RoleId, audience: Audience, article: KnowledgeArticle, user: KnowledgeUser): boolean {
  if (audience === 'ClientScoped') {
    if (!article.relatedClientCode) return false
    if (role === 'ClientContact' || role === 'ReadOnly') return false
    return user.assignedClients.includes(article.relatedClientCode)
  }
  if (audience === 'Executive') return EXEC_ROLES.includes(role)
  if (audience === 'Finance') return FINANCE_ROLES.includes(role)
  if (audience === 'Capital') return CAPITAL_ROLES.includes(role)
  if (audience === 'ClientSafe') return role !== 'ClientContact'
  if (audience === 'AllStaff' || audience === 'Internal') {
    return role !== 'ClientContact'
  }
  return false
}

function canSeeSensitivity(role: RoleId, sensitivity: Sensitivity): boolean {
  if (sensitivity === 'PublicInternal') return role !== 'ClientContact'
  if (sensitivity === 'Confidential') return role !== 'ClientContact' && role !== 'ReadOnly'
  if (sensitivity === 'ClientConfidential') {
    return DRAFT_ROLES.includes(role) || role === 'ProjectManager' || role === 'CapitalAdvisor' || role === 'Contractor'
  }
  if (sensitivity === 'Restricted') return RESTRICTED_ROLES.includes(role) || role === 'FinancialAnalyst'
  return false
}

/** Permissions-aware visibility — never bypass ACLs. Enforces org + client isolation. */
export function canViewArticle(user: KnowledgeUser, article: KnowledgeArticle): boolean {
  if (user.role === 'ClientContact') return false
  if (article.organizationId !== user.organizationId) return false
  if (!canSeeApproval(user.role, article.approvalStatus)) return false
  if (!canSeeAudience(user.role, article.audience, article, user)) return false
  if (!canSeeSensitivity(user.role, article.sensitivity)) return false
  return true
}

export function isAiGroundable(user: KnowledgeUser, article: KnowledgeArticle): boolean {
  return (
    canViewArticle(user, article) &&
    article.approvalStatus === 'Approved' &&
    article.aiGroundingAllowed &&
    article.audience !== 'ClientScoped'
  )
}

export function visibleArticles(user: KnowledgeUser, articles: KnowledgeArticle[]): KnowledgeArticle[] {
  return articles.filter((a) => canViewArticle(user, a))
}
