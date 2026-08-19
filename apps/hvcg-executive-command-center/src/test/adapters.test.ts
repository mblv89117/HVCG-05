import { describe, expect, it } from 'vitest'
import { readEosSummary } from '../adapters/eosAdapter'
import { readRevenueModel, validateRevenueModel } from '../adapters/revenueAdapter'

const revenueFixture = {
  generated_at: '2026-07-17T00:00:00Z',
  environment_intent: 'Development',
  kpis: {
    leads: 0, evas_started: 0, evas_completed: 0, qualified_leads: 0,
    proposals_sent: 0, deals_won: 0, mrr: 0, revenue_forecast: 0,
    pipeline_value: 0, owner_tasks: 0, outstanding_approvals: 0,
  },
  owner_task_queue: [],
  outstanding_approval_queue: [],
  source: 'local_staging_extension',
}

describe('read-only source adapters', () => {
  it('maps the existing EOS Sprint 2 snapshot', () => {
    const summary = readEosSummary()
    expect(summary.environment).toBe('Development')
    expect(summary.productionFrozen).toBe(true)
    expect(summary.openTechnicalDebt).toBe(0)
    expect(summary.deploymentReady).toBe(false)
  })

  it('accepts the Revenue Sprint 4 dashboard contract in Development', () => {
    expect(validateRevenueModel(revenueFixture)).toBe(true)
    expect(readRevenueModel(revenueFixture)).toEqual(revenueFixture)
  })

  it('rejects Production and malformed revenue payloads', () => {
    expect(validateRevenueModel({ ...revenueFixture, environment_intent: 'Production' })).toBe(false)
    expect(validateRevenueModel({ ...revenueFixture, kpis: { leads: '<script>' } })).toBe(false)
    expect(readRevenueModel(null)).toBeNull()
  })

  it('returns a defensive clone of Revenue data', () => {
    const result = readRevenueModel(revenueFixture)
    expect(result).not.toBe(revenueFixture)
    result!.kpis.leads = 99
    expect(revenueFixture.kpis.leads).toBe(0)
  })
})
