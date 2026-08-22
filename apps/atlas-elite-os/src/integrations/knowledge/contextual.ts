import { canViewArticle } from './access'
import { isStale } from './stale'
import type { AtlasModule, KnowledgeArticle, KnowledgeUser } from './types'

export interface SuggestInput {
  module: AtlasModule
  clientCode?: string
  engagementKey?: string
  tags?: string[]
  limit?: number
}

/** Contextual suggestions — approved only, org + client isolated, not stale. */
export function suggestKnowledge(
  user: KnowledgeUser,
  articles: KnowledgeArticle[],
  input: SuggestInput,
  today: string,
): KnowledgeArticle[] {
  const limit = input.limit ?? 5
  return articles
    .filter((a) => a.organizationId === user.organizationId)
    .filter((a) => canViewArticle(user, a))
    .filter((a) => a.approvalStatus === 'Approved')
    .filter((a) => !isStale(a, today))
    .filter((a) => {
      if (a.audience === 'ClientScoped') {
        return Boolean(input.clientCode && a.relatedClientCode === input.clientCode)
      }
      return true
    })
    .filter((a) => {
      if (input.engagementKey && a.engagementKey && a.engagementKey !== input.engagementKey) {
        return a.relatedModule === input.module
      }
      return true
    })
    .map((a) => {
      let score = 0
      if (a.relatedModule === input.module) score += 40
      if (input.tags?.some((t) => a.tags.includes(t))) score += 20
      if (input.clientCode && a.relatedClientCode === input.clientCode) score += 30
      score += Math.min(a.usageCount / 20, 10)
      return { a, score }
    })
    .filter((x) => x.score > 0 || x.a.relatedModule === input.module || x.a.relatedModule === 'None')
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a)
}
