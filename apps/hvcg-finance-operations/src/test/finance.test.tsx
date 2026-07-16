import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import {
  agingRollup,
  computeArr,
  computeMrr,
  invoiceBalance,
  priceEngagement,
  sumOutstanding,
} from '../engines/financeEngines'
import mockStore from '../data/mockStore'
import { roleAccess } from '../types'

describe('finance engines', () => {
  it('computes invoice balance and outstanding AR', () => {
    expect(invoiceBalance({ amount: 4500, amountCollected: 0 })).toBe(4500)
    expect(sumOutstanding(mockStore.invoices)).toBe(mockStore.kpis.outstandingAr)
  })

  it('computes MRR/ARR from active retainers', () => {
    const mrr = computeMrr(mockStore.retainers)
    expect(mrr).toBe(mockStore.kpis.mrr)
    expect(computeArr(mrr)).toBe(mockStore.kpis.arr)
  })

  it('models proposal pricing without inventing fees', () => {
    const model = mockStore.pricingModels.find((m) => m.sku === 'SKU-CAP')!
    const quote = priceEngagement(model, 2_500_000)
    expect(quote.setup).toBe(7500)
    expect(quote.monthly).toBe(5000)
    expect(quote.successFeeEstimate).toBe(37500)
    expect(quote.yearOne).toBe(7500 + 5000 * 12 + 37500)
  })

  it('rolls up AR aging buckets', () => {
    const aging = agingRollup(mockStore.invoices)
    expect(aging['31-60']).toBeGreaterThan(0)
    expect(Object.values(aging).reduce((a, b) => a + b, 0)).toBe(mockStore.kpis.outstandingAr)
  })
})

describe('finance app shell', () => {
  it('renders overview KPIs from mock store', async () => {
    render(<App />)
    expect((await screen.findAllByRole('heading', { name: 'Finance Overview' }))[0]).toBeInTheDocument()
    expect(screen.getAllByTestId('revenue-card').length).toBeGreaterThanOrEqual(8)
    expect(screen.getByText(/mock demo data only/i)).toBeInTheDocument()
  })

  it('enforces Assistant permission matrix', () => {
    expect(roleAccess.Assistant).toEqual(['overview', 'retainers'])
    expect(roleAccess.Assistant).not.toContain('ar')
    expect(roleAccess.Assistant).not.toContain('cash')
    expect(roleAccess.Owner).toContain('ar')
    expect(roleAccess.Finance).toContain('pricing')
  })
})
