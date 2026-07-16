export type FinanceRole = 'Owner' | 'Finance' | 'Advisor' | 'Assistant'

export type ServiceLine =
  | 'Fractional CFO'
  | 'Capital Advisory'
  | 'Business Valuation'
  | 'Exit Planning'
  | 'Acquisition Advisory'

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partial' | 'Paid' | 'Past Due' | 'Void'
export type InvoiceType = 'Retainer' | 'Setup' | 'Success Fee' | 'Expense' | 'Other'
export type AgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | '90+'
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Annual' | 'Milestone'

export interface Client {
  id: string
  code: string
  name: string
  advisor: string
  serviceLine: ServiceLine
  billingCycle: BillingCycle
  retainerAmount: number
  retainerActive: boolean
  renewalDate: string
  lifetimeValue: number
  paymentStatus: 'Current' | 'Past Due' | 'At Risk'
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  clientCode: string
  type: InvoiceType
  status: InvoiceStatus
  amount: number
  amountCollected: number
  issuedOn: string
  dueOn: string
  agingBucket: AgingBucket
  daysPastDue: number
}

export interface CollectionItem {
  id: string
  invoiceId: string
  clientCode: string
  amountOpen: number
  priority: 'High' | 'Medium' | 'Low'
  nextAction: string
  owner: string
}

export interface Retainer {
  id: string
  clientId: string
  clientCode: string
  amount: number
  cycle: BillingCycle
  active: boolean
  renewalDate: string
  serviceLine: ServiceLine
}

export interface PricingModel {
  sku: string
  serviceLine: ServiceLine
  setupFee: number
  monthlyRetainer: number
  successFeePct: number
  notes: string
}

export interface CashFlowPoint {
  month: string
  opening: number
  incoming: number
  outgoing: number
  closing: number
}

export interface ForecastLine {
  month: string
  category: 'Commit' | 'Best Case' | 'Pipeline'
  revenueType: 'MRR' | 'Setup' | 'Success Fee' | 'Other'
  amount: number
  weightedAmount: number
  probability: number
}

export interface AdvisorRevenue {
  advisor: string
  revenue: number
  clients: number
  pipeline: number
}

export interface ServiceRevenue {
  serviceLine: ServiceLine
  revenue: number
  mrr: number
}

export interface FinanceKpis {
  grossRevenueYtd: number
  netRevenueYtd: number
  monthlyRevenue: number
  mrr: number
  arr: number
  retainersActive: number
  retainersRevenue: number
  successFeesYtd: number
  outstandingAr: number
  cashPosition: number
  projectedCash30d: number
  averageClientValue: number
  lifetimeValueTotal: number
  pipelineValue: number
}

export interface FinanceStore {
  asOf: string
  dataMode: 'mock-only'
  kpis: FinanceKpis
  clients: Client[]
  invoices: Invoice[]
  collections: CollectionItem[]
  retainers: Retainer[]
  pricingModels: PricingModel[]
  cashFlow: CashFlowPoint[]
  forecast: ForecastLine[]
  revenueByAdvisor: AdvisorRevenue[]
  revenueByService: ServiceRevenue[]
  monthlySeries: { month: string; revenue: number; collected: number }[]
}

export const roleAccess: Record<FinanceRole, string[]> = {
  Owner: ['overview', 'revenue', 'ar', 'retainers', 'pricing', 'cash', 'kpis'],
  Finance: ['overview', 'revenue', 'ar', 'retainers', 'pricing', 'cash', 'kpis'],
  Advisor: ['overview', 'revenue', 'retainers', 'pricing', 'kpis'],
  Assistant: ['overview', 'retainers'],
}
