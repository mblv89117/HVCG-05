import type { KnowledgeArticle } from './types'

export function isStale(article: KnowledgeArticle, today: string): boolean {
  return article.approvalStatus === 'Approved' && article.nextReviewDue < today
}

export function staleArticles(articles: KnowledgeArticle[], today: string): KnowledgeArticle[] {
  return articles.filter((a) => isStale(a, today)).sort((a, b) => a.nextReviewDue.localeCompare(b.nextReviewDue))
}
