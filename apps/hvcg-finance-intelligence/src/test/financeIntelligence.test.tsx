import { describe, expect, it } from 'vitest'
import { ccbKpis, hvcgKpis } from '../data/kpiCatalog'
import {
  dailyChanges,
  scorecards,
  seedRecommendations,
} from '../data/decisionEngine'
import { enterpriseValueModels, workspaces } from '../data/financeStore'
import {
  cashRunwayMonths,
  incompleteShare,
  recommendationsCiteSources,
  variancePct,
  workingCapital,
} from '../engines/financeIntelligence'
import { roleAccess } from '../types'

describe('Finance Intelligence engines', () => {
  it('computes working capital and runway', () => {
    expect(workingCapital(43200, 18600)).toBe(24600)
    expect(workingCapital(null, 18600)).toBeNull()
    expect(cashRunwayMonths(184500, 14000)).toBe(13)
  })

  it('returns incomplete labels for missing variance inputs', () => {
    expect(variancePct(null, 100)).toBe('Not yet calculated')
    expect(variancePct(31200, 30000)).toBe('+4.0%')
  })
})

describe('Data rules', () => {
  it('does not invent CCB financial dollars', () => {
    expect(ccbKpis.every((k) => k.currentValue === null)).toBe(true)
    expect(ccbKpis.every((k) => k.status === 'Incomplete')).toBe(true)
    const ccb = workspaces.find((w) => w.id === 'CCB')
    expect(ccb?.financialDataState).toBe('Awaiting verified data')
  })

  it('labels HVCG KPIs as mock demo with full metadata', () => {
    for (const kpi of hvcgKpis) {
      expect(kpi.dataQuality).toBe('Mock demo')
      expect(kpi.reportingPeriod).toBeTruthy()
      expect(kpi.priorPeriodComparison).toBeTruthy()
      expect(kpi.trendLabel).toBeTruthy()
      expect(kpi.source).toBeTruthy()
      expect(kpi.lastRefresh).toBeTruthy()
      expect(kpi.drillDownPath).toBeTruthy()
      expect(kpi.status).toBeTruthy()
    }
  })

  it('marks enterprise value as indicative', () => {
    for (const ev of enterpriseValueModels) {
      expect(ev.indicativeOnly).toBe(true)
      expect(ev.validationLabel.toLowerCase()).toMatch(/indicative|no estimate/)
    }
  })

  it('tracks incomplete share for CCB', () => {
    expect(incompleteShare(ccbKpis)).toBe(100)
  })
})

describe('Decision engine', () => {
  it('requires every recommendation to cite sources', () => {
    expect(recommendationsCiteSources(seedRecommendations)).toBe(true)
    for (const rec of seedRecommendations) {
      expect(rec.kind).toBe('recommendation')
      expect(rec.citations.length).toBeGreaterThan(0)
      expect(rec.sourceIds.length).toBeGreaterThan(0)
    }
  })

  it('distinguishes observations from recommendations in seed data', () => {
    expect(seedRecommendations.every((r) => r.kind === 'recommendation')).toBe(true)
  })

  it('keeps CCB scores incomplete', () => {
    const ccbScores = scorecards.filter((s) => s.organizationId === 'CCB')
    expect(ccbScores.every((s) => s.score === null)).toBe(true)
  })

  it('includes daily change log with verification labels', () => {
    expect(dailyChanges.length).toBeGreaterThan(0)
    for (const c of dailyChanges) {
      expect(c.verificationStatus).toBeTruthy()
      expect(c.sourceIds.length).toBeGreaterThan(0)
    }
  })
})

describe('Permission QA', () => {
  it('restricts Assistant from decisions and cash', () => {
    expect(roleAccess.Assistant.includes('decisions')).toBe(false)
    expect(roleAccess.Assistant.includes('cash')).toBe(false)
    expect(roleAccess.Assistant.includes('changes')).toBe(true)
    expect(roleAccess.Owner.includes('decisions')).toBe(true)
  })
})
