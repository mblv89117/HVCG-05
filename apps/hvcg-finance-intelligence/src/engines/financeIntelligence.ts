import type {
  AgingSchedule,
  ExecutiveRecommendation,
  FinanceKpi,
  ForecastPoint,
  ScenarioModel,
  ScorecardMetric,
} from '../types'

export function formatUsd(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'Awaiting verified data'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function variancePct(actual: number | null, budget: number | null): string {
  if (actual === null || budget === null || budget === 0) return 'Not yet calculated'
  const pct = ((actual - budget) / Math.abs(budget)) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function workingCapital(ar: number | null, ap: number | null): number | null {
  if (ar === null || ap === null) return null
  return ar - ap
}

export function cashRunwayMonths(cash: number | null, monthlyBurn: number | null): number | null {
  if (cash === null || monthlyBurn === null || monthlyBurn <= 0) return null
  return Math.floor(cash / monthlyBurn)
}

export function agingTotal(schedule: AgingSchedule): number | null {
  if (schedule.buckets.some((b) => b.amount === null)) return null
  return schedule.buckets.reduce((sum, b) => sum + (b.amount ?? 0), 0)
}

export function incompleteShare(kpis: FinanceKpi[]): number {
  if (kpis.length === 0) return 0
  const incomplete = kpis.filter((k) => k.currentValue === null || k.status === 'Incomplete').length
  return Math.round((incomplete / kpis.length) * 100)
}

export function forecastDelta(points: ForecastPoint[]): string {
  const withForecast = points.filter((p) => p.forecast !== null && p.actual !== null)
  if (withForecast.length === 0) return 'Not yet calculated'
  const last = withForecast[withForecast.length - 1]
  if (last.forecast === null || last.actual === null) return 'Not yet calculated'
  return formatUsd(last.forecast - last.actual)
}

export function scenarioLabel(scenario: ScenarioModel): string {
  return `${scenario.name} · ${scenario.dataQuality}`
}

export function isIndicativeEv(label: string): boolean {
  return /indicative|awaiting|not yet|pending/i.test(label)
}

export function highestImpactRecommendations(
  items: ExecutiveRecommendation[],
): ExecutiveRecommendation[] {
  return items
    .filter((r) => r.highestImpact && r.status === 'Proposed')
    .sort((a, b) => b.impactScore - a.impactScore)
}

export function sortByImpact(items: ExecutiveRecommendation[]): ExecutiveRecommendation[] {
  return [...items].sort((a, b) => b.impactScore - a.impactScore)
}

export function scoreBandTone(band: ScorecardMetric['band']): string {
  if (band === 'Strong') return 'good'
  if (band === 'Watch') return 'warn'
  if (band === 'Elevated' || band === 'Critical') return 'bad'
  return 'muted'
}

/** Every recommendation must cite at least one source — guard for QA. */
export function recommendationsCiteSources(items: ExecutiveRecommendation[]): boolean {
  return items.every((r) => r.sourceIds.length > 0 && r.citations.length > 0)
}
