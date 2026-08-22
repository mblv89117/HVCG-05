import { isAiGroundable } from './access'
import type { KnowledgeArticle, KnowledgeUser } from './types'

export interface AiCitation {
  articleId: string
  title: string
  sourceUrl: string
  versionLabel: string
}

/** Corpus AI may ground on — approved, allowed, org-visible, never client-scoped. */
export function filterAiGroundingCorpus(user: KnowledgeUser, articles: KnowledgeArticle[]): KnowledgeArticle[] {
  return articles.filter((a) => isAiGroundable(user, a))
}

/** Reject invented citations — every id must resolve to an approved groundable source. */
export function assertApprovedCitations(
  user: KnowledgeUser,
  articles: KnowledgeArticle[],
  citationIds: string[],
): { ok: boolean; citations: AiCitation[]; missing: string[] } {
  const corpus = new Map(filterAiGroundingCorpus(user, articles).map((a) => [a.id, a]))
  const citations: AiCitation[] = []
  const missing: string[] = []
  for (const id of citationIds) {
    const a = corpus.get(id)
    if (!a) {
      missing.push(id)
      continue
    }
    citations.push({
      articleId: a.id,
      title: a.title,
      sourceUrl: a.sourceUrl,
      versionLabel: a.versionLabel,
    })
  }
  return { ok: missing.length === 0, citations, missing }
}

/** Attach citation footers to an AI insight payload (product integration helper). */
export function attachApprovedCitations(
  user: KnowledgeUser,
  articles: KnowledgeArticle[],
  insightText: string,
  citationIds: string[],
): { text: string; citations: AiCitation[]; blocked: boolean; reason?: string } {
  const result = assertApprovedCitations(user, articles, citationIds)
  if (!result.ok) {
    return {
      text: insightText,
      citations: [],
      blocked: true,
      reason: `Blocked: unapproved or invisible citation ids: ${result.missing.join(', ')}`,
    }
  }
  if (citationIds.length === 0) {
    return {
      text: insightText,
      citations: [],
      blocked: true,
      reason: 'Blocked: AI insights must cite at least one approved knowledge source',
    }
  }
  const footer = result.citations.map((c) => `- ${c.title} (${c.sourceUrl}) v${c.versionLabel}`).join('\n')
  return {
    text: `${insightText}\n\nSources:\n${footer}`,
    citations: result.citations,
    blocked: false,
  }
}
