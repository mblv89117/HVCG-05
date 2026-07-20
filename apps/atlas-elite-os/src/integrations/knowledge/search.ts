import { canViewArticle } from './access'
import { isStale } from './stale'
import type { KnowledgeArticle, KnowledgeUser, SearchFilters } from './types'

function score(article: KnowledgeArticle, query: string): number {
  if (!query.trim()) return article.usageCount
  const q = query.toLowerCase()
  let s = 0
  if (article.title.toLowerCase().includes(q)) s += 50
  if (article.tags.some((t) => t.toLowerCase().includes(q))) s += 30
  if (article.summary.toLowerCase().includes(q)) s += 20
  if (article.copilotKeywords.some((k) => k.toLowerCase().includes(q))) s += 15
  if (article.knowledgeType.toLowerCase().includes(q)) s += 10
  if (article.category.toLowerCase().includes(q)) s += 8
  s += Math.min(article.usageCount / 10, 10)
  if (article.approvalStatus === 'Approved') s += 5
  if (article.approvalStatus === 'Archived') s -= 20
  return s
}

export function searchArticles(
  user: KnowledgeUser,
  articles: KnowledgeArticle[],
  filters: SearchFilters,
  today: string,
): KnowledgeArticle[] {
  const orgId = filters.organizationId ?? user.organizationId
  const approvedOnly = filters.approvedOnly === true

  return articles
    .filter((a) => a.organizationId === orgId)
    .filter((a) => canViewArticle(user, a))
    .filter((a) => !approvedOnly || a.approvalStatus === 'Approved')
    .filter((a) => filters.includeArchived || a.approvalStatus !== 'Archived')
    .filter((a) => {
      if (a.audience !== 'ClientScoped') return true
      if (filters.clientCode) return a.relatedClientCode === filters.clientCode
      return user.assignedClients.includes(a.relatedClientCode ?? '')
    })
    .filter((a) => filters.knowledgeType === 'All' || a.knowledgeType === filters.knowledgeType)
    .filter((a) => filters.category === 'All' || a.category === filters.category)
    .filter((a) => filters.module === 'All' || a.relatedModule === filters.module)
    .filter((a) => {
      if (approvedOnly) return true
      return filters.approval === 'All' || a.approvalStatus === filters.approval
    })
    .filter((a) => filters.tag === 'All' || a.tags.includes(filters.tag))
    .filter((a) => !filters.staleOnly || isStale(a, today))
    .filter((a) => {
      if (!filters.query.trim()) return true
      return score(a, filters.query) > 0
    })
    .sort((a, b) => score(b, filters.query) - score(a, filters.query))
}

/** Module surfaces: approved-only, org-isolated, optional client scope. */
export function moduleSearch(
  user: KnowledgeUser,
  articles: KnowledgeArticle[],
  opts: { query?: string; module?: string; clientCode?: string; today: string },
): KnowledgeArticle[] {
  return searchArticles(
    user,
    articles,
    {
      query: opts.query ?? '',
      knowledgeType: 'All',
      category: 'All',
      module: opts.module ?? 'All',
      approval: 'Approved',
      tag: 'All',
      staleOnly: false,
      includeArchived: false,
      approvedOnly: true,
      organizationId: user.organizationId,
      clientCode: opts.clientCode,
    },
    opts.today,
  )
}

export function recentlyUpdated(articles: KnowledgeArticle[], limit = 5): KnowledgeArticle[] {
  return [...articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit)
}

export function mostUsed(articles: KnowledgeArticle[], limit = 5): KnowledgeArticle[] {
  return [...articles].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit)
}
