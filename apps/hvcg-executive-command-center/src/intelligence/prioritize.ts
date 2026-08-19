import type { ImpactLevel, Insight } from '../types/intelligence'
import type { Role } from '../types'

const impactWeight: Record<ImpactLevel, number> = {
  Critical: 40,
  High: 28,
  Medium: 16,
  Low: 6,
}

const evidenceWeight = {
  Verified: 12,
  'Repository-derived': 6,
  'AI interpretation': 4,
  'Pending verification': 8,
} as const

const domainWeight: Record<Insight['domain'], number> = {
  Risk: 10,
  Decision: 9,
  'Capital readiness': 9,
  Overdue: 8,
  Finance: 8,
  Revenue: 7,
  Opportunity: 7,
  Client: 6,
  Project: 5,
  Meeting: 4,
}

/**
 * Business-impact prioritization for executive surfaces.
 * Higher score = show first. Does not invent facts — scores supplied insights only.
 */
export function scoreInsight(insight: Insight): number {
  const statusPenalty = insight.status === 'Open' ? 0 : insight.status === 'Accepted' ? -20 : -40
  return (
    insight.priorityScore +
    impactWeight[insight.impact] +
    evidenceWeight[insight.evidenceKind] +
    domainWeight[insight.domain] +
    statusPenalty
  )
}

export function prioritizeInsights(insights: Insight[], role: Role): Insight[] {
  return insights
    .filter((item) => item.allowedRoles.includes(role))
    .filter((item) => item.status === 'Open' || item.status === 'Accepted')
    .map((item) => ({ ...item, priorityScore: scoreInsight(item) }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title))
}

export function topOpenInsights(insights: Insight[], role: Role, limit = 5): Insight[] {
  return prioritizeInsights(insights, role).filter((item) => item.status === 'Open').slice(0, limit)
}

/** Open insights plus recently accepted items for review confirmation. */
export function actionableInsights(insights: Insight[], role: Role, limit = 8): Insight[] {
  return prioritizeInsights(insights, role)
    .filter((item) => item.status === 'Open' || item.status === 'Accepted')
    .slice(0, limit)
}
