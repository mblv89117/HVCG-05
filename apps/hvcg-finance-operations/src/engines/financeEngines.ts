import type { AgingBucket, Invoice, PricingModel, ServiceLine } from '../types'

/** Invoice engine — balance, aging, and status helpers (pure, mock-safe). */
export function invoiceBalance(invoice: Pick<Invoice, 'amount' | 'amountCollected'>): number {
  return Math.max(0, round2(invoice.amount - invoice.amountCollected))
}

export function computeAgingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return 'Current'
  if (daysPastDue <= 30) return '1-30'
  if (daysPastDue <= 60) return '31-60'
  if (daysPastDue <= 90) return '61-90'
  return '90+'
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

export function sumOutstanding(invoices: Invoice[]): number {
  return round2(
    invoices
      .filter((i) => ['Sent', 'Partial', 'Past Due'].includes(i.status))
      .reduce((sum, i) => sum + invoiceBalance(i), 0),
  )
}

export function agingRollup(invoices: Invoice[]): Record<AgingBucket, number> {
  const buckets: Record<AgingBucket, number> = {
    Current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  }
  for (const invoice of invoices) {
    if (!['Sent', 'Partial', 'Past Due'].includes(invoice.status)) continue
    buckets[invoice.agingBucket] += invoiceBalance(invoice)
  }
  for (const key of Object.keys(buckets) as AgingBucket[]) {
    buckets[key] = round2(buckets[key])
  }
  return buckets
}

/** Billing engine — MRR / ARR from active retainers. */
export function computeMrr(retainers: { active: boolean; amount: number; cycle: string }[]): number {
  return round2(
    retainers
      .filter((r) => r.active)
      .reduce((sum, r) => sum + normalizeMonthly(r.amount, r.cycle), 0),
  )
}

export function computeArr(mrr: number): number {
  return round2(mrr * 12)
}

function normalizeMonthly(amount: number, cycle: string): number {
  switch (cycle) {
    case 'Quarterly':
      return amount / 3
    case 'Annual':
      return amount / 12
    default:
      return amount
  }
}

/** Pricing engine — model engagement pricing (no live quotes). */
export function priceEngagement(
  model: PricingModel,
  capitalRaise = 0,
): { setup: number; monthly: number; successFeeEstimate: number; yearOne: number } {
  const successFeeEstimate = round2(capitalRaise * (model.successFeePct / 100))
  const yearOne = round2(model.setupFee + model.monthlyRetainer * 12 + successFeeEstimate)
  return {
    setup: model.setupFee,
    monthly: model.monthlyRetainer,
    successFeeEstimate,
    yearOne,
  }
}

export function findPricingModel(models: PricingModel[], serviceLine: ServiceLine): PricingModel | undefined {
  return models.find((m) => m.serviceLine === serviceLine)
}

/** Forecast engine — weighted rollups. */
export function weightedForecast(
  lines: { weightedAmount: number; category?: string }[],
  category?: string,
): number {
  return round2(
    lines
      .filter((l) => !category || l.category === category)
      .reduce((sum, l) => sum + l.weightedAmount, 0),
  )
}

/** Collections engine — queue prioritization score. */
export function collectionPriorityScore(amountOpen: number, daysPastDue: number): number {
  return round2(amountOpen * (1 + Math.min(daysPastDue, 120) / 30))
}

export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
